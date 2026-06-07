param(
    [Parameter(Mandatory)]
    [ValidateSet('validate', 'plan', 'export', 'install', 'remove')]
    [string]$Action,
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [string]$TargetRoot = (Get-Location).Path,
    [string]$Package,
    [string]$Provider,
    [ValidateSet('ask', 'overwrite', 'skip')]
    [string]$OverwritePolicy,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'

$core = Join-Path $PSScriptRoot 'lib/aidk_core.py'
if (-not (Test-Path -LiteralPath $core)) {
    throw "AIDK core not found: $core"
}

$arguments = @(
    $core,
    '--action', $Action,
    '--root', $Root,
    '--target-root', $TargetRoot
)
if (-not [string]::IsNullOrWhiteSpace($Package)) {
    $arguments += @('--package', $Package)
}
if (-not [string]::IsNullOrWhiteSpace($Provider)) {
    $arguments += @('--provider', $Provider)
}
if (-not [string]::IsNullOrWhiteSpace($OverwritePolicy)) {
    $arguments += @('--overwrite-policy', $OverwritePolicy)
}
if ($Json) {
    $arguments += '--json'
}

& python @arguments
exit $LASTEXITCODE
