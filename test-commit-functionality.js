const { escapeCommitMessage, COMMIT_MESSAGE_MAX_LENGTH } = require('./apps/web/client/src/components/store/editor/version/git.ts');

const testMessages = [
    'Simple message',
    'Message with "quotes"',
    'Message with\nnewlines\nand\ttabs',
    'Message with | pipes | and \\ backslashes',
    'Very long message that should be truncated because it exceeds the maximum character limit of 72 characters and should end with ellipsis',
    'Message with control characters \x00\x01\x02',
];

console.log('Testing commit message escaping and truncation:');
console.log('='.repeat(60));

testMessages.forEach((message, index) => {
    console.log(`\nTest ${index + 1}:`);
    console.log(`Original: "${message}"`);
    console.log(`Length: ${message.length}`);
    
    const truncated = message.length > COMMIT_MESSAGE_MAX_LENGTH 
        ? `${message.slice(0, COMMIT_MESSAGE_MAX_LENGTH - 3)}...`
        : message;
    console.log(`Truncated: "${truncated}" (${truncated.length} chars)`);
    
    const escaped = escapeCommitMessage(truncated);
    console.log(`Escaped: "${escaped}"`);
});
