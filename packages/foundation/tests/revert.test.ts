import { expect, test } from "bun:test";
import { onlookFound, removeNpmDependencies, removePlugins } from "../src/revert";

test("test Onlook found", async () => {
    const result = await onlookFound("/Users/kietho/workplace/onlook/test/v15");
    expect(result).toBe(false);
});

test("test revert Onlook Next.js", async () => {
    await removePlugins("/Users/kietho/workplace/onlook/test/hn_clone");
});

test("test revert Onlook Vite", async () => {
    await removePlugins("/Users/kietho/workplace/onlook/test/remix");
});

test("test revert Onlook dependencies", async () => {
    await removeNpmDependencies("/Users/kietho/workplace/onlook/test/remix");
    await removeNpmDependencies("/Users/kietho/workplace/onlook/test/hn_clone");
});