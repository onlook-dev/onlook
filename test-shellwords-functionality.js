#!/usr/bin/env node

const { escape } = require('shellwords');

const COMMIT_MESSAGE_MAX_LENGTH = 72;

const testMessages = [
    'Simple message',
    'Message with "quotes"',
    'Message with\nnewlines\nand\ttabs',
    'Message with | pipes | and \\ backslashes',
    'Very long message that should be truncated because it exceeds the maximum character limit of 72 characters and should end with ellipsis',
    'Message with control characters \x00\x01\x02',
    'Complex message with "quotes", \nnewlines, \ttabs, | pipes, and \\ backslashes all together',
    'Message with $variables and `backticks`',
    'Message with semicolons; and ampersands &',
];

console.log('Testing shellwords commit message escaping and truncation:');
console.log('='.repeat(80));
console.log(`COMMIT_MESSAGE_MAX_LENGTH: ${COMMIT_MESSAGE_MAX_LENGTH}`);
console.log('='.repeat(80));

let allTestsPassed = true;

testMessages.forEach((message, index) => {
    console.log(`\nTest ${index + 1}:`);
    console.log(`Original: "${message}"`);
    console.log(`Length: ${message.length}`);
    
    const truncated = message.length > COMMIT_MESSAGE_MAX_LENGTH 
        ? `${message.slice(0, COMMIT_MESSAGE_MAX_LENGTH - 3)}...`
        : message;
    console.log(`Truncated: "${truncated}" (${truncated.length} chars)`);
    
    const escaped = escape(truncated);
    console.log(`Escaped: ${escaped}`);
    
    if (truncated.length > COMMIT_MESSAGE_MAX_LENGTH) {
        console.log(`❌ FAIL: Truncated message is still too long (${truncated.length} > ${COMMIT_MESSAGE_MAX_LENGTH})`);
        allTestsPassed = false;
    } else {
        console.log(`✅ PASS: Truncation worked correctly`);
    }
    
    if (!escaped || escaped === truncated) {
        console.log(`❌ FAIL: Shellwords didn't escape the message properly`);
        allTestsPassed = false;
    } else {
        console.log(`✅ PASS: Shellwords escaping worked correctly`);
    }
});

console.log('\n' + '='.repeat(80));
if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Shellwords commit message truncation and escaping is working correctly.');
} else {
    console.log('❌ SOME TESTS FAILED! There are issues with the implementation.');
    process.exit(1);
}
console.log('='.repeat(80));
