#compdef aie ai-engineering

# Zsh completion for aie (AI Engineering CLI)

local -a commands
commands=(
  'init:Initialize AI Engineering in a project'
  'install:Install plugins with interactive wizard or explicit choices'
  'check:Check installed plugins and asset versions'
  'validate:Validate plugin structure and contracts'
  'doctor:Run diagnostic checks on a project'
  'plugin:Manage plugins'
  'skill:Manage skills'
  'workflow:Manage workflows'
  'command:Manage commands'
  'artifact:Manage artifacts'
  'migrate:Migrate legacy projects'
  'schema:Manage schemas'
  '--help:Show help'
  '--version:Show version'
)

local -a global_options
global_options=(
  '-h[Show help]'
  '--help[Show help]'
  '-v[Show version]'
  '--version[Show version]'
  '-g[Global scope]'
  '--global[Global scope]'
  '--target[Target provider]:provider:(codex claude cursor antigravity)'
  '--scope[Installation scope]:scope:(project global)'
  '--dry-run[Dry run]'
  '--json[JSON output]'
  '--yes[Non-interactive]'
)

local context state

_arguments -C \
  "$global_options[@]" \
  '1: :->cmd' \
  '*: :->args'

case "$state" in
  cmd)
    _describe 'commands' commands
    ;;
  args)
    case "${words[2]}" in
      workflow)
        local -a workflow_subcommands
        workflow_subcommands=(
          'list:List available workflows'
          'init:Initialize a workflow'
          'status:Check workflow status'
          'run:Run a workflow'
          'logs:Show workflow logs'
          'history:Show workflow history'
          'clean:Clean workflow artifacts'
          'validate:Validate a workflow'
          'build:Build workflow artifacts'
          'install:Install workflow'
          'step:Manage workflow steps'
        )
        _describe 'workflow subcommands' workflow_subcommands
        ;;
      plugin)
        _describe 'plugin subcommands' '(list:List plugins)'
        ;;
      skill)
        _describe 'skill subcommands' '(list:List skills)'
        ;;
      schema)
        _describe 'schema subcommands' '(check:Check schema)'
        ;;
    esac
    ;;
esac
