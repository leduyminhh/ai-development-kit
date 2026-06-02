param(
    [string]$Root = (Get-Location).Path,
    [string]$Scope = "."
)

$ErrorActionPreference = 'Stop'

function Convert-ToNormalizedScope {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value) -or $Value -eq '.') {
        return 'full-project'
    }

    return (($Value -replace '^[\\/]+', '') -replace '[\\/]+', '-' -replace '[^A-Za-z0-9._-]', '-').Trim('-').ToLowerInvariant()
}

$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
$candidate = if ([System.IO.Path]::IsPathRooted($Scope)) {
    $Scope
} else {
    Join-Path $resolvedRoot $Scope
}

if (-not (Test-Path -LiteralPath $candidate -PathType Container)) {
    throw "Scope not found: $Scope"
}

$resolvedScope = (Resolve-Path -LiteralPath $candidate).Path
$rootWithSeparator = $resolvedRoot.TrimEnd('\', '/') + [System.IO.Path]::DirectorySeparatorChar
$scopeInsideRoot = $resolvedScope -eq $resolvedRoot -or $resolvedScope.StartsWith($rootWithSeparator, [System.StringComparison]::OrdinalIgnoreCase)
if (-not $scopeInsideRoot) {
    throw "Scope is outside repository root: $Scope"
}

$item = Get-Item -LiteralPath $resolvedScope -Force
$isSymlink = [bool]($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint)
if ($isSymlink -and $resolvedScope -ne $item.FullName) {
    throw "Scope resolves through a reparse point outside the expected path: $Scope"
}

$relative = if ($resolvedScope -eq $resolvedRoot) {
    '.'
} else {
    ($resolvedScope.Substring($resolvedRoot.Length).TrimStart('\', '/') -replace '\\', '/')
}

[pscustomobject]@{
    root             = $resolvedRoot
    scope            = $Scope
    resolved_scope   = $resolvedScope
    relative_scope   = $relative
    normalized_scope = Convert-ToNormalizedScope -Value $relative
    recursive        = $true
} | ConvertTo-Json -Depth 4
