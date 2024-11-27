import { expect, test } from "bun:test";
import { onlookFound, removePlugins } from "../src/revert";

test("test Onlook found", async () => {
    console.log('v15');
    const result = await onlookFound("/Users/kietho/workplace/onlook/test/v15");
    expect(result).toBe(false);
});

test("test Onlook found", async () => {
    console.log('hn_clone');
    const result = await onlookFound("/Users/kietho/workplace/onlook/test/hn_clone");
    expect(result).toBe(true);
});

test("test revert Onlook", async () => {
    await removePlugins("/Users/kietho/workplace/onlook/test/hn_clone");
});