function Get-AiHookSha256 {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    try {
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Value)
        $hash = $sha256.ComputeHash($bytes)
        return ([System.BitConverter]::ToString($hash)).Replace('-', '').ToLowerInvariant()
    }
    finally {
        $sha256.Dispose()
    }
}

function ConvertTo-AiHookTimestamp {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Timestamp
    )

    $parsed = [DateTimeOffset]::MinValue
    $styles = [Globalization.DateTimeStyles]::AssumeUniversal -bor [Globalization.DateTimeStyles]::AdjustToUniversal
    $formats = [string[]]@("yyyy-MM-dd'T'HH:mm:ss'Z'", "yyyy-MM-dd'T'HH:mm:ss.FFFFFFF'Z'")
    $valid = [DateTimeOffset]::TryParseExact(
        $Timestamp,
        $formats,
        [Globalization.CultureInfo]::InvariantCulture,
        $styles,
        [ref]$parsed
    )
    if (-not $valid) {
        return $null
    }

    return $parsed.UtcDateTime.ToString('yyyy-MM-ddTHH:mm:ss.fffffffZ', [Globalization.CultureInfo]::InvariantCulture)
}

function Get-AiHookPayloadIdentifier {
    [CmdletBinding()]
    param(
        [AllowNull()]
        $Payload
    )

    if ($null -eq $Payload) {
        return ''
    }

    $candidateNames = @(
        'nativeCallId',
        'native_call_id',
        'toolCallId',
        'tool_call_id',
        'callId',
        'call_id'
    )
    foreach ($name in $candidateNames) {
        if ($Payload -is [System.Collections.IDictionary] -and $Payload.Contains($name)) {
            return [string]$Payload[$name]
        }

        $property = $Payload.PSObject.Properties[$name]
        if ($null -ne $property) {
            return [string]$property.Value
        }
    }

    return ''
}

function New-AiHookIdentity {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Provider,

        [Parameter(Mandatory = $true)]
        [string]$NativeEvent,

        [Parameter(Mandatory = $true)]
        [string]$SessionId,

        [Parameter(Mandatory = $true)]
        [string]$SourceName,

        [Parameter(Mandatory = $true)]
        [string]$Timestamp,

        [AllowNull()]
        $Payload
    )

    $nativeId = Get-AiHookPayloadIdentifier -Payload $Payload
    $parts = @($Provider, $NativeEvent, $SessionId, $SourceName, $nativeId, $Timestamp)
    $identityInput = (($parts | ForEach-Object { '{0}:{1}' -f ([string]$_).Length, $_ }) -join '|')
    $eventId = Get-AiHookSha256 -Value $identityInput

    [pscustomobject][ordered]@{
        eventId = $eventId
        traceId = Get-AiHookSha256 -Value $SessionId
        spanId = $eventId.Substring(0, 16)
    }
}
