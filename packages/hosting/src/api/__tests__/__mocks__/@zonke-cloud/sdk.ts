export enum SupportedFrameworks {
    React = 'react',
    Remix = 'remix',
    NextJs = 'nextjs',
}

export const createPreviewEnvironment = async () => ({
    environmentId: 'test-env',
    endpoint: 'test.preview.test.com',
    versions: [],
});

export const deployToPreviewEnvironment = async () => ({
    versionId: 'test-version',
    message: 'Test deploy',
    isLatest: true,
    lastUpdated: new Date().toISOString(),
});

export const getPreviewEnvironment = async () => ({
    environmentId: 'test-env',
    endpoint: 'test.preview.test.com',
    versions: [],
});
