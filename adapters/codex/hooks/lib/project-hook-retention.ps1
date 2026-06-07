$ErrorActionPreference = 'Stop'

function Invoke-ProjectHookRetention {
    param(
        [string]$EventRoot,
        [int]$RemainingDays
    )

    if ($RemainingDays -le 0 -or -not (Test-Path -LiteralPath $EventRoot)) {
        return
    }

    $cutoff = (Get-Date).ToUniversalTime().AddDays(-$RemainingDays)
    Get-ChildItem -LiteralPath $EventRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTimeUtc -lt $cutoff } |
        Remove-Item -Force

    Get-ChildItem -LiteralPath $EventRoot -Recurse -Directory -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending |
        ForEach-Object {
            if (@(Get-ChildItem -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue).Count -eq 0) {
                Remove-Item -LiteralPath $_.FullName -Force
            }
        }
}
