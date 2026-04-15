param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [string]$Writer,
    [string]$Subpath,
    [string]$Subagent,
    [Parameter(Mandatory = $true)]
    [string]$Filename,
    [string]$Extension,
    [string]$Now
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'lib/codex-config.ps1')
. (Join-Path $PSScriptRoot 'lib/codex-output-file.ps1')

$configPath = Join-Path $Root '.codex/config.toml'
if (-not (Test-Path -LiteralPath $configPath)) {
    throw "Config not found: $configPath"
}

$configText = Get-Content -LiteralPath $configPath -Raw
$writerSection = if ([string]::IsNullOrWhiteSpace($Writer)) { $null } else { "$Writer.writer" }

$targetSubpath = $Subpath
$filenamePattern = Get-CodexTomlStringValue -TomlText $configText -Section 'output.file' -Key 'filenamePattern'
if ([string]::IsNullOrWhiteSpace($filenamePattern)) {
    $filenamePattern = 'filename_yyyyMMdd_HHmm'
}

$defaultExtension = ''
if (-not [string]::IsNullOrWhiteSpace($writerSection)) {
    $writerRoot = Get-CodexTomlStringValue -TomlText $configText -Section $writerSection -Key 'rootPath'
    if ([string]::IsNullOrWhiteSpace($targetSubpath)) {
        $targetSubpath = $writerRoot
    }

    $writerPattern = Get-CodexTomlStringValue -TomlText $configText -Section $writerSection -Key 'filenamePattern'
    if (-not [string]::IsNullOrWhiteSpace($writerPattern)) {
        $filenamePattern = $writerPattern
    }

    $defaultExtension = Get-CodexTomlStringValue -TomlText $configText -Section $writerSection -Key 'defaultExtension'

    $useSubagentPath = Get-CodexTomlBoolValue -TomlText $configText -Section $writerSection -Key 'subagentPath'
    if ($useSubagentPath -and -not [string]::IsNullOrWhiteSpace($Subagent)) {
        $subagentSlug = Convert-ToCodexOutputSlug -Value ($Subagent -replace '-diagram-agent$', '' -replace '-agent$', '')
        $targetSubpath = (Normalize-CodexSubpath -Value $targetSubpath) + '/' + $subagentSlug
    }
}

if ([string]::IsNullOrWhiteSpace($targetSubpath)) {
    $targetSubpath = 'outputs'
}

$targetSubpath = Normalize-CodexSubpath -Value $targetSubpath
$slug = Convert-ToCodexOutputSlug -Value $Filename
$timestamp = Get-CodexOutputTimestamp -Value $Now
$resolvedName = $filenamePattern.Replace('filename', $slug).Replace('yyyyMMdd_HHmm', $timestamp)

if ([string]::IsNullOrWhiteSpace($Extension)) {
    $extensionsBySubpath = Get-CodexTomlStringMap -TomlText $configText -Section 'output.file.extensionsBySubpath'
    $Extension = Resolve-CodexOutputExtension -ExtensionsBySubpath $extensionsBySubpath -TargetSubpath $targetSubpath -DefaultExtension $defaultExtension
}

if ([string]::IsNullOrWhiteSpace($Extension)) {
    $Extension = 'txt'
}

$Extension = $Extension.TrimStart('.')
Write-Output "$targetSubpath/$resolvedName.$Extension"
