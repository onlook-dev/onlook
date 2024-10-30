import { z } from 'zod';

const TextBlockObject = z.object({
    type: z.literal('text'),
    value: z.string().describe('Text reply to the user'),
});

const CodeBlockObject = z.object({
    type: z.literal('code'),
    fileName: z.string().describe('The name of the file to be changed'),
    value: z
        .string()
        .describe(
            'The new or modified code for the file. Always include the full content of the file.',
        ),
});

const ResponseBlockObject = z.discriminatedUnion('type', [TextBlockObject, CodeBlockObject]);

export const StreamReponseObject = z.object({
    description: z.string().describe('Generate a stream of text and code responses'),
    blocks: z
        .array(ResponseBlockObject)
        .describe('Array of responses that can be either text or code changes'),
});

export type CodeResponseBlock = z.infer<typeof CodeBlockObject>;
export type TextResponseBlock = z.infer<typeof TextBlockObject>;
export type ResponseBlock = z.infer<typeof ResponseBlockObject>;
export type StreamResponse = z.infer<typeof StreamReponseObject>;

/**
 * 
 Partial object {}
Partial object { description: 'Updati' }
Partial object { description: 'Updating index.ts' }
Partial object { description: 'Updating index.ts to displa' }
Partial object { description: 'Updating index.ts to display ' }
Partial object { description: 'Updating index.ts to display "Hello Wor' }
Partial object { description: 'Updating index.ts to display "Hello World"' }
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [ {} ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [ { type: 'tex' } ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [ { type: 'text' } ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [ { type: 'text', content: '' } ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [ { type: 'text', content: "I'll " } ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [ { type: 'text', content: "I'll update index" } ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [ { type: 'text', content: "I'll update index.ts to d" } ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [ { type: 'text', content: "I'll update index.ts to display '" } ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [
    {
      type: 'text',
      content: "I'll update index.ts to display 'Hello Wo"
    }
  ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [
    {
      type: 'text',
      content: "I'll update index.ts to display 'Hello World'"
    },
    {}
  ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [
    {
      type: 'text',
      content: "I'll update index.ts to display 'Hello World'"
    },
    { type: 'code' }
  ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [
    {
      type: 'text',
      content: "I'll update index.ts to display 'Hello World'"
    },
    { type: 'code', fileName: 'index' }
  ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [
    {
      type: 'text',
      content: "I'll update index.ts to display 'Hello World'"
    },
    { type: 'code', fileName: 'index.ts' }
  ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [
    {
      type: 'text',
      content: "I'll update index.ts to display 'Hello World'"
    },
    { type: 'code', fileName: 'index.ts', value: 'conso' }
  ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [
    {
      type: 'text',
      content: "I'll update index.ts to display 'Hello World'"
    },
    { type: 'code', fileName: 'index.ts', value: 'console.lo' }
  ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [
    {
      type: 'text',
      content: "I'll update index.ts to display 'Hello World'"
    },
    { type: 'code', fileName: 'index.ts', value: 'console.log(' }
  ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [
    {
      type: 'text',
      content: "I'll update index.ts to display 'Hello World'"
    },
    {
      type: 'code',
      fileName: 'index.ts',
      value: "console.log('Hello World"
    }
  ]
}
Partial object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [
    {
      type: 'text',
      content: "I'll update index.ts to display 'Hello World'"
    },
    {
      type: 'code',
      fileName: 'index.ts',
      value: "console.log('Hello World');"
    }
  ]
}
Final object {
  description: 'Updating index.ts to display "Hello World"',
  blocks: [
    {
      type: 'text',
      content: "I'll update index.ts to display 'Hello World'"
    },
    {
      type: 'code',
      fileName: 'index.ts',
      value: "console.log('Hello World');"
    }
  ]
}

 */
