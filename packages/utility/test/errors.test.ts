import { parseReactError } from '../src/errors';

describe('parseReactError', () => {
    describe('Next.js/SWC build errors', () => {
        it('should parse SWC build error with location', () => {
            const error = `Error: x Unexpected token \`div\`. Expected jsx identifier
    ,-[/Users/test/project/app/page.tsx:27:1]
    27 |     };
    28 | 
    29 |     return (
    30 |         <div
    :          ^^^
    31 |             className="min-h-screen"
    32 |             onMouseMove={handleMouseMove}
    33 |             data-oid="test"
    \`----`;

            const result = parseReactError(error, 'app/page.tsx');
            expect(result).toEqual({
                type: 'NEXT_BUILD_ERROR',
                message: 'Unexpected token `div`. Expected jsx identifier',
                filePath: '/Users/test/project/app/page.tsx',
                line: 27,
                column: 1,
                fullMessage: error,
            });
        });

        it('should parse webpack build error', () => {
            const error = `ModuleBuildError: Module build failed (from ./node_modules/next/dist/build/webpack/loaders/next-swc-loader.js):
Error: x Unexpected token \`div\`. Expected jsx identifier
    ,-[/Users/test/project/app/page.tsx:27:1]
    27 |     };`;

            const result = parseReactError(error, 'app/page.tsx');
            expect(result).toEqual({
                type: 'NEXT_BUILD_ERROR',
                message: 'Unexpected token `div`. Expected jsx identifier',
                filePath: '/Users/test/project/app/page.tsx',
                line: 27,
                column: 1,
                fullMessage: error,
            });
        });

        it('should parse SWC syntax error', () => {
            const error = `Error: x Expected '}', got 'EOF'
    ,-[/Users/test/project/components/Button.tsx:15:1]
    15 | const Button = () => {
    16 |   return <button>Click me</button>
    :  ^
    \`----`;

            const result = parseReactError(error, 'components/Button.tsx');
            expect(result).toEqual({
                type: 'NEXT_BUILD_ERROR',
                message: "Expected '}', got 'EOF'",
                filePath: '/Users/test/project/components/Button.tsx',
                line: 15,
                column: 1,
                fullMessage: error,
            });
        });

        it('should parse SWC build error with modern format', () => {
            const error = `Error:
    × Unexpected token \`div\`. Expected jsx identifier
    ╭─[/Users/test/project/app/page.tsx:27:1]
    │
    │ return (
    │     <div
    │      ^^^
    │     className="min-h-screen"
    ╰─`;

            const result = parseReactError(error, 'app/page.tsx');
            expect(result).toEqual({
                type: 'NEXT_BUILD_ERROR',
                message: 'Unexpected token `div`. Expected jsx identifier',
                filePath: '/Users/test/project/app/page.tsx',
                line: 27,
                fullMessage: error,
            });
        });
    });

    describe('React errors', () => {
        it('should parse React error with file path prefix', () => {
            const error = `./app/page.tsx:10:5
    Type error: Property 'invalid' does not exist
    8 |  function Component() {
    9 |    return (
    10 |     <div invalid={true} />
       |     ^^^^^^^^^^^^^^^^^^^^^`;

            const result = parseReactError(error, 'app/page.tsx');
            expect(result).toEqual({
                type: 'REACT_ERROR',
                message: "Type error: Property 'invalid' does not exist",
                filePath: 'app/page.tsx',
                line: 10,
                column: 5,
                fullMessage: error,
            });
        });

        it('should parse React runtime error with stack trace', () => {
            const error = `TypeError: Cannot read property 'map' of undefined
    at Component (/Users/test/project/app/page.tsx:15:20)
    at processChild
    at process`;

            const result = parseReactError(error, 'app/page.tsx');
            expect(result).toEqual({
                type: 'REACT_ERROR',
                message: "Cannot read property 'map' of undefined",
                filePath: '/Users/test/project/app/page.tsx',
                line: 15,
                column: 20,
                fullMessage: error,
            });
        });

        it('should parse React hook error', () => {
            const error = `Error: Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:
    at Component (./src/components/Test.tsx:23:31)`;

            const result = parseReactError(error, 'app/page.tsx');
            expect(result).toEqual({
                type: 'REACT_ERROR',
                message:
                    'Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:',
                filePath: './src/components/Test.tsx',
                line: 23,
                column: 31,
                fullMessage: error,
            });
        });

        it('should parse TypeScript type error', () => {
            const error = `./components/Form.tsx:45:10
Type error: Type '{ onClick: () => void; invalid: boolean; }' is not assignable to type 'ButtonProps'.
  Object literal may only specify known properties, but 'invalid' does not exist in type 'ButtonProps'.`;

            const result = parseReactError(error, 'components/Form.tsx');
            expect(result).toEqual({
                type: 'REACT_ERROR',
                message:
                    "Type error: Type '{ onClick: () => void; invalid: boolean; }' is not assignable to type 'ButtonProps'.",
                filePath: 'components/Form.tsx',
                line: 45,
                column: 10,
                fullMessage: error,
            });
        });
    });

    describe('React runtime errors with sourceId', () => {
        it('should parse React error with sourceId from error boundary', () => {
            const error = 'Uncaught ReferenceError: useState is not defined';
            const sourceId = 'not-found-boundary.js';

            const result = parseReactError(error, sourceId);
            expect(result).toEqual({
                type: 'REACT_ERROR',
                message: 'useState is not defined',
                filePath: 'not-found-boundary.js',
                fullMessage: error,
            });
        });

        it('should parse React error with sourceId from page', () => {
            const error = 'Uncaught ReferenceError: useState is not defined';
            const sourceId = 'page.tsx';

            const result = parseReactError(error, sourceId);
            expect(result).toEqual({
                type: 'REACT_ERROR',
                message: 'useState is not defined',
                filePath: 'page.tsx',
                fullMessage: error,
            });
        });

        it('should parse React error with sourceId from redirect boundary', () => {
            const error = 'Uncaught ReferenceError: useState is not defined';
            const sourceId = 'redirect-boundary.js';

            const result = parseReactError(error, sourceId);
            expect(result).toEqual({
                type: 'REACT_ERROR',
                message: 'useState is not defined',
                filePath: 'redirect-boundary.js',
                fullMessage: error,
            });
        });

        it('should parse React error with webpack internal sourceId', () => {
            const error = 'Uncaught TypeError: Cannot read properties of undefined';
            const sourceId = 'webpack-internal:///./components/MyComponent.tsx';

            const result = parseReactError(error, sourceId);
            expect(result).toEqual({
                type: 'REACT_ERROR',
                message: 'Cannot read properties of undefined',
                filePath: './components/MyComponent.tsx',
                fullMessage: error,
            });
        });
    });

    describe('Unknown errors', () => {
        it('should handle unknown error format', () => {
            const error = 'Some random error message';
            const result = parseReactError(error, 'components/Form.tsx');
            expect(result).toEqual({
                type: 'UNKNOWN',
                message: error,
                fullMessage: error,
            });
        });

        it('should handle empty error string', () => {
            const result = parseReactError('', 'components/Form.tsx');
            expect(result).toEqual({
                type: 'UNKNOWN',
                message: '',
                fullMessage: '',
            });
        });

        it('should handle undefined input', () => {
            const result = parseReactError(undefined as any, 'components/Form.tsx');
            expect(result).toEqual({
                type: 'UNKNOWN',
                message: '',
                fullMessage: '',
            });
        });
    });
});
