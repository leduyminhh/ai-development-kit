$script:AiHookSensitiveKeyPattern = '(?i)(token|secret|password|authorization|api_key|apikey|cookie)'
$script:AiHookRedactedValue = '[REDACTED]'
$script:AiHookMaxDepthValue = '[MAX_DEPTH]'

function ConvertTo-AiHookRedactedValue {
    [CmdletBinding()]
    param(
        [AllowNull()]
        $Value,

        [int]$Depth = 0
    )

    if ($null -eq $Value) {
        return $null
    }

    if ($Depth -gt 8) {
        return $script:AiHookMaxDepthValue
    }

    if ($Value -is [string]) {
        if ($Value.Length -gt 4096) {
            return $Value.Substring(0, 4096)
        }
        return $Value
    }

    if ($Value -is [System.Collections.IDictionary]) {
        $copy = [ordered]@{}
        foreach ($key in $Value.Keys) {
            $keyText = [string]$key
            if ($keyText -match $script:AiHookSensitiveKeyPattern) {
                $copy[$keyText] = $script:AiHookRedactedValue
            }
            else {
                $copy[$keyText] = ConvertTo-AiHookRedactedValue -Value $Value[$key] -Depth ($Depth + 1)
            }
        }
        return [pscustomobject]$copy
    }

    if (($Value -is [System.Collections.IEnumerable]) -and -not ($Value -is [string])) {
        $items = New-Object 'System.Collections.Generic.List[object]'
        foreach ($item in $Value) {
            $items.Add((ConvertTo-AiHookRedactedValue -Value $item -Depth ($Depth + 1)))
        }
        return ,$items.ToArray()
    }

    if ($Value -is [psobject] -and $Value.PSObject.Properties.Count -gt 0) {
        $copy = [ordered]@{}
        foreach ($property in $Value.PSObject.Properties) {
            if ($property.Name -match $script:AiHookSensitiveKeyPattern) {
                $copy[$property.Name] = $script:AiHookRedactedValue
            }
            else {
                $copy[$property.Name] = ConvertTo-AiHookRedactedValue -Value $property.Value -Depth ($Depth + 1)
            }
        }
        return [pscustomobject]$copy
    }

    return $Value
}
