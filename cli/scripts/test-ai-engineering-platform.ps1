param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
)

$ErrorActionPreference = 'Stop'

Push-Location $Root
try {
    & npm test
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
