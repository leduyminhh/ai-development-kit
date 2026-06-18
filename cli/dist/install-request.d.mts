export function parseInstallRequest(args: any): {
    rootPlugins: {
        value: any;
        source: string;
        locked: boolean;
    };
    all: {
        value: any;
        source: string;
        locked: boolean;
    };
    providers: {
        value: any;
        source: string;
        locked: boolean;
    };
    optionalPlugins: {
        value: any;
        source: string;
        locked: boolean;
    };
    scope: {
        value: any;
        source: string;
        locked: boolean;
    };
    confirm: {
        value: any;
        source: string;
        locked: boolean;
    };
    force: boolean;
    json: boolean;
};
export function applyDetectedProviders(draft: any, providers: any): any;
export function toInstallIntent(draft: any): {
    rootPlugins: any;
    all: any;
    providers: any;
    optionalPlugins: any;
    scope: any;
    force: any;
};
export function finalizeNonInteractiveDraft(draft: any): {
    rootPlugins: any;
    all: any;
    providers: any;
    optionalPlugins: any;
    scope: any;
    force: any;
};
