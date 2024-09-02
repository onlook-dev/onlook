#!/usr/bin/env node
import { Command } from 'commander';
import { setup } from './setup';

export function createProgram() {
    const program = new Command();

    program
        .name('onlook')
        .description('The Onlook CLI')
        .version('0.0.0');

    program
        .command('init')
        .description('Set up the current project with Onlook')
        .action(setup);

    return program;
}

if (process.env.NODE_ENV !== 'test') {
    const program = createProgram();
    program.parse(process.argv);
}