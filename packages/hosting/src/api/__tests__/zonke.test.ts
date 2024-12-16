import { expect, test, describe, mock } from 'bun:test';
import { createEnv, deploy, getEnv } from '../zonke';

// Mock the SDK functions
const mockSDK = {
    createPreviewEnvironment: mock(async () => ({
        environmentId: 'test-env',
        endpoint: 'test.preview.test.com',
        versions: [],
    })),
    deployToPreviewEnvironment: mock(async () => ({
        versionId: 'test-version',
        message: 'Test deploy',
        isLatest: true,
        lastUpdated: new Date().toISOString(),
    })),
    getPreviewEnvironment: mock(async () => ({
        environmentId: 'test-env',
        endpoint: 'test.preview.test.com',
        versions: [],
    })),
    SupportedFrameworks: {
        React: 'react',
        Remix: 'remix',
        NextJs: 'nextjs',
    },
};

// Mock the module
mock.module('@zonke-cloud/sdk', () => mockSDK);

describe('zonke', () => {
    test('createEnv calls SDK with correct parameters', async () => {
        await createEnv({
            userId: 'test-user',
            hostedZone: 'test.com',
        });

        expect(mockSDK.createPreviewEnvironment).toHaveBeenCalledWith({
            userId: 'test-user',
            framework: mockSDK.SupportedFrameworks.React,
            awsHostedZone: 'test.com',
        });
    });

    test('deploy calls SDK with correct parameters', async () => {
        await deploy({
            environmentId: 'test-env',
            buildOutputDirectory: 'dist',
            message: 'Test deploy',
        });

        expect(mockSDK.deployToPreviewEnvironment).toHaveBeenCalledWith({
            environmentId: 'test-env',
            buildOutputDirectory: 'dist',
            message: 'Test deploy',
            uploadLinkExpirationOverride: 60,
        });
    });

    test('getEnv calls SDK with correct parameters', async () => {
        await getEnv('test-env');

        expect(mockSDK.getPreviewEnvironment).toHaveBeenCalledWith('test-env');
    });
});
