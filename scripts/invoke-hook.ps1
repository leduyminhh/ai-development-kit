param(
    [string]$Provider,
    [string]$Event,
    [string]$RuntimeRoot
)

$ErrorActionPreference = 'Stop'

$coreRoot = Join-Path $PSScriptRoot 'hooks/core'
$transportRoot = Join-Path $PSScriptRoot 'hooks/transports'

. (Join-Path $coreRoot 'hook-redaction.ps1')
. (Join-Path $coreRoot 'hook-identity.ps1')
. (Join-Path $coreRoot 'hook-contract.ps1')
. (Join-Path $coreRoot 'hook-policy.ps1')
. (Join-Path $coreRoot 'hook-audit.ps1')
. (Join-Path $coreRoot 'hook-flow.ps1')
. (Join-Path $coreRoot 'hook-pipeline.ps1')
. (Join-Path $transportRoot 'hook-cli-transport.ps1')

$exitCode = Invoke-AiHookCliTransport -Provider $Provider -Event $Event -RuntimeRoot $RuntimeRoot
exit $exitCode
