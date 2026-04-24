param([switch]$Force)

$ErrorActionPreference = 'Stop'

& powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'install-skill-link.ps1') -Force:$Force
