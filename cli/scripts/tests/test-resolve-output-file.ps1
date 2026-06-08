param([string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path)

$ErrorActionPreference = 'Stop'

function Assert-Equal {
    param([object]$Expected, [object]$Actual, [string]$Message)
    if ($Expected -ne $Actual) {
        throw "$Message Expected=[$Expected] Actual=[$Actual]"
    }
}

$script = Join-Path $Root 'cli/scripts/bin/resolve-output-file.ps1'
$tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-output-file-test-" + [guid]::NewGuid().ToString())

try {
    New-Item -ItemType Directory -Path (Join-Path $tempRoot '.codex') -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $tempRoot '.codex/config.toml') -Encoding utf8 -Value @'
[output.file]
filenamePattern = "filename_yyyyMMdd_HHmm"
timezone = "Asia/Saigon"
requireConfirmationForProtectedPaths = false

[output.file.extensionsBySubpath]
"docs/diagram" = "puml"
"docs/diagram/sequence" = "plantuml"
"docs/specs" = "md"
"reports" = "md"
"reports/audit" = "log"

[diagram.writer]
rootPath = "docs/diagram"
subagentPath = true
filenamePattern = "filename_yyyyMMdd_HHmm"
defaultExtension = "puml"
createRootOnConfirm = true
requireConfirmation = true
'@

    $diagramPath = & powershell -NoProfile -ExecutionPolicy Bypass -File $script `
        -Root $tempRoot `
        -Writer diagram `
        -Subagent sequence `
        -Filename 'Payment Flow' `
        -Now '2026-04-15T18:30:00+07:00'
    Assert-Equal 'docs/diagram/sequence/payment-flow_20260415_1830.plantuml' $diagramPath 'Diagram writer should use subagent path, timestamp pattern, and most specific extension mapping.'

    $specPath = & powershell -NoProfile -ExecutionPolicy Bypass -File $script `
        -Root $tempRoot `
        -Subpath 'docs/specs' `
        -Filename 'Payment Flow Spec' `
        -Now '2026-04-15T18:31:00+07:00'
    Assert-Equal 'docs/specs/payment-flow-spec_20260415_1831.md' $specPath 'Specs should use md extension from subpath mapping.'

    $eventPath = & powershell -NoProfile -ExecutionPolicy Bypass -File $script `
        -Root $tempRoot `
        -Subpath 'reports/audit' `
        -Filename 'Project Event' `
        -Now '2026-04-15T18:32:00+07:00'
    Assert-Equal 'reports/audit/project-event_20260415_1832.log' $eventPath 'Project event output should use log extension from subpath mapping.'

    $overridePath = & powershell -NoProfile -ExecutionPolicy Bypass -File $script `
        -Root $tempRoot `
        -Writer diagram `
        -Subagent sequence `
        -Filename 'Rendered Payment Flow' `
        -Extension svg `
        -Now '2026-04-15T18:33:00+07:00'
    Assert-Equal 'docs/diagram/sequence/rendered-payment-flow_20260415_1833.svg' $overridePath 'Explicit extension should override subpath mapping.'

    Write-Output 'resolve-output-file tests passed'
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
