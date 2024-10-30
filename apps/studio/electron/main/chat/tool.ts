import type Anthropic from '@anthropic-ai/sdk';
import { GENERATE_CODE_TOOL_NAME } from '@onlook/models/chat';

export const GENERATE_CODE_TOOL: Anthropic.Messages.Tool = {
    name: GENERATE_CODE_TOOL_NAME,
    description: 'Generate code changes for multiple files based on the given description',
    input_schema: {
        type: 'object',
        properties: {
            changes: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        fileName: {
                            type: 'string',
                            description: 'The name of the file to be changed',
                        },
                        value: {
                            type: 'string',
                            description:
                                'The new or modified code for the file. Always include the full content of the file.',
                        },
                        description: {
                            type: 'string',
                            description: 'A description of the changes made to the file',
                        },
                    },
                    required: ['fileName', 'code', 'description'],
                },
            },
        },
        required: ['changes'],
    },
};
