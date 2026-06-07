export interface AdapterGenerationInput {
    root: string;
    target: string;
    packIds: string[];
    providers: string[];
}
export declare function generateAdapter(input: AdapterGenerationInput): Promise<unknown>;
