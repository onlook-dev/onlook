#!/usr/bin/env node
import { Command } from 'commander';

export function createProgram() {
    const program = new Command();

    program
        .name('onlook')
        .description('The Onlook CLI')
        .version('0.0.0');

    program
        .command('setup')
        .description('Set up the current project with Onlook')
        .action(() => {
            console.log(`Hello, World!`);
        });

    return program;
}

if (process.env.NODE_ENV !== 'test') {
    const program = createProgram();
    program.parse(process.argv);
}