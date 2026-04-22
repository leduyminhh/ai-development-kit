param(
    [ValidateSet('start', 'stop', 'status', 'reload', 'serve')]
    [string]$Action = 'status',
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [int]$WaitSeconds = 15
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $repoRoot 'scripts/lib/codex-config.ps1')
. (Join-Path $repoRoot '.codex/hooks/lib/project-hook-config.ps1')
. (Join-Path $repoRoot '.codex/hooks/lib/project-hook-dispatch.ps1')
. (Join-Path $repoRoot '.codex/hooks/lib/project-hook-event.ps1')
. (Join-Path $repoRoot '.codex/hooks/lib/project-hook-format.ps1')
. (Join-Path $repoRoot '.codex/hooks/lib/project-hook-retention.ps1')
. (Join-Path $repoRoot '.codex/hooks/lib/project-hook-writer.ps1')

function Get-HookServiceDayFolder {
    param([pscustomobject]$Settings)

    $now = [TimeZoneInfo]::ConvertTime([DateTimeOffset]::UtcNow, $Settings.TimeZone)
    return Join-Path $Settings.RuntimeRoot $now.ToString('yyyyMMdd', [Globalization.CultureInfo]::InvariantCulture)
}

function Get-HookServiceStatePath {
    param([pscustomobject]$Settings)
    return Join-Path (Get-HookServiceDayFolder -Settings $Settings) 'hook-service.state.json'
}

function Get-HookServiceLogPath {
    param([pscustomobject]$Settings)
    return Join-Path (Get-HookServiceDayFolder -Settings $Settings) 'hook-service.log'
}

function Ensure-HookServiceRuntimePaths {
    param([pscustomobject]$Settings)

    $dayFolder = Get-HookServiceDayFolder -Settings $Settings
    New-Item -ItemType Directory -Path $dayFolder -Force | Out-Null
    return $dayFolder
}

function Write-HookServiceRuntimeLog {
    param(
        [pscustomobject]$Settings,
        [string]$Level,
        [string]$Message
    )

    Ensure-HookServiceRuntimePaths -Settings $Settings | Out-Null
    $logPath = Get-HookServiceLogPath -Settings $Settings
    $timestamp = ([TimeZoneInfo]::ConvertTime([DateTimeOffset]::UtcNow, $Settings.TimeZone)).ToString('yyyy-MM-ddTHH:mm:sszzz', [Globalization.CultureInfo]::InvariantCulture)
    Add-Content -LiteralPath $logPath -Value "$timestamp [$($Level.ToUpperInvariant())] $Message" -Encoding utf8
}

function Write-HookServiceState {
    param(
        [pscustomobject]$Settings,
        [int]$ProcessId,
        [string]$Status,
        [datetimeoffset]$StartedAt,
        [datetimeoffset]$UpdatedAt
    )

    Ensure-HookServiceRuntimePaths -Settings $Settings | Out-Null
    $state = [ordered]@{
        pid       = $ProcessId
        status    = $Status
        host      = $Settings.Host
        port      = $Settings.Port
        startedAt = $StartedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
        updatedAt = $UpdatedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
        configPath = $Settings.ConfigPath
        eventRoot  = $Settings.EventRoot
        runtimeRoot = $Settings.RuntimeRoot
        statePath  = Get-HookServiceStatePath -Settings $Settings
        logPath    = Get-HookServiceLogPath -Settings $Settings
    }

    $state | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Get-HookServiceStatePath -Settings $Settings) -Encoding utf8
    return [pscustomobject]$state
}

