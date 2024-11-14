import terminal from '../terminal';

export function listenForTerminalMessages() {
    terminal.createTerminal('term1');
    terminal.write('term1', 'echo "hello"\n');
}
