import { LongTermMemory, Rule } from './index';
import fs from 'fs-extra';
import path from 'path';

describe('LongTermMemory', () => {
  let memory: LongTermMemory;
  const testRulesDir = path.join(process.cwd(), 'test-rules');

  beforeEach(async () => {
    await fs.remove(testRulesDir);
    memory = new LongTermMemory(testRulesDir);
    await memory.init();
  });

  afterEach(async () => {
    await fs.remove(testRulesDir);
  });

  it('should initialize with empty rules', () => {
    expect(memory.getAllRules()).toEqual([]);
  });

  it('should add a new rule', async () => {
    const rule: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'> = {
      content: 'Test rule content',
      tags: ['test']
    };

    const addedRule = await memory.addRule(rule);
    expect(addedRule).toMatchObject({
      content: rule.content,
      tags: rule.tags
    });
    expect(addedRule.id).toBeDefined();
    expect(addedRule.createdAt).toBeInstanceOf(Date);
    expect(addedRule.updatedAt).toBeInstanceOf(Date);

    const filePath = path.join(testRulesDir, `${addedRule.id}.json`);
    expect(await fs.pathExists(filePath)).toBe(true);
  });

  it('should update an existing rule', async () => {
    const rule = await memory.addRule({
      content: 'Original content',
      tags: ['test']
    });

    const updatedRule = await memory.updateRule(rule.id, {
      content: 'Updated content'
    });

    expect(updatedRule).not.toBeNull();
    expect(updatedRule?.content).toBe('Updated content');
    expect(updatedRule?.tags).toEqual(['test']);
  });

  it('should delete a rule', async () => {
    const rule = await memory.addRule({
      content: 'Test rule',
      tags: ['test']
    });

    const deleted = await memory.deleteRule(rule.id);
    expect(deleted).toBe(true);
    expect(memory.getRule(rule.id)).toBeNull();

    const filePath = path.join(testRulesDir, `${rule.id}.json`);
    expect(await fs.pathExists(filePath)).toBe(false);
  });

  it('should get rules by tag', async () => {
    await memory.addRule({
      content: 'Rule 1',
      tags: ['test']
    });

    await memory.addRule({
      content: 'Rule 2',
      tags: ['test']
    });

    await memory.addRule({
      content: 'Rule 3',
      tags: ['other']
    });

    const testRules = memory.getRulesByTag('test');
    expect(testRules).toHaveLength(2);
    expect(testRules.every(rule => rule.tags?.includes('test'))).toBe(true);
  });
}); 