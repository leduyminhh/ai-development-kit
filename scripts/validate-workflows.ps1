param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path,
    [switch]$Json
)

$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'lib/codex-config.ps1')

function New-WorkflowFinding {
    param([string]$Severity, [string]$Message)
    [pscustomobject][ordered]@{
        severity = $Severity
        message = $Message
    }
}

function Test-WorkflowFrontmatter {
    param([string]$Path)

    $content = Get-Content -LiteralPath $Path -Raw
    return ($content -match '(?s)^---\s+.*?\s+---' -and $content -match '(?m)^name:\s*\S+' -and $content -match '(?m)^description:\s*\S+')
}

$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
$findings = New-Object 'System.Collections.Generic.List[object]'
$registryPath = Join-Path $resolvedRoot '.codex/workflows/registry.toml'

if (-not (Test-Path -LiteralPath $registryPath)) {
    $findings.Add((New-WorkflowFinding -Severity 'fail' -Message "Workflow registry is required: $registryPath"))
} else {
    $registryText = Get-Content -LiteralPath $registryPath -Raw
    $schemaVersion = Get-CodexTomlIntValue -TomlText $registryText -Section '' -Key 'schema_version' -Default 0
    $workflowsRootValue = Get-CodexTomlStringValue -TomlText $registryText -Section '' -Key 'workflows_root'

    if ($schemaVersion -eq 1) {
        $findings.Add((New-WorkflowFinding -Severity 'pass' -Message 'Workflow registry schema_version is 1.'))
    } else {
        $findings.Add((New-WorkflowFinding -Severity 'fail' -Message 'Workflow registry schema_version must be 1.'))
    }

    if (-not [string]::IsNullOrWhiteSpace($workflowsRootValue)) {
        $findings.Add((New-WorkflowFinding -Severity 'pass' -Message "Workflow registry defines workflows_root=$workflowsRootValue."))
    } else {
        $findings.Add((New-WorkflowFinding -Severity 'fail' -Message 'Workflow registry must define workflows_root.'))
    }

    foreach ($adapter in @('codex', 'claude_code', 'cursor')) {
        $adapterRoot = Get-CodexTomlStringValue -TomlText $registryText -Section 'adapter_roots' -Key $adapter
        if ([string]::IsNullOrWhiteSpace($adapterRoot)) {
            $findings.Add((New-WorkflowFinding -Severity 'fail' -Message "Workflow registry adapter_roots.$adapter is required."))
        } else {
            $adapterPath = if ([System.IO.Path]::IsPathRooted($adapterRoot)) { $adapterRoot } else { Join-Path $resolvedRoot $adapterRoot }
            if (Test-Path -LiteralPath $adapterPath) {
                $findings.Add((New-WorkflowFinding -Severity 'pass' -Message "Adapter root exists for ${adapter}: $adapterRoot."))
            } else {
                $findings.Add((New-WorkflowFinding -Severity 'warning' -Message "Adapter root not found for ${adapter}: $adapterRoot."))
            }
        }
    }

    $skillNames = New-Object 'System.Collections.Generic.HashSet[string]'
    $skillsRoot = Join-Path $resolvedRoot 'skills'
    if (Test-Path -LiteralPath $skillsRoot) {
        foreach ($skillFile in Get-ChildItem -LiteralPath $skillsRoot -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') }) {
            [void]$skillNames.Add($skillFile.Name)
        }
    }

    $workflowSections = @(Get-CodexTomlSections -TomlText $registryText | Where-Object { $_ -match '^workflow\.' })
    if ($workflowSections.Count -eq 0) {
        $findings.Add((New-WorkflowFinding -Severity 'pass' -Message 'No workflows registered yet; empty registry is valid for bootstrap phase.'))
    }

    foreach ($section in $workflowSections) {
        $workflowName = $section.Substring('workflow.'.Length)
        $path = Get-CodexTomlStringValue -TomlText $registryText -Section $section -Key 'path'
        $skills = @(Get-CodexTomlArrayValue -TomlText $registryText -Section $section -Key 'skills')
        $requiredEvents = @(Get-CodexTomlArrayValue -TomlText $registryText -Section $section -Key 'required_events')

        if ([string]::IsNullOrWhiteSpace($path)) {
            $findings.Add((New-WorkflowFinding -Severity 'fail' -Message "$section must define path."))
        } else {
            $workflowPath = if ([System.IO.Path]::IsPathRooted($path)) { $path } else { Join-Path $resolvedRoot $path }
            if (Test-Path -LiteralPath $workflowPath) {
                if (Test-WorkflowFrontmatter -Path $workflowPath) {
                    $findings.Add((New-WorkflowFinding -Severity 'pass' -Message "Workflow frontmatter is valid for $workflowName."))
                } else {
                    $findings.Add((New-WorkflowFinding -Severity 'fail' -Message "Workflow frontmatter must include name and description: $path"))
                }
            } else {
                $findings.Add((New-WorkflowFinding -Severity 'fail' -Message "Workflow path does not exist for ${workflowName}: $path"))
            }
        }

        foreach ($skill in $skills) {
            if ($skillNames.Contains($skill)) {
                $findings.Add((New-WorkflowFinding -Severity 'pass' -Message "Workflow $workflowName references existing skill: $skill."))
            } else {
                $findings.Add((New-WorkflowFinding -Severity 'fail' -Message "Workflow $workflowName references missing skill: $skill."))
            }
        }

        foreach ($eventName in $requiredEvents) {
            if ($eventName -match '^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$') {
                $findings.Add((New-WorkflowFinding -Severity 'pass' -Message "Workflow $workflowName required event looks valid: $eventName."))
            } else {
                $findings.Add((New-WorkflowFinding -Severity 'fail' -Message "Workflow $workflowName required event is invalid: $eventName."))
            }
        }
    }
}

$status = if (@($findings | Where-Object { $_.severity -eq 'fail' }).Count -gt 0) { 'fail' } else { 'pass' }
$result = [pscustomobject][ordered]@{
    schema = 'codex.workflow.validation.v1'
    status = $status
    registry = $registryPath
    findings = $findings.ToArray()
}

if ($Json) {
    $result | ConvertTo-Json -Depth 8
} else {
    Write-Output "## Workflow Validation"
    Write-Output ""
    foreach ($severity in @('fail', 'warning', 'pass')) {
        Write-Output "### $severity"
        $items = @($findings | Where-Object { $_.severity -eq $severity })
        if ($items.Count -eq 0) {
            Write-Output "- None"
        } else {
            foreach ($item in $items) {
                Write-Output "- $($item.message)"
            }
        }
        Write-Output ""
    }
}

if ($status -eq 'fail') {
    exit 1
}
