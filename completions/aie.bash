# Bash completion for aie (AI Engineering CLI)

_aie_completions() {
  local cur="${COMP_WORDS[COMP_CWORD]}"
  local prev="${COMP_WORDS[COMP_CWORD-1]}"
  
  # Main commands
  local commands="init install check validate doctor plugin skill workflow command artifact migrate schema --help --version"
  
  # Subcommands for specific commands
  case "${COMP_WORDS[1]}" in
    workflow)
      local subcommands="list init status run logs history clean validate build install step"
      COMPREPLY=($(compgen -W "$subcommands" -- "$cur"))
      ;;
    plugin)
      local subcommands="list"
      COMPREPLY=($(compgen -W "$subcommands" -- "$cur"))
      ;;
    skill)
      local subcommands="list"
      COMPREPLY=($(compgen -W "$subcommands" -- "$cur"))
      ;;
    schema)
      local subcommands="check"
      COMPREPLY=($(compgen -W "$subcommands" -- "$cur"))
      ;;
    *)
      COMPREPLY=($(compgen -W "$commands" -- "$cur"))
      ;;
  esac
}

complete -o bashdefault -o default -o nospace -F _aie_completions aie
complete -o bashdefault -o default -o nospace -F _aie_completions ai-engineering
