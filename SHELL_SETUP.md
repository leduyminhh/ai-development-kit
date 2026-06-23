# Shell Completions for aie

Enable tab-completion for the `aie` command in bash, zsh, and other shells.

## Bash

Add to your `~/.bashrc` or `~/.bash_profile`:

```bash
source /path/to/aie-repo/completions/aie.bash
```

Or install system-wide:

```bash
sudo cp /path/to/aie-repo/completions/aie.bash /etc/bash_completion.d/aie
```

Then restart your shell:

```bash
exec bash
```

## Zsh

Add to your `~/.zshrc`:

```bash
fpath=(/path/to/aie-repo/completions $fpath)
autoload -U compinit && compinit
```

Then restart your shell:

```bash
exec zsh
```

## Usage

After setup, press **TAB** to complete:

```bash
# Complete main commands
aie i<TAB>    # → aie install
aie ch<TAB>   # → aie check
aie v<TAB>    # → aie validate

# Complete subcommands
aie workflow <TAB>  # → list, init, status, run, etc.
aie plugin <TAB>    # → list
aie skill <TAB>     # → list
aie schema <TAB>    # → check

# Complete flags
aie install --<TAB> # → --target, --scope, --yes, etc.
```

## Available Commands

| Command | Purpose |
|---------|---------|
| `init` | Initialize AI Engineering in a project |
| `install` | Install plugins |
| `check` | Check installed plugins |
| `validate` | Validate plugin structure |
| `doctor` | Run diagnostics |
| `plugin` | Manage plugins |
| `skill` | Manage skills |
| `workflow` | Manage workflows |
| `schema` | Manage schemas |
| `migrate` | Migrate legacy projects |

## Global Options

| Option | Purpose |
|--------|---------|
| `--target` | Specify provider (codex, claude, cursor, antigravity) |
| `--scope` | Set scope (project, global) |
| `-g, --global` | Global scope shorthand |
| `--dry-run` | Preview changes without applying |
| `--json` | JSON output format |
| `--yes` | Non-interactive mode |

## Troubleshooting

**Completions not working?**

- Check the path is correct: `ls /path/to/aie-repo/completions/`
- Restart your shell after sourcing
- Verify sourcing in your shell config: `grep aie ~/.bashrc` (bash) or `grep aie ~/.zshrc` (zsh)

**Get more completions?**

Shell completions are updated with new commands. Re-source the completion file after upgrading `aie`:

```bash
source /path/to/aie-repo/completions/aie.bash
```
