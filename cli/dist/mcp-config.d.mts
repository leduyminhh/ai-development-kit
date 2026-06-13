export function createMcpRegistrations({ packIds, runtimeRoot }: {
    packIds: any;
    runtimeRoot: any;
}): any;
export function mergeCodexMcpConfig({ currentText, desired, previouslyManaged, force, }: {
    currentText?: string | undefined;
    desired: any;
    previouslyManaged: any;
    force?: boolean | undefined;
}): {
    content: string;
    managedNames: string[];
    empty: boolean;
};
export function mergeJsonMcpConfig({ currentText, desired, previouslyManaged, force, provider, }: {
    currentText?: string | undefined;
    desired: any;
    previouslyManaged: any;
    force?: boolean | undefined;
    provider?: string | undefined;
}): {
    content: string;
    managedNames: string[];
    empty: boolean;
};
export function removeManagedMcpConfig({ provider, currentText, managedNames, }: {
    provider: any;
    currentText: any;
    managedNames: any;
}): {
    content: string;
    managedNames: string[];
    empty: boolean;
};
