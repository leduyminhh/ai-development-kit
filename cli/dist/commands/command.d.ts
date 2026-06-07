export type CommandRunner = (args: string[]) => Promise<number>;
export interface CliCommand {
    readonly name: string;
    execute(args: string[], run: CommandRunner): Promise<number>;
}
export declare function defineCommand(name: string): CliCommand;
