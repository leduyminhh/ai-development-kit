export type CommandRunner = (args: string[]) => Promise<number>;

export interface CliCommand {
  readonly name: string;
  execute(args: string[], run: CommandRunner): Promise<number>;
}

export function defineCommand(name: string): CliCommand {
  return {
    name,
    execute(args, run) {
      return run([name, ...args]);
    },
  };
}