function Get-LatestHookServiceState {
    param([string]$Root)

    $runtimeRoot = Join-Path $Root 'reports/audit/runtime'
    if (-not (Test-Path -LiteralPath $runtimeRoot)) {
        return $null
    }

    $stateFile = Get-ChildItem -LiteralPath $runtimeRoot -Recurse -File -Filter 'hook-service.state.json' -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1

    if ($null -eq $stateFile) {
        return $null
    }

    try {
        return Get-Content -LiteralPath $stateFile.FullName -Raw | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Test-HookServiceProcessAlive {
    param([object]$State)

    if ($null -eq $State -or $null -eq $State.pid) {
        return $false
    }

    return $null -ne (Get-Process -Id ([int]$State.pid) -ErrorAction SilentlyContinue)
}

function Invoke-HookServiceHttpJson {
    param(
        [string]$Method,
        [int]$Port,
        [string]$Path,
        [object]$Body
    )

    $uri = "http://127.0.0.1:$Port$Path"
    if ($null -eq $Body) {
        return Invoke-RestMethod -Method $Method -Uri $uri
    }

    return Invoke-RestMethod -Method $Method -Uri $uri -ContentType 'application/json' -Body ($Body | ConvertTo-Json -Depth 8)
}

function Send-HookServiceResponse {
    param(
        [System.IO.Stream]$Stream,
        [int]$StatusCode,
        [string]$StatusText,
        [object]$Body,
        [string]$ContentType = 'application/json; charset=utf-8'
    )

    $json = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Depth 8 -Compress }
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $headerText = "HTTP/1.1 $StatusCode $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headerText)
    $Stream.Write($headerBytes, 0, $headerBytes.Length)
    $Stream.Write($bodyBytes, 0, $bodyBytes.Length)
    $Stream.Flush()
}

function Read-HookServiceRequest {
    param([System.Net.Sockets.TcpClient]$Client)

    $stream = $Client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8, $false, 1024, $true)
    $requestLine = $reader.ReadLine()
    if ([string]::IsNullOrWhiteSpace($requestLine)) {
        return $null
    }

    $headers = @{}
    while ($true) {
        $line = $reader.ReadLine()
        if ([string]::IsNullOrEmpty($line)) {
            break
        }

        $separatorIndex = $line.IndexOf(':')
        if ($separatorIndex -gt 0) {
            $name = $line.Substring(0, $separatorIndex).Trim()
            $value = $line.Substring($separatorIndex + 1).Trim()
            $headers[$name] = $value
        }
    }

    $body = ''
    $contentLength = 0
    if ($headers.ContainsKey('Content-Length')) {
        [void][int]::TryParse($headers['Content-Length'], [ref]$contentLength)
    }

    if ($contentLength -gt 0) {
        $buffer = New-Object char[] $contentLength
        $offset = 0
        while ($offset -lt $contentLength) {
            $read = $reader.Read($buffer, $offset, $contentLength - $offset)
            if ($read -le 0) {
                break
            }
            $offset += $read
        }
        $body = New-Object string ($buffer, 0, $offset)
    }

    $parts = $requestLine.Split(' ')
    return [pscustomobject]@{
        Method = $parts[0]
        Path   = $parts[1]
        Headers = $headers
        Body   = $body
        Stream = $stream
    }
}

function Get-HookServiceStatusObject {
    param([string]$Root)

    $state = Get-LatestHookServiceState -Root $Root
    if ($null -eq $state) {
        return [pscustomobject]@{
            running = $false
            status  = 'stopped'
            pid     = $null
            port    = $null
        }
    }

    return [pscustomobject]@{
        running   = (Test-HookServiceProcessAlive -State $state)
        status    = if (Test-HookServiceProcessAlive -State $state) { 'running' } else { 'stopped' }
        pid       = $state.pid
        port      = $state.port
        host      = $state.host
        startedAt = $state.startedAt
        updatedAt = $state.updatedAt
        statePath = $state.statePath
        logPath   = $state.logPath
    }
}

function Start-HookService {
    param(
        [string]$Root,
        [int]$WaitSeconds
    )

    $existing = Get-HookServiceStatusObject -Root $Root
    if ($existing.running) {
        return $existing
    }

    $settings = Get-ProjectHookSettings -Root $Root
    $arguments = @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', (Join-Path $repoRoot 'scripts/hook-service.ps1'),
        '-Action', 'serve',
        '-Root', $Root
    )

    $process = Start-Process -FilePath 'powershell' -ArgumentList $arguments -PassThru -WindowStyle Hidden
    $deadline = (Get-Date).AddSeconds($WaitSeconds)
    do {
        Start-Sleep -Milliseconds 250
        try {
            $health = Invoke-HookServiceHttpJson -Method Get -Port $settings.Port -Path '/health'
            if ($health.status -eq 'ok') {
                return Get-HookServiceStatusObject -Root $Root
            }
        } catch {
        }
    } while ((Get-Date) -lt $deadline -and -not $process.HasExited)

    throw 'Hook service failed to become healthy before timeout.'
}

function Stop-HookService {
    param([string]$Root)

    $state = Get-LatestHookServiceState -Root $Root
    if ($null -eq $state -or -not (Test-HookServiceProcessAlive -State $state)) {
        return [pscustomobject]@{
            status = 'stopped'
            pid    = if ($null -ne $state) { $state.pid } else { $null }
        }
    }

    try {
        Invoke-HookServiceHttpJson -Method Post -Port ([int]$state.port) -Path '/stop' | Out-Null
    } catch {
        Stop-Process -Id ([int]$state.pid) -Force -ErrorAction SilentlyContinue
    }

    $deadline = (Get-Date).AddSeconds(10)
    do {
        Start-Sleep -Milliseconds 250
    } while ((Get-Date) -lt $deadline -and (Test-HookServiceProcessAlive -State $state))

    return [pscustomobject]@{
        status = 'stopped'
        pid    = $state.pid
    }
}

