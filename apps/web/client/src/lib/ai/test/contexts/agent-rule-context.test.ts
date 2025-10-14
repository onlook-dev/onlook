import { MessageContextType, type AgentRuleMessageContext } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import { AgentRuleContext } from '../../src/contexts/classes/agent-rule';

describe('AgentRuleContext', () => {
    const createMockAgentRuleContext = (overrides: Partial<AgentRuleMessageContext> = {}): AgentRuleMessageContext => ({
        type: MessageContextType.AGENT_RULE,
        content: `## Project Guidelines

### Code Style
- Use TypeScript for all new code
- Follow ESLint rules strictly
- Use Prettier for formatting

### Architecture
- Follow MVC pattern
- Use dependency injection
- Keep components small and focused`,
        displayName: 'CLAUDE.md',
        path: '/project/CLAUDE.md',
        ...overrides,
    });

    describe('static properties', () => {
        test('should have correct context type', () => {
            expect(AgentRuleContext.contextType).toBe(MessageContextType.AGENT_RULE);
        });

        test('should have correct display name', () => {
            expect(AgentRuleContext.displayName).toBe('Agent Rule');
        });

        test('should have an icon', () => {
            expect(AgentRuleContext.icon).toBeDefined();
        });
    });

    describe('getPrompt', () => {
        test('should generate correct prompt format', () => {
            const context = createMockAgentRuleContext();
            const prompt = AgentRuleContext.getPrompt(context);

            expect(prompt).toContain('/project/CLAUDE.md');
            expect(prompt).toContain('## Project Guidelines');
            expect(prompt).toContain('### Code Style');
            expect(prompt).toContain('- Use TypeScript for all new code');
            expect(prompt).toContain('### Architecture');
        });

        test('should handle simple rule file', () => {
            const context = createMockAgentRuleContext({
                path: 'rules.txt',
                content: 'Always use semicolons in JavaScript',
            });
            const prompt = AgentRuleContext.getPrompt(context);

            expect(prompt).toBe('rules.txt\nAlways use semicolons in JavaScript');
        });

        test('should handle empty content', () => {
            const context = createMockAgentRuleContext({
                content: '',
            });
            const prompt = AgentRuleContext.getPrompt(context);

            expect(prompt).toContain('/project/CLAUDE.md');
            expect(prompt).toContain('\n');
        });

        test('should handle multiline markdown content', () => {
            const context = createMockAgentRuleContext({
                content: `# Agent Rules

## General Guidelines
1. Always validate inputs
2. Use proper error handling
3. Write comprehensive tests

## Specific Rules
- No console.log statements in production
- Use environment variables for configuration
- Follow the existing naming conventions

### Testing Requirements
- Unit tests for all functions
- Integration tests for API endpoints
- E2E tests for critical user flows`,
            });
            const prompt = AgentRuleContext.getPrompt(context);

            expect(prompt).toContain('# Agent Rules');
            expect(prompt).toContain('## General Guidelines');
            expect(prompt).toContain('1. Always validate inputs');
            expect(prompt).toContain('### Testing Requirements');
        });

        test('should handle path with special characters', () => {
            const context = createMockAgentRuleContext({
                path: '/project/rules & guidelines.md',
            });
            const prompt = AgentRuleContext.getPrompt(context);

            expect(prompt).toContain('/project/rules & guidelines.md');
        });

        test('should handle very long file paths', () => {
            const longPath = '/very/deep/nested/folder/structure/with/many/levels/agent-rules-and-guidelines.md';
            const context = createMockAgentRuleContext({
                path: longPath,
            });
            const prompt = AgentRuleContext.getPrompt(context);

            expect(prompt).toContain(longPath);
        });

        test('should handle content with code blocks', () => {
            const context = createMockAgentRuleContext({
                content: `# Code Examples

## TypeScript Interface
\`\`\`typescript
interface User {
  id: string;
  name: string;
  email: string;
}
\`\`\`

## React Component
\`\`\`jsx
const UserCard = ({ user }) => (
  <div className="user-card">
    <h2>{user.name}</h2>
    <p>{user.email}</p>
  </div>
);
\`\`\``,
            });
            const prompt = AgentRuleContext.getPrompt(context);

            expect(prompt).toContain('```typescript');
            expect(prompt).toContain('interface User {');
            expect(prompt).toContain('```jsx');
            expect(prompt).toContain('const UserCard');
        });

        test('should handle content with XML/HTML', () => {
            const context = createMockAgentRuleContext({
                content: 'Use <component> tags for React components and <div> for containers',
            });
            const prompt = AgentRuleContext.getPrompt(context);

            expect(prompt).toContain('<component>');
            expect(prompt).toContain('<div>');
        });
    });

    describe('getLabel', () => {
        test('should use displayName when available', () => {
            const context = createMockAgentRuleContext({
                displayName: 'Project Rules',
            });
            const label = AgentRuleContext.getLabel(context);

            expect(label).toBe('Project Rules');
        });

        test('should fallback to path when no displayName', () => {
            const context = createMockAgentRuleContext({
                displayName: '',
                path: '/project/guidelines.md',
            });
            const label = AgentRuleContext.getLabel(context);

            expect(label).toBe('/project/guidelines.md');
        });

        test('should fallback to path when displayName is undefined', () => {
            const context = createMockAgentRuleContext();
            delete (context as any).displayName;
            const label = AgentRuleContext.getLabel(context);

            expect(label).toBe('/project/CLAUDE.md');
        });

        test('should handle path as filename only', () => {
            const context = createMockAgentRuleContext({
                displayName: '',
                path: 'README.md',
            });
            const label = AgentRuleContext.getLabel(context);

            expect(label).toBe('README.md');
        });

        test('should handle path with extension', () => {
            const context = createMockAgentRuleContext({
                displayName: '',
                path: '/docs/agent-instructions.txt',
            });
            const label = AgentRuleContext.getLabel(context);

            expect(label).toBe('/docs/agent-instructions.txt');
        });

        test('should handle empty path and displayName', () => {
            const context = createMockAgentRuleContext({
                displayName: '',
                path: '',
            });
            const label = AgentRuleContext.getLabel(context);

            expect(label).toBe('');
        });

        test('should handle whitespace-only displayName', () => {
            const context = createMockAgentRuleContext({
                displayName: '   \t\n   ',
            });
            const label = AgentRuleContext.getLabel(context);

            expect(label).toBe('   \t\n   ');
        });
    });

    describe('getAgentRulesContent', () => {
        test('should generate content for single rule', () => {
            const rules = [createMockAgentRuleContext()];
            const content = AgentRuleContext.getAgentRulesContent(rules);

            expect(content).toContain('These are user provided rules for the project');
            expect(content).toContain('<agent-rules>');
            expect(content).toContain('/project/CLAUDE.md');
            expect(content).toContain('## Project Guidelines');
            expect(content).toContain('</agent-rules>');
        });

        test('should generate content for multiple rules', () => {
            const rules = [
                createMockAgentRuleContext({
                    path: 'CLAUDE.md',
                    content: 'Use TypeScript exclusively',
                }),
                createMockAgentRuleContext({
                    path: 'STYLE.md',
                    content: 'Follow Prettier formatting',
                }),
                createMockAgentRuleContext({
                    path: 'TESTING.md',
                    content: 'Write comprehensive unit tests',
                }),
            ];
            const content = AgentRuleContext.getAgentRulesContent(rules);

            expect(content).toContain('CLAUDE.md');
            expect(content).toContain('Use TypeScript exclusively');
            expect(content).toContain('STYLE.md');
            expect(content).toContain('Follow Prettier formatting');
            expect(content).toContain('TESTING.md');
            expect(content).toContain('Write comprehensive unit tests');
        });

        test('should handle empty rules array', () => {
            const content = AgentRuleContext.getAgentRulesContent([]);

            expect(content).toContain('These are user provided rules for the project');
            expect(content).toContain('<agent-rules>');
            expect(content).toContain('</agent-rules>');
        });

        test('should preserve rule order', () => {
            const rules = [
                createMockAgentRuleContext({
                    path: 'first.md',
                    content: 'First rule',
                }),
                createMockAgentRuleContext({
                    path: 'second.md',
                    content: 'Second rule',
                }),
                createMockAgentRuleContext({
                    path: 'third.md',
                    content: 'Third rule',
                }),
            ];
            const content = AgentRuleContext.getAgentRulesContent(rules);

            const firstIndex = content.indexOf('First rule');
            const secondIndex = content.indexOf('Second rule');
            const thirdIndex = content.indexOf('Third rule');

            expect(firstIndex).toBeLessThan(secondIndex);
            expect(secondIndex).toBeLessThan(thirdIndex);
        });

        test('should handle rules with empty content', () => {
            const rules = [
                createMockAgentRuleContext({
                    path: 'empty.md',
                    content: '',
                }),
                createMockAgentRuleContext({
                    path: 'filled.md',
                    content: 'Some content',
                }),
            ];
            const content = AgentRuleContext.getAgentRulesContent(rules);

            expect(content).toContain('empty.md');
            expect(content).toContain('filled.md');
            expect(content).toContain('Some content');
        });

        test('should handle rules with very long content', () => {
            const longContent = 'This is a very long rule content. '.repeat(100);
            const rules = [
                createMockAgentRuleContext({
                    content: longContent,
                }),
            ];
            const content = AgentRuleContext.getAgentRulesContent(rules);

            expect(content).toContain(longContent);
        });

        test('should include prefix for context', () => {
            const rules = [createMockAgentRuleContext()];
            const content = AgentRuleContext.getAgentRulesContent(rules);

            expect(content).toContain('These are user provided rules for the project');
        });

        test('should properly wrap content in XML tags', () => {
            const rules = [createMockAgentRuleContext()];
            const content = AgentRuleContext.getAgentRulesContent(rules);

            expect(content).toMatch(/<agent-rules>[\s\S]*<\/agent-rules>$/);
        });
    });

    describe('edge cases', () => {
        test('should handle null or undefined properties gracefully', () => {
            const context = {
                type: MessageContextType.AGENT_RULE,
                content: 'Basic rule',
                displayName: null,
                path: undefined,
            } as any;

            expect(() => AgentRuleContext.getPrompt(context)).not.toThrow();
            expect(() => AgentRuleContext.getLabel(context)).not.toThrow();
        });

        test('should handle unicode characters in content and path', () => {
            const context = createMockAgentRuleContext({
                path: '/项目/规则.md',
                content: '使用 TypeScript 编写代码 🚀',
            });
            const prompt = AgentRuleContext.getPrompt(context);

            expect(prompt).toContain('/项目/规则.md');
            expect(prompt).toContain('使用 TypeScript 编写代码 🚀');
        });

        test('should handle very deep file paths', () => {
            const deepPath = Array(20).fill('level').join('/') + '/rules.md';
            const context = createMockAgentRuleContext({
                path: deepPath,
            });
            const prompt = AgentRuleContext.getPrompt(context);

            expect(prompt).toContain(deepPath);
        });

        test('should handle content with special markdown characters', () => {
            const context = createMockAgentRuleContext({
                content: `# Title with * and _
                
**Bold text** and *italic text*

- List item with [link](http://example.com)
- Another item with \`inline code\`

> Blockquote with **formatting**

1. Ordered list
2. Second item`,
            });
            const prompt = AgentRuleContext.getPrompt(context);

            expect(prompt).toContain('**Bold text**');
            expect(prompt).toContain('*italic text*');
            expect(prompt).toContain('[link](http://example.com)');
            expect(prompt).toContain('`inline code`');
            expect(prompt).toContain('> Blockquote');
        });

        test('should handle YAML frontmatter in content', () => {
            const context = createMockAgentRuleContext({
                content: `---
title: "Agent Rules"
version: 1.0
tags: ["rules", "guidelines"]
---

# Actual Content
These are the rules.`,
            });
            const prompt = AgentRuleContext.getPrompt(context);

            expect(prompt).toContain('---');
            expect(prompt).toContain('title: "Agent Rules"');
            expect(prompt).toContain('# Actual Content');
        });

        test('should handle Windows-style file paths', () => {
            const context = createMockAgentRuleContext({
                path: 'C:\\Projects\\MyApp\\rules.md',
            });
            const prompt = AgentRuleContext.getPrompt(context);

            expect(prompt).toContain('C:\\Projects\\MyApp\\rules.md');
        });

        test('should handle content with tables', () => {
            const context = createMockAgentRuleContext({
                content: `| Rule | Priority | Status |
|------|----------|--------|
| Use TypeScript | High | ✅ |
| Write tests | Medium | ⚠️ |
| Document code | Low | ❌ |`,
            });
            const prompt = AgentRuleContext.getPrompt(context);

            expect(prompt).toContain('| Rule | Priority | Status |');
            expect(prompt).toContain('| Use TypeScript | High | ✅ |');
        });

        test('should handle content with line breaks and whitespace', () => {
            const context = createMockAgentRuleContext({
                content: `

# Title with spaces around



- List item 1

- List item 2


`,
            });
            const prompt = AgentRuleContext.getPrompt(context);

            expect(prompt).toContain('# Title with spaces around');
            expect(prompt).toContain('- List item 1');
            expect(prompt).toContain('- List item 2');
        });
    });
});