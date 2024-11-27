import { expect, test } from "bun:test";
import { onlookFound, removeNpmDependencies, removePlugins } from "../src/revert";

const TEST_FOLDER = '';

test("test Onlook found", async () => {
    const result = await onlookFound(TEST_FOLDER);
    expect(result).toBe(false);
});

test("test revert Onlook Next.js", async () => {
    await removePlugins(TEST_FOLDER);
});

test("test revert Onlook Vite", async () => {
    await removePlugins(TEST_FOLDER);
});

test("test revert Onlook dependencies", async () => {
    await removeNpmDependencies(TEST_FOLDER);
});