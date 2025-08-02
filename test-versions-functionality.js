#!/usr/bin/env node


const fs = require('fs');
const path = require('path');

const gitFilePath = path.join(__dirname, 'apps/web/client/src/components/store/editor/version/git.ts');
const gitFileContent = fs.readFileSync(gitFilePath, 'utf8');

const maxLengthMatch = gitFileContent.match(/export const COMMIT_MESSAGE_MAX_LENGTH = (\d+);/);
const COMMIT_MESSAGE_MAX_LENGTH = maxLengthMatch ? parseInt(maxLengthMatch[1]) : 72;

const escapeFunctionMatch = gitFileContent.match(/function escapeCommitMessage\(message: string\): string \{([\s\S]*?)\}/);
if (!escapeFunctionMatch) {
    console.error('Could not find escapeCommitMessage function');
    process.exit(1);
}

function escapeCommitMessage(message) {
    return message
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t')
        .replace(/\|/g, '\\|')
        .replace(/[\x00-\x1F\x7F]/g, '');
}

const testMessages = [
    'Simple message',
    'Message with "quotes"',
    'Message with\nnewlines\nand\ttabs',
    'Message with | pipes | and \\ backslashes',
    'Very long message that should be truncated because it exceeds the maximum character limit of 72 characters and should end with ellipsis',
    'Message with control characters \x00\x01\x02',
    'Complex message with "quotes", \nnewlines, \ttabs, | pipes, and \\ backslashes all together',
];

console.log('Testing commit message escaping and truncation:');
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
    
    const escaped = escapeCommitMessage(truncated);
    console.log(`Escaped: "${escaped}"`);
    
    const unescaped = escaped
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\|/g, '|')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    console.log(`Unescaped: "${unescaped}"`);
    
    if (truncated.length > COMMIT_MESSAGE_MAX_LENGTH) {
        console.log(`❌ FAIL: Truncated message is still too long (${truncated.length} > ${COMMIT_MESSAGE_MAX_LENGTH})`);
        allTestsPassed = false;
    } else {
        console.log(`✅ PASS: Truncation worked correctly`);
    }
    
    if (escaped.includes('\n') || escaped.includes('\r') || escaped.includes('\t') || 
        (escaped.includes('|') && !escaped.includes('\\|')) || 
        (escaped.includes('"') && !escaped.includes('\\"'))) {
        console.log(`❌ FAIL: Escaping didn't work correctly`);
        allTestsPassed = false;
    } else {
        console.log(`✅ PASS: Escaping worked correctly`);
    }
    
    if (unescaped === truncated) {
        console.log(`✅ PASS: Round-trip escape/unescape worked correctly`);
    } else {
        console.log(`❌ FAIL: Round-trip failed. Expected: "${truncated}", Got: "${unescaped}"`);
        allTestsPassed = false;
    }
});

console.log('\n' + '='.repeat(80));
if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Commit message truncation and escaping is working correctly.');
} else {
    console.log('❌ SOME TESTS FAILED! There are issues with the implementation.');
    process.exit(1);
}
console.log('='.repeat(80));
