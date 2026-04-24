param(
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '../../../../')).Path,
    [string[]]$Paths = @(),
    [string]$PathList = ''
)

$ErrorActionPreference = 'Stop'

function New-Finding {
    param([string]$Severity, [string]$Path, [string]$Message)
    [pscustomobject]@{ Severity = $Severity; Path = $Path; Message = $Message }
}

function Convert-ToRelativePath {
    param([string]$FullName)

    $resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
    $resolvedPath = (Resolve-Path -LiteralPath $FullName).Path
    return (($resolvedPath.Substring($resolvedRoot.Length) -replace '^[\\/]+', '') -replace '\\', '/')
}

function Test-KebabName {
    param([string]$Name)
    return $Name -match '^[a-z0-9]+(-[a-z0-9]+)*$'
}

function Test-ForbiddenRoleSuffix {
    param([string]$Name)
    return $Name -match '(^|-)(.+)-(er|or|specialist|expert|assistant)$'
}

function Test-CapabilityName {
    param([string]$Name)

    if (-not (Test-KebabName -Name $Name)) {
        return $false
    }

    if (Test-ForbiddenRoleSuffix -Name $Name) {
        return $false
    }

    if ($Name -match '(^|-)and(-|$)') {
        return $false
    }

    $deprecatedNames = @(
        'architect-onion-design',
        'automation-test-validate',
        'java-design',
        'onion-pattern-design',
        'pattern-design',
        'pattern-onion-design',
        'qa-test-review',
        'shared-code-design'
    )
    if ($deprecatedNames -contains $Name) {
        return $false
    }

    $approvedCapabilityNames = @(
        'code-design-pattern'
    )
    if ($approvedCapabilityNames -contains $Name) {
        return $true
    }

    $actions = @('analyze', 'review', 'generate', 'write', 'validate', 'fix', 'optimize', 'design')
    $domains = @(
        'agent', 'architecture', 'auth', 'code', 'codex', 'config', 'contract', 'dependency', 'diagram',
        'doc', 'git', 'hook', 'java', 'naming', 'onion', 'pattern', 'protected',
        'secrets', 'security', 'service',
        'react', 'skill', 'sql', 'test', 'workflow'
    )
    $qualifiers = @($domains + @(
        'accessibility', 'activity', 'api', 'application', 'architecture', 'archimate', 'automation',
        'audit', 'behavior', 'boundary', 'branch', 'class', 'commit', 'component',
        'composition', 'concurrency', 'container', 'coverage', 'creation', 'database',
        'deployment', 'domain', 'drift', 'e2e', 'edge', 'er', 'feature', 'figma', 'fixture',
        'flaky', 'flow', 'form', 'gantt', 'grammar', 'handoff', 'ie', 'infrastructure',
        'json', 'maintenance', 'merge', 'mindmap', 'module', 'network', 'object', 'output', 'path',
        'performance', 'qa', 'regression', 'release', 'risk', 'rule', 'safety', 'salt', 'shared',
        'sequence', 'spring', 'state', 'strategy', 'structure', 'timing', 'transaction',
        'unit', 'usecase', 'verification', 'wbs', 'wireframe', 'yaml'
    ) | Select-Object -Unique)
    $tokens = @($Name -split '-')

    if ($tokens.Count -lt 2) {
        return $false
    }

    $domainToken = $tokens[0]
    if ($domains -notcontains $domainToken) {
        return $false
    }

    $actionToken = $tokens[$tokens.Count - 1]
    if ($actions -notcontains $actionToken) {
        return $false
    }

    if ($tokens.Count -gt 2) {
        $qualifierTokens = @($tokens[1..($tokens.Count - 2)])
        foreach ($token in $qualifierTokens) {
            if ($qualifiers -notcontains $token) {
                return $false
            }
        }
    }

    return $true
}

function Test-ScriptName {
    param([string]$Name)

    if (-not (Test-KebabName -Name $Name)) {
        return $false
    }

    if (Test-ForbiddenRoleSuffix -Name $Name) {
        return $false
    }

    if ($Name -match '(^|-)and(-|$)') {
        return $false
    }

    $scriptVerbs = @(
        'analyze', 'review', 'generate', 'write', 'validate', 'fix', 'optimize', 'design',
        'run', 'test', 'install', 'resolve', 'invoke', 'add', 'apply', 'hook', 'log'
    )
    $firstToken = @($Name -split '-')[0]
    return $scriptVerbs -contains $firstToken
}

