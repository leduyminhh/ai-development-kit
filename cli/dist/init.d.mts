export function initializeProject({ root, target }: {
    root: any;
    target: any;
}): Promise<{
    status: string;
    target: any;
}>;
