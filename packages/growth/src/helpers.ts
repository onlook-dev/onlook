export const getLayoutPath = async (
    projectPath: string,
    fileExists: (path: string) => Promise<boolean>,
) => {
    const possibleLayoutPaths = [
        `${projectPath}/src/app/layout.tsx`,
        `${projectPath}/app/layout.tsx`,
    ];

    for (const path of possibleLayoutPaths) {
        const exists = await fileExists(path);
        if (exists) {
            return path;
        }
    }
    return null;
};
