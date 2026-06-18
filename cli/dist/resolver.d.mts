export function resolvePluginGraph({ requested, optional, plugins, platformVersion, providers, }: {
    requested: any;
    optional?: never[] | undefined;
    plugins: any;
    platformVersion: any;
    providers: any;
}): {
    rootPlugins: any[];
    requiredPlugins: any[];
    optionalPlugins: any[];
    pluginIds: any[];
    skills: any[];
    commands: any[];
    agents: any[];
    hooks: any[];
    providers: any[];
    ownership: {
        skills: {};
        commands: {};
        agents: {};
        hooks: {};
    };
};
