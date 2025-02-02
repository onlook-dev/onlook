import { Project, Node, ts } from 'ts-morph';

export interface AstValidationResult {
    isValid: boolean;
    error?: string;
}

export async function validateAst(content: string, fileName: string): Promise<AstValidationResult> {
    if (!fileName.match(/\.(ts|tsx|js|jsx)$/)) {
        return { isValid: true };
    }

    try {
        const project = new Project();
        const sourceFile = project.createSourceFile(fileName, content);

        const diagnostics = sourceFile.getPreEmitDiagnostics();

        if (diagnostics.length > 0) {
            return {
                isValid: false,
                error: diagnostics.map((d) => d.getMessageText().toString()).join('\n'),
            };
        }

        return { isValid: true };
    } catch (error) {
        return {
            isValid: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

export function isAstValidatable(fileName: string): boolean {
    return /\.(ts|tsx|js|jsx)$/.test(fileName);
}
