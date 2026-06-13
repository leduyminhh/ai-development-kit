export function checksumText(content: any): string;
export function sha256File(pathname: any): Promise<string>;
export function listFiles(root: any): Promise<any[]>;
export function resolveInside(root: any, relativePath: any): string;
export function writeJsonAtomic(pathname: any, value: any): Promise<void>;
export function replaceDirectoryAtomic(staged: any, destination: any): Promise<void>;
