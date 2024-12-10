import { describe, test } from 'bun:test';
import { examples } from '../../src/prompt/edit/example';
describe('Print example', () => {
    test('should print examples', () => {
        for (const example of examples) {
            console.log(example.role + ':');
            console.log(example.content);
        }
    });
});
