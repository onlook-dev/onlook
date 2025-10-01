import type { CodeDiffRequest } from '@onlook/models/code';

export async function getOrCreateCodeDiffRequest(
    oid: string,
    branchId: string,
    oidToCodeChange: Map<string, CodeDiffRequest>,
): Promise<CodeDiffRequest> {
    let diffRequest = oidToCodeChange.get(oid);
    if (!diffRequest) {
        diffRequest = {
            oid,
            branchId,
            structureChanges: [],
            attributes: {},
            textContent: null,
            overrideClasses: null,
        };
        oidToCodeChange.set(oid, diffRequest);
    }
    return diffRequest;
}