function Get-NameFromPath {
    param([System.IO.FileInfo]$File)

    $relativePath = Convert-ToRelativePath -FullName $File.FullName
    if ($relativePath -match '^\.agents/skills/([^/]+)/SKILL\.md$') {
        return [pscustomobject]@{ Kind = 'skill'; Name = $Matches[1]; RelativePath = $relativePath }
    }
    if ($relativePath -match '^\.agents/skills/[^/]+/subagents/([^/]+)\.md$') {
        return [pscustomobject]@{ Kind = 'subagent'; Name = $Matches[1]; RelativePath = $relativePath }
    }
    if ($relativePath -match '^\.codex/agents/([^/]+)\.toml$') {
        return [pscustomobject]@{ Kind = 'agent'; Name = $Matches[1]; RelativePath = $relativePath }
    }
    if ($relativePath -match '^\.codex/hooks/([^/]+)\.ps1$') {
        return [pscustomobject]@{ Kind = 'hook'; Name = $Matches[1]; RelativePath = $relativePath }
    }
    if ($relativePath -match '^\.agents/skills/[^/]+/scripts/([^/]+)\.(ps1|py)$') {
        return [pscustomobject]@{ Kind = 'script'; Name = $Matches[1]; RelativePath = $relativePath }
    }
    if ($relativePath -match '^workflows/([^/]+)/WORKFLOW\.md$') {
        return [pscustomobject]@{ Kind = 'workflow'; Name = $Matches[1]; RelativePath = $relativePath }
    }
    if ($relativePath -match '^scripts/([^/]+)\.(ps1|py)$') {
        return [pscustomobject]@{ Kind = 'script'; Name = $Matches[1]; RelativePath = $relativePath }
    }

    return $null
}

function Get-TargetFiles {
    $requestedPaths = @($Paths)
    if (-not [string]::IsNullOrWhiteSpace($PathList)) {
        $requestedPaths += @($PathList -split '\|' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
    }

    if ($requestedPaths.Count -gt 0) {
        foreach ($path in $requestedPaths) {
            $targetPath = if ([System.IO.Path]::IsPathRooted($path)) { $path } else { Join-Path $Root $path }
            if (Test-Path -LiteralPath $targetPath -PathType Leaf) {
                Get-Item -LiteralPath $targetPath
            }
        }
        return
    }

    foreach ($searchRoot in @('.codex/agents', '.codex/hooks', '.agents/skills', 'workflows', 'scripts')) {
        $fullSearchRoot = Join-Path $Root $searchRoot
        if (Test-Path -LiteralPath $fullSearchRoot) {
            Get-ChildItem -LiteralPath $fullSearchRoot -Recurse -File -Include '*.toml', '*.md', '*.ps1', '*.py' -ErrorAction SilentlyContinue
        }
    }
}

$findings = New-Object System.Collections.Generic.List[object]
$targets = @(Get-TargetFiles)

foreach ($file in $targets) {
    $target = Get-NameFromPath -File $file
    if ($null -eq $target) {
        continue
    }

    $isValid = if ($target.Kind -in @('script', 'hook')) {
        Test-ScriptName -Name $target.Name
    } else {
        Test-CapabilityName -Name $target.Name
    }

    if ($isValid) {
        $findings.Add((New-Finding 'pass' $target.RelativePath "$($target.Kind) name is valid: $($target.Name)"))
    } else {
        $findings.Add((New-Finding 'fail' $target.RelativePath "$($target.Kind) name violates project naming rules: $($target.Name)"))
    }

    if ($target.Kind -in @('agent', 'skill', 'workflow')) {
        $content = Get-Content -LiteralPath $file.FullName -Raw
        $declaredName = if ($target.Kind -eq 'agent') {
            $match = [regex]::Match($content, '(?m)^\s*name\s*=\s*"([^"]+)"')
            if ($match.Success) { $match.Groups[1].Value } else { '' }
        } else {
            $match = [regex]::Match($content, "(?m)^name:\s*`"?([^`"`r`n]+)`"?\s*$")
            if ($match.Success) { $match.Groups[1].Value.Trim() } else { '' }
        }

        if ([string]::IsNullOrWhiteSpace($declaredName)) {
            $findings.Add((New-Finding 'fail' $target.RelativePath "$($target.Kind) is missing declared name metadata."))
        } elseif ($declaredName -ne $target.Name) {
            $findings.Add((New-Finding 'fail' $target.RelativePath "$($target.Kind) declared name '$declaredName' must match file/folder name '$($target.Name)'."))
        }
    }
}

Write-Output '## Project Naming Rules Validation'
foreach ($severity in @('fail', 'pass')) {
    Write-Output "`n### $severity`n"
    $items = @($findings | Where-Object { $_.Severity -eq $severity })
    if ($items.Count -eq 0) {
        Write-Output '- None'
    }
    foreach ($item in $items) {
        Write-Output "- $($item.Path): $($item.Message)"
    }
}

if (@($findings | Where-Object { $_.Severity -eq 'fail' }).Count -gt 0) {
    exit 1
}




