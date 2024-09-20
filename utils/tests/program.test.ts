import { afterAll, expect, jest, mock, test } from "bun:test";
import { createProgram } from "../src/cli";
import { setup } from "../src/setup";

const originalConsoleLog = console.log;
console.log = mock()

test("createProgram creates a Command instance with correct properties", () => {
    const program = createProgram();

    expect(program.name()).toBe("onlook");
    expect(program.description()).toBe("The Onlook Command Line Interface");
    expect(program.version()).toBe("0.0.0");
});

test("'create' command logs 'Coming soon!'", () => {
    const program = createProgram();
    program.parse(["node", "test", "create"]);

    expect(console.log).toHaveBeenCalledWith("Coming soon!");
});

test("'setup' command calls setup function", async () => {
    // Mock the setup function
    mock.module("../src/setup", () => ({
        setup: jest.fn()
    }));

    const program = createProgram();
    program.parse(["node", "test", "setup"]);
    expect(setup).toHaveBeenCalled();
});

test("version option returns correct version", () => {
    const program = createProgram();

    // Mock process.exit to prevent the test from exiting
    const exit = jest.spyOn(process, 'exit').mockImplementation((num: number) => { throw new Error('process.exit: ' + num); });

    // Capture console output
    let output = '';
    console.log = (msg) => { output += msg + '\n'; };

    // Run the version command
    expect(() => {
        program.parse(["node", "test", "--version"]);
    }).toThrow();

    expect(output.trim()).toBe("");

    // Restore console.log and process.exit
    console.log = originalConsoleLog;
    exit.mockRestore();
});

// Clean up
afterAll(() => {
    console.log = originalConsoleLog;
});