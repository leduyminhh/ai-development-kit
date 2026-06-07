$script:AiHookAuditDefaultFilenamePattern = 'yyyyMMdd_filename'

function ConvertTo-AiHookAuditSlug {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [string]$Value
    )

    $slug = ([string]$Value -replace '[^a-zA-Z0-9]+', '-').Trim('-').ToLowerInvariant()
    if ([string]::IsNullOrWhiteSpace($slug)) {
        return 'event'
    }

    return $slug
}

function Get-AiHookAuditTimeZone {
    [CmdletBinding()]
    param(
        [AllowNull()]
        [TimeZoneInfo]$TimeZone
    )

    if ($null -ne $TimeZone) {
        return $TimeZone
    }

    return [TimeZoneInfo]::Utc
}

function Get-AiHookAuditLocalDateStamp {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Event,

        [Parameter(Mandatory = $true)]
        [TimeZoneInfo]$TimeZone
    )

    $timestampText = if (-not [string]::IsNullOrWhiteSpace([string]$Event.timestamp)) {
        [string]$Event.timestamp
    } elseif (-not [string]::IsNullOrWhiteSpace([string]$Event.startAt)) {
        [string]$Event.startAt
    } else {
        [DateTimeOffset]::UtcNow.ToString("yyyy-MM-ddTHH:mm:ss'Z'", [Globalization.CultureInfo]::InvariantCulture)
    }

    $timestamp = [DateTimeOffset]::Parse($timestampText, [Globalization.CultureInfo]::InvariantCulture).ToUniversalTime()
    $local = [TimeZoneInfo]::ConvertTime($timestamp, $TimeZone)
    return $local.ToString('yyyyMMdd', [Globalization.CultureInfo]::InvariantCulture)
}

function Get-AiHookAuditSourceName {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Event
    )

    foreach ($name in @('sourceName', 'provider', 'eventName')) {
        if (-not [string]::IsNullOrWhiteSpace([string]$Event.$name)) {
            return [string]$Event.$name
        }
    }

    return 'event'
}

function Get-AiHookAuditFilePath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Event,

        [Parameter(Mandatory = $true)]
        [string]$EventRoot,

        [string]$Format = 'jsonl',

        [AllowNull()]
        [TimeZoneInfo]$TimeZone,

        [string]$FilenamePattern = $script:AiHookAuditDefaultFilenamePattern
    )

    $resolvedTimeZone = Get-AiHookAuditTimeZone -TimeZone $TimeZone
    $dateStamp = Get-AiHookAuditLocalDateStamp -Event $Event -TimeZone $resolvedTimeZone
    $slug = ConvertTo-AiHookAuditSlug -Value (Get-AiHookAuditSourceName -Event $Event)
    $fileBase = $FilenamePattern.Replace('yyyyMMdd', $dateStamp).Replace('filename', $slug)
    $extension = if ($Format -ceq 'csv') { 'csv' } elseif ($Format -ceq 'text') { 'log' } else { 'jsonl' }
    return Join-Path $EventRoot "$fileBase.$extension"
}

function Get-AiHookAuditIndexPath {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$EventFile
    )

    return "$EventFile.ids"
}

function Get-AiHookAuditMutexName {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$EventFile
    )

    $hash = Get-AiHookSha256 -Value ([System.IO.Path]::GetFullPath($EventFile).ToLowerInvariant())
    return "Global\ai-development-kit-aihook-$hash"
}

function Write-AiHookJsonlEvent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Event,

        [Parameter(Mandatory = $true)]
        [string]$EventFile
    )

    $eventId = [string]$Event.eventId
    if ([string]::IsNullOrWhiteSpace($eventId)) {
        throw (New-AiHookValidationException -Code 'required_field' -Message "Field 'eventId' is required." -Field 'eventId')
    }

    $eventDirectory = Split-Path -Parent $EventFile
    New-Item -ItemType Directory -Path $eventDirectory -Force | Out-Null

    $indexFile = Get-AiHookAuditIndexPath -EventFile $EventFile
    $mutex = New-Object System.Threading.Mutex($false, (Get-AiHookAuditMutexName -EventFile $EventFile))
    $hasLock = $false
    try {
        $hasLock = $mutex.WaitOne(10000)
        if (-not $hasLock) {
            throw 'Timed out waiting for the audit writer lock.'
        }

        if ((Test-Path -LiteralPath $indexFile) -and ((Get-Content -LiteralPath $indexFile) -contains $eventId)) {
            return [pscustomobject][ordered]@{
                auditWritten = $false
                skipped = $true
                reason = 'duplicate_event'
                file = $EventFile
            }
        }

        $json = $Event | ConvertTo-Json -Compress -Depth 20
        Add-Content -LiteralPath $EventFile -Value $json -Encoding utf8
        Add-Content -LiteralPath $indexFile -Value $eventId -Encoding utf8

        return [pscustomobject][ordered]@{
            auditWritten = $true
            skipped = $false
            reason = ''
            file = $EventFile
        }
    }
    finally {
        if ($hasLock) {
            $mutex.ReleaseMutex()
        }
        $mutex.Dispose()
    }
}

function Write-AiHookAuditEvent {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Event,

        [Parameter(Mandatory = $true)]
        [pscustomobject]$Settings
    )

    try {
        $eventRoot = [string]$Settings.EventRoot
        if ([string]::IsNullOrWhiteSpace($eventRoot)) {
            throw (New-AiHookValidationException -Code 'required_field' -Message "Field 'EventRoot' is required." -Field 'EventRoot')
        }

        $format = if ([string]::IsNullOrWhiteSpace([string]$Settings.Format)) { 'jsonl' } else { [string]$Settings.Format }
        $filenamePattern = if ([string]::IsNullOrWhiteSpace([string]$Settings.FilenamePattern)) {
            $script:AiHookAuditDefaultFilenamePattern
        } else {
            [string]$Settings.FilenamePattern
        }
        $timeZone = Get-AiHookAuditTimeZone -TimeZone $Settings.TimeZone
        $eventFile = Get-AiHookAuditFilePath -Event $Event -EventRoot $eventRoot -Format $format -TimeZone $timeZone -FilenamePattern $filenamePattern

        if ($format -cne 'jsonl') {
            throw (New-AiHookValidationException -Code 'unsupported_audit_format' -Message "Canonical audit supports jsonl, not '$format'." -Field 'format')
        }

        return Write-AiHookJsonlEvent -Event $Event -EventFile $eventFile
    }
    catch {
        if ([string]$Event.mode -ceq 'observe') {
            return [pscustomobject][ordered]@{
                auditWritten = $false
                skipped = $false
                reason = 'audit_failed'
                file = $null
                error = $_.Exception.Message
            }
        }

        throw
    }
}