function Invoke-HookServiceServer {
    param([string]$Root)

    $settings = Get-ProjectHookSettings -Root $Root
    Ensure-HookServiceRuntimePaths -Settings $settings | Out-Null
    Invoke-ProjectHookRetention -EventRoot $settings.EventRoot -RemainingDays $settings.RemainingDays

    $listener = [System.Net.Sockets.TcpListener]::new(([System.Net.IPAddress]::Parse($settings.Host)), $settings.Port)
    $listener.Start()

    $startedAt = [DateTimeOffset]::UtcNow
    $lastConfigWrite = if (Test-Path -LiteralPath $settings.ConfigPath) { (Get-Item -LiteralPath $settings.ConfigPath).LastWriteTimeUtc } else { [datetime]::MinValue }
    $lastRetentionAt = [DateTimeOffset]::UtcNow
    $shouldStop = $false

    Write-HookServiceRuntimeLog -Settings $settings -Level 'info' -Message "hook service started on $($settings.Host):$($settings.Port)"
    Write-HookServiceState -Settings $settings -ProcessId $PID -Status 'running' -StartedAt $startedAt -UpdatedAt ([DateTimeOffset]::UtcNow) | Out-Null

    try {
        while (-not $shouldStop) {
            if ($settings.ReloadOnConfigChange -and (Test-Path -LiteralPath $settings.ConfigPath)) {
                $currentWrite = (Get-Item -LiteralPath $settings.ConfigPath).LastWriteTimeUtc
                if ($currentWrite -gt $lastConfigWrite) {
                    $oldHost = $settings.Host
                    $oldPort = $settings.Port
                    $settings = Get-ProjectHookSettings -Root $Root
                    $lastConfigWrite = $currentWrite
                    Invoke-ProjectHookRetention -EventRoot $settings.EventRoot -RemainingDays $settings.RemainingDays
                    Write-HookServiceRuntimeLog -Settings $settings -Level 'info' -Message 'configuration auto reloaded'
                    Write-HookServiceState -Settings $settings -ProcessId $PID -Status 'running' -StartedAt $startedAt -UpdatedAt ([DateTimeOffset]::UtcNow) | Out-Null

                    if ($settings.Host -ne $oldHost -or $settings.Port -ne $oldPort) {
                        $listener.Stop()
                        $listener = [System.Net.Sockets.TcpListener]::new(([System.Net.IPAddress]::Parse($settings.Host)), $settings.Port)
                        $listener.Start()
                        Write-HookServiceRuntimeLog -Settings $settings -Level 'info' -Message "listener rebound to $($settings.Host):$($settings.Port)"
                    }
                }
            }

            if ((([DateTimeOffset]::UtcNow) - $lastRetentionAt).TotalHours -ge 24) {
                Invoke-ProjectHookRetention -EventRoot $settings.EventRoot -RemainingDays $settings.RemainingDays
                $lastRetentionAt = [DateTimeOffset]::UtcNow
                Write-HookServiceRuntimeLog -Settings $settings -Level 'info' -Message 'scheduled retention completed'
            }

            if (-not $listener.Pending()) {
                Start-Sleep -Milliseconds 250
                Write-HookServiceState -Settings $settings -ProcessId $PID -Status 'running' -StartedAt $startedAt -UpdatedAt ([DateTimeOffset]::UtcNow) | Out-Null
                continue
            }

            $client = $listener.AcceptTcpClient()
            try {
                $request = Read-HookServiceRequest -Client $client
                if ($null -eq $request) {
                    continue
                }

                switch ("$($request.Method) $($request.Path)") {
                    'GET /health' {
                        Send-HookServiceResponse -Stream $request.Stream -StatusCode 200 -StatusText 'OK' -Body @{
                            status = 'ok'
                            pid    = $PID
                            port   = $settings.Port
                        }
                    }
                    'GET /status' {
                        Send-HookServiceResponse -Stream $request.Stream -StatusCode 200 -StatusText 'OK' -Body @{
                            status    = 'running'
                            running   = $true
                            pid       = $PID
                            host      = $settings.Host
                            port      = $settings.Port
                            startedAt = $startedAt.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
                            updatedAt = [DateTimeOffset]::UtcNow.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
                        }
                    }
                    'POST /reload' {
                        $settings = Get-ProjectHookSettings -Root $Root
                        $lastConfigWrite = if (Test-Path -LiteralPath $settings.ConfigPath) { (Get-Item -LiteralPath $settings.ConfigPath).LastWriteTimeUtc } else { [datetime]::MinValue }
                        Invoke-ProjectHookRetention -EventRoot $settings.EventRoot -RemainingDays $settings.RemainingDays
                        Write-HookServiceRuntimeLog -Settings $settings -Level 'info' -Message 'configuration reloaded via endpoint'
                        Write-HookServiceState -Settings $settings -ProcessId $PID -Status 'running' -StartedAt $startedAt -UpdatedAt ([DateTimeOffset]::UtcNow) | Out-Null
                        Send-HookServiceResponse -Stream $request.Stream -StatusCode 200 -StatusText 'OK' -Body @{
                            status = 'reloaded'
                            port   = $settings.Port
                        }
                    }
                    'POST /stop' {
                        Write-HookServiceRuntimeLog -Settings $settings -Level 'info' -Message 'stop requested'
                        Send-HookServiceResponse -Stream $request.Stream -StatusCode 200 -StatusText 'OK' -Body @{
                            status = 'stopping'
                            pid    = $PID
                        }
                        $shouldStop = $true
                    }
                    'POST /events' {
                        $payload = if ([string]::IsNullOrWhiteSpace($request.Body)) { $null } else { $request.Body | ConvertFrom-Json }
                        Invoke-ProjectHookRetention -EventRoot $settings.EventRoot -RemainingDays $settings.RemainingDays
                        $result = Invoke-ProjectHookDispatch -Root $Root -Settings $settings -Payload $payload
                        if ($result.written) {
                            Write-HookServiceRuntimeLog -Settings $settings -Level 'info' -Message "event written for $($payload.sourceType):$($payload.sourceName)"
                        } else {
                            Write-HookServiceRuntimeLog -Settings $settings -Level 'info' -Message "event skipped for $($payload.sourceType):$($payload.sourceName) - $($result.reason)"
                        }
                        Send-HookServiceResponse -Stream $request.Stream -StatusCode 200 -StatusText 'OK' -Body $result
                    }
                    default {
                        Send-HookServiceResponse -Stream $request.Stream -StatusCode 404 -StatusText 'Not Found' -Body @{
                            status = 'not_found'
                        }
                    }
                }
            } catch {
                try {
                    Write-HookServiceRuntimeLog -Settings $settings -Level 'error' -Message $_.Exception.Message
                    Send-HookServiceResponse -Stream $client.GetStream() -StatusCode 500 -StatusText 'Internal Server Error' -Body @{
                        status  = 'error'
                        message = $_.Exception.Message
                    }
                } catch {
                }
            } finally {
                $client.Close()
            }
        }
    } finally {
        Write-HookServiceState -Settings $settings -ProcessId $PID -Status 'stopped' -StartedAt $startedAt -UpdatedAt ([DateTimeOffset]::UtcNow) | Out-Null
        Write-HookServiceRuntimeLog -Settings $settings -Level 'info' -Message 'hook service stopped'
        $listener.Stop()
    }
}

switch ($Action) {
    'start' {
        Start-HookService -Root $Root -WaitSeconds $WaitSeconds | ConvertTo-Json -Depth 4
    }
    'stop' {
        Stop-HookService -Root $Root | ConvertTo-Json -Depth 4
    }
    'status' {
        $state = Get-LatestHookServiceState -Root $Root
        if ($null -ne $state -and (Test-HookServiceProcessAlive -State $state)) {
            try {
                Invoke-HookServiceHttpJson -Method Get -Port ([int]$state.port) -Path '/status' | ConvertTo-Json -Depth 4
                break
            } catch {
            }
        }

        Get-HookServiceStatusObject -Root $Root | ConvertTo-Json -Depth 4
    }
    'reload' {
        $state = Get-LatestHookServiceState -Root $Root
        if ($null -eq $state -or -not (Test-HookServiceProcessAlive -State $state)) {
            throw 'Hook service is not running.'
        }

        Invoke-HookServiceHttpJson -Method Post -Port ([int]$state.port) -Path '/reload' | ConvertTo-Json -Depth 4
    }
    'serve' {
        Invoke-HookServiceServer -Root $Root
    }
}
