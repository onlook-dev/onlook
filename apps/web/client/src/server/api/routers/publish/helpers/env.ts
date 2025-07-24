import { WebSocketSession } from '@codesandbox/sdk';

/**
 * Parse .env file content into key-value pairs
 */
export function parseEnvContent(content: string): Record<string, string> {
    const envVars: Record<string, string> = {};

    const lines = content.split('\n');
    for (const line of lines) {
        const trimmedLine = line.trim();

        if (!trimmedLine || trimmedLine.startsWith('#')) {
            continue;
        }

        const equalIndex = trimmedLine.indexOf('=');
        if (equalIndex === -1) {
            continue; // Skip malformed lines
        }

        const key = trimmedLine.slice(0, equalIndex).trim();
        let value = trimmedLine.slice(equalIndex + 1).trim();

        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        if (key) {
            envVars[key] = value;
        }
    }

    return envVars;
}

/**
 * Extract environment variables from .env files in the sandbox using WebSocket session
 */
export async function extractEnvVarsFromSandbox(session: WebSocketSession): Promise<Record<string, string>> {
    try {
        const envVars: Record<string, string> = {};

        // Note: Later files override earlier ones. Order by increasing priority.
        const ENV_FILE_PATTERNS = ['.env', '.env.production'];

        for (const fileName of ENV_FILE_PATTERNS) {
            try {
                const content = await session.fs.readTextFile(fileName);
                if (content) {
                    const parsed = parseEnvContent(content);
                    Object.assign(envVars, parsed);
                }
            } catch (error) {
                console.warn(`Could not read ${fileName}:`, error);
            }
        }

        console.log(`Extracted ${Object.keys(envVars).length} environment variables from sandbox`);
        return envVars;
    } catch (error) {
        console.error('Error extracting environment variables from sandbox:', error);
        return {};
    }
}
