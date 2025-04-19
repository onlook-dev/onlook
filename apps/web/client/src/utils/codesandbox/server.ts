import { CodeSandbox } from "@codesandbox/sdk";
const sdk = new CodeSandbox(process.env.CSB_API_KEY!);

export const start = async (id: string) => {
    const startData = await sdk.sandbox.start(id);
    return startData;
}

export const stop = async (id: string) => {
    const stopData = await sdk.sandbox.shutdown(id);
    return stopData;
}

export const list = async () => {
    const sdk = new CodeSandbox(process.env.CSB_API_KEY!);
    const listResponse = await sdk.sandbox.list()
    return listResponse;
}

