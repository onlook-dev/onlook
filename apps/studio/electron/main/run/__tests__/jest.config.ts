export default {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.tsx?$': [
            'ts-jest',
            {
                tsconfig: {
                    jsx: 'react',
                    esModuleInterop: true,
                    moduleResolution: 'node',
                },
            },
        ],
    },
};
