$ErrorActionPreference = 'Stop'

function Write-ProjectHookEvent {
    param(
        [pscustomobject]$Event,
        [string]$EventRoot,
        [ValidateSet('text', 'jsonl', 'csv')]
        [string]$Format = 'text',
        [TimeZoneInfo]$TimeZone,
        [string]$FilenamePattern = 'yyyyMMdd_filename'
    )

    New-Item -ItemType Directory -Path $EventRoot -Force | Out-Null

    $startUtc = [DateTimeOffset]::Parse($Event.startAt, [Globalization.CultureInfo]::InvariantCulture)
    $localStart = [TimeZoneInfo]::ConvertTime($startUtc, $TimeZone)
    $extension = if ($Format -eq 'csv') { 'csv' } elseif ($Format -eq 'jsonl') { 'jsonl' } else { 'log' }
    $dateStamp = $localStart.ToString('yyyyMMdd', [Globalization.CultureInfo]::InvariantCulture)
    $nameSlug = ($Event.sourceName -replace '[^a-zA-Z0-9]+', '-').Trim('-').ToLowerInvariant()
    if ([string]::IsNullOrWhiteSpace($nameSlug)) {
        $nameSlug = 'event'
    }
    $fileBase = $FilenamePattern.Replace('yyyyMMdd', $dateStamp).Replace('filename', $nameSlug)
    $eventFile = Join-Path $EventRoot "$fileBase.$extension"

    if ($Format -eq 'csv') {
        if (Test-Path -LiteralPath $eventFile) {
            $Event | Export-Csv -LiteralPath $eventFile -NoTypeInformation -Append
        } else {
            $Event | Export-Csv -LiteralPath $eventFile -NoTypeInformation
        }
    } elseif ($Format -eq 'jsonl') {
        $json = $Event | ConvertTo-Json -Compress -Depth 6
        Add-Content -LiteralPath $eventFile -Value $json -Encoding utf8
    } else {
        $line = ConvertTo-ProjectHookTextLine -Event $Event
        Add-Content -LiteralPath $eventFile -Value $line -Encoding utf8
    }

    return $eventFile
}
