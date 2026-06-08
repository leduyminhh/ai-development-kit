param()

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot '../lib/codex-config.ps1')
. (Join-Path $PSScriptRoot '../lib/codex-output-file.ps1')

function Assert-Equal {
    param([object]$Expected, [object]$Actual, [string]$Message)

    if ($Expected -ne $Actual) {
        throw "$Message Expected '$Expected' but got '$Actual'."
    }
}

function Assert-True {
    param([bool]$Condition, [string]$Message)

    if (-not $Condition) {
        throw $Message
    }
}

$toml = @'
name = "diagram-generate"
enabled = true
intervalDays = 14

[scan.policy]
skipProtectedPathsByDefault = false
protectedScanPaths = []

[output.file.extensionsBySubpath]
"docs/diagram" = "puml"
"docs/diagram/sequence" = "plantuml"
"reports" = "md"
'@

Assert-Equal 'diagram-generate' (Get-CodexTomlStringValue -TomlText $toml -Key 'name') 'Root string TOML values should resolve.'
Assert-Equal $false (Get-CodexTomlBoolValue -TomlText $toml -Section 'scan.policy' -Key 'skipProtectedPathsByDefault' -Default $true) 'Boolean TOML values should resolve.'
Assert-Equal 0 (@(Get-CodexTomlArrayValue -TomlText $toml -Section 'scan.policy' -Key 'protectedScanPaths')).Count 'Empty array TOML values should resolve.'
Assert-Equal 14 (Get-CodexTomlIntValue -TomlText $toml -Key 'intervalDays' -Default 0) 'Root integer TOML values should resolve.'
$map = Get-CodexTomlStringMap -TomlText $toml -Section 'output.file.extensionsBySubpath'
Assert-Equal 'plantuml' $map['docs/diagram/sequence'] 'String map TOML values should resolve.'

Assert-Equal 'payment-flow' (Convert-ToCodexOutputSlug -Value 'Payment Flow') 'Output slug should normalize filenames.'
Assert-Equal 'docs/diagram/sequence' (Normalize-CodexSubpath -Value 'docs\diagram\sequence\') 'Subpath normalization should use forward slashes.'
Assert-Equal '20260415_1830' (Get-CodexOutputTimestamp -Value '2026-04-15T11:30:00Z') 'Output timestamp should use Asia/Saigon time.'
Assert-Equal 'plantuml' (Resolve-CodexOutputExtension -ExtensionsBySubpath $map -TargetSubpath 'docs/diagram/sequence/payment' -DefaultExtension 'txt') 'Most specific output extension should win.'
Assert-Equal 'txt' (Resolve-CodexOutputExtension -ExtensionsBySubpath $map -TargetSubpath 'unknown/path' -DefaultExtension 'txt') 'Default extension should be used when no subpath mapping matches.'

Write-Output 'Shared PowerShell library tests passed.'
