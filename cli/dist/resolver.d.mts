export function resolvePluginGraph({ requested, plugins, platformVersion, providers, }: {
    requested: any;
    plugins: any;
    platformVersion: any;
    providers: any;
}): {
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
