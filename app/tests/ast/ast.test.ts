import { test } from 'bun:test';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { decode } from '/common/helpers/template';

const id =
    'eJx9jkEOgkAMRe/SNbEimuisPYIeYGQaIQwtmZZIQri7kIhhYVz9v3j5/41QStsJExs4uHqtHuJTgAyIw80/wY1LW6KU2LcM7rDPINZM4Ir8PGWg5pNtgbzYAjPReavmdbwrJcWmJqsEX5KaLvqSUDiKNKjWh1owUCuKTIPhV00xrGY70wE+p7/9ist6n5+O//0WYJrep31Xhw==';

test('dom test', async () => {
    const filePath = resolve(__dirname, 'dom.html');
    document.body.innerHTML = readFileSync(filePath, 'utf8');

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
        acceptNode(node) {
            // Filter by data-onlook-id
            const encoded = node.getAttribute('data-onlook-id');
            if (!encoded) {
                return NodeFilter.FILTER_ACCEPT;
            }
            const templateNode = decode(encoded);
            if (templateNode.component === 'Dashboard') {
                return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_REJECT;
        },
    });
    walker.currentNode = document.body;
    let currentNode;
    let i = 0;
    while ((currentNode = walker.nextNode())) {
        i++;
        console.log(i);
    }
});
