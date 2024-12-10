import { beforeEach, describe, expect, test } from "bun:test";
import { tmpdir } from "os";
import { join } from "path";
import { codeFence, searchReplaceFence } from "src/edit/prompts";

// Mock interfaces and types to match Python structure
interface Model {
    name: string;
}

interface Coder {
    partialResponseContent: string;
    partialResponseFunctionCall: Record<string, any>;
    send: (...args: any[]) => any[];
    run: (options: { withMessage: string }) => void;
}

interface InputOutput {
    dryRun?: boolean;
    yes?: boolean;
}

// Helper functions that mirror Python's functionality
const editblock = {
    findFilename: (lines: string[], fence: [string, string], validFnames: string[]): string => {
        // Simplified version of find_filename
        for (const line of lines) {
            if (validFnames.includes(line.trim())) {
                return line.trim();
            }
        }
        return lines[0]?.trim() || "";
    },

    stripQuotedWrapping: (text: string, filename?: string): string => {
        const lines = text.split("\n");
        if (lines[0].includes("```") || (filename && lines[0].includes(filename))) {
            lines.shift();
        }
        if (lines[lines.length - 1].includes("```")) {
            lines.pop();
        }
        return lines.join("\n") + "\n";
    },

    findOriginalUpdateBlocks: function* (
        edit: string,
        fence: [string, string] = ["```", "```"],
        validFnames?: string[]
    ): Generator<[string, string, string]> {
        const lines = edit.split("\n");
        let currentFile = "";
        let searchBlock = "";
        let replaceBlock = "";
        let inSearchBlock = false;
        let inReplaceBlock = false;

        for (const line of lines) {
            if (!currentFile && !line.includes("<<<<")) {
                if (!line.includes("```")) {
                    currentFile = validFnames?.includes(line.trim()) ? line.trim() : "";
                }
                continue;
            }

            if (line.includes("<<<<<<< SEARCH")) {
                inSearchBlock = true;
                continue;
            }

            if (line.includes("=======") && inSearchBlock) {
                inSearchBlock = false;
                inReplaceBlock = true;
                continue;
            }

            if (line.includes(">>>>>>> REPLACE")) {
                if (!currentFile) {
                    throw new Error("missing filename");
                }
                inReplaceBlock = false;
                yield [currentFile, searchBlock + "\n", replaceBlock + "\n"];
                searchBlock = "";
                replaceBlock = "";
                currentFile = "";
                continue;
            }

            if (inSearchBlock) {
                searchBlock += (searchBlock ? "\n" : "") + line;
            }

            if (inReplaceBlock) {
                replaceBlock += (replaceBlock ? "\n" : "") + line;
            }
        }

        if (inSearchBlock || inReplaceBlock) {
            throw new Error("Expected \`>>>>>>> REPLACE\` or \`=======\`");
        }
    },

    replaceMostSimilarChunk: (whole: string, part: string, replace: string): string => {
        // For now, implementing a simple direct replacement
        // In a real implementation, you'd want to handle whitespace and fuzzy matching
        return whole.replace(part.trim(), replace.trim());
    }
};

describe("EditBlock Tests", () => {
    let gpt35: Model;
    let tempDir: string;

    beforeEach(() => {
        gpt35 = { name: "gpt-3.5-turbo" };
        tempDir = join(tmpdir(), "edit-block-tests-" + Math.random().toString(36).slice(2));
    });

    test("find filename with various formats", () => {
        const fence: [string, string] = ["```", "```"];
        const validFnames = ["file1.py", "file2.py", "dir/file3.py", "\\windows\\__init__.py"];

        // Test with filename on a single line
        expect(editblock.findFilename(["file1.py", "```"], fence, validFnames))
            .toBe("file1.py");

        // Test with filename in fence
        expect(editblock.findFilename(["```python", "file3.py", "```"], fence, validFnames))
            .toBe("dir/file3.py");

        // Test with no valid filename
        expect(editblock.findFilename(["```", "invalid_file.py", "```"], fence, validFnames))
            .toBe("invalid_file.py");
    });

    test("strip quoted wrapping with filename", () => {
        const input = "filename.ext\n```\nWe just want this content\nNot the filename and triple quotes\n```";
        const expected = "We just want this content\nNot the filename and triple quotes\n";
        expect(editblock.stripQuotedWrapping(input, "filename.ext")).toBe(expected);
    });

    test("find original update blocks", () => {
        const edit = `
Here's the change:

\`\`\`text
foo.txt
${searchReplaceFence.start} SEARCH
Two
${searchReplaceFence.middle}
Tooooo
${searchReplaceFence.end}
\`\`\`

Hope you like it!
`;

        const edits = Array.from(editblock.findOriginalUpdateBlocks(edit));
        expect(edits).toEqual([["foo.txt", "Two\n", "Tooooo\n"]]);
    });

    test("find original update blocks with missing filename throws error", () => {
        const edit = `
Here's the change:

\`\`\`text
${searchReplaceFence.start} SEARCH
Two
${searchReplaceFence.middle}
Tooooo
${searchReplaceFence.end}
\`\`\`
`;

        expect(() => Array.from(editblock.findOriginalUpdateBlocks(edit)))
            .toThrow("missing filename");
    });

    test("replace chunk with whitespace variations", async () => {
        const whole = "    line1\n    line2\n    line3\n";
        const part = "line1\nline2\n";
        const replace = "new_line1\nnew_line2\n";
        const expected = "    new_line1\n    new_line2\n    line3\n";

        expect(editblock.replaceMostSimilarChunk(whole, part, replace)).toBe(expected);
    });

    // Additional test for multiple files scenario
    test("handle multiple files in edit blocks", () => {
        const edit = `
Here's the change:

path/to/a/file2.txt
\`\`\`python
${searchReplaceFence.start} SEARCH
${searchReplaceFence.middle}
three
${searchReplaceFence.end}
\`\`\`

another change

path/to/a/file1.txt
${codeFence.start}python
${searchReplaceFence.start} SEARCH
one
${searchReplaceFence.middle}
two
${searchReplaceFence.end}
${codeFence.end}
`;

        const edits = Array.from(editblock.findOriginalUpdateBlocks(edit, ["```", "```"], ["path/to/a/file1.txt"]));
        expect(edits).toEqual([
            ["path/to/a/file2.txt", "\n", "three\n"],
            ["path/to/a/file1.txt", "one\n", "two\n"]
        ]);
    });
});