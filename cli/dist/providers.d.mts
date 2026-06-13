export function projectCodex(context: any): {
    manifest: {
        apiVersion: string;
        kind: string;
        provider: any;
        plugin: {
            id: any;
            name: any;
            version: any;
        };
        skills: any[];
        agents: any[];
        hooks: any[];
        commands: any;
    };
    workflow: any;
    intent: any;
    files: {
        path: string;
        content: any;
    }[];
};
export function projectClaude(context: any): {
    manifest: {
        apiVersion: string;
        kind: string;
        provider: any;
        plugin: {
            id: any;
            name: any;
            version: any;
        };
        skills: any[];
        agents: any[];
        hooks: any[];
        commands: any;
    };
    command: any;
    intent: any;
    files: any[];
};
export function projectCursor(context: any): {
    manifest: {
        apiVersion: string;
        kind: string;
        provider: any;
        plugin: {
            id: any;
            name: any;
            version: any;
        };
        skills: any[];
        agents: any[];
        hooks: any[];
        commands: any;
    };
    rule: any;
    intent: any;
    files: any[];
};
export function projectProviders(context: any): {
    codex: {
        manifest: {
            apiVersion: string;
            kind: string;
            provider: any;
            plugin: {
                id: any;
                name: any;
                version: any;
            };
            skills: any[];
            agents: any[];
            hooks: any[];
            commands: any;
        };
        workflow: any;
        intent: any;
        files: {
            path: string;
            content: any;
        }[];
    };
    claude: {
        manifest: {
            apiVersion: string;
            kind: string;
            provider: any;
            plugin: {
                id: any;
                name: any;
                version: any;
            };
            skills: any[];
            agents: any[];
            hooks: any[];
            commands: any;
        };
        command: any;
        intent: any;
        files: any[];
    };
    cursor: {
        manifest: {
            apiVersion: string;
            kind: string;
            provider: any;
            plugin: {
                id: any;
                name: any;
                version: any;
            };
            skills: any[];
            agents: any[];
            hooks: any[];
            commands: any;
        };
        rule: any;
        intent: any;
        files: any[];
    };
};
