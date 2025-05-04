import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';

export interface Rule {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export class LongTermMemory {
  private rulesDir: string;
  private rules: Map<string, Rule>;

  constructor(rulesDir: string = path.join(process.cwd(), 'rules')) {
    this.rulesDir = rulesDir;
    this.rules = new Map();
  }

  async init() {
    await this.initialize();
  }

  private async initialize() {
    try {
      await fs.ensureDir(this.rulesDir);
      await this.loadRules();
    } catch (error) {
      console.error('Failed to initialize long-term memory:', error);
    }
  }

  private async loadRules() {
    try {
      const files = await fs.readdir(this.rulesDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const rulePath = path.join(this.rulesDir, file);
          const ruleData = await fs.readJson(rulePath);
          this.rules.set(ruleData.id, {
            ...ruleData,
            createdAt: new Date(ruleData.createdAt),
            updatedAt: new Date(ruleData.updatedAt)
          });
        }
      }
    } catch (error) {
      console.error('Failed to load rules:', error);
    }
  }

  async addRule(rule: Omit<Rule, 'id' | 'createdAt' | 'updatedAt'>): Promise<Rule> {
    const newRule: Rule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const rulePath = path.join(this.rulesDir, `${newRule.id}.json`);
    await fs.writeJson(rulePath, newRule);
    this.rules.set(newRule.id, newRule);
    return newRule;
  }

  async updateRule(id: string, updates: Partial<Omit<Rule, 'id' | 'createdAt'>>): Promise<Rule | null> {
    const existingRule = this.rules.get(id);
    if (!existingRule) return null;

    const updatedRule: Rule = {
      ...existingRule,
      ...updates,
      updatedAt: new Date()
    };

    const rulePath = path.join(this.rulesDir, `${id}.json`);
    await fs.writeJson(rulePath, updatedRule);
    this.rules.set(id, updatedRule);
    return updatedRule;
  }

  async deleteRule(id: string): Promise<boolean> {
    const rulePath = path.join(this.rulesDir, `${id}.json`);
    try {
      await fs.remove(rulePath);
      this.rules.delete(id);
      return true;
    } catch (error) {
      console.error('Failed to delete rule:', error);
      return false;
    }
  }

  getRule(id: string): Rule | null {
    return this.rules.get(id) || null;
  }

  getAllRules(): Rule[] {
    return Array.from(this.rules.values());
  }

  getRulesByTag(tag: string): Rule[] {
    return Array.from(this.rules.values()).filter(rule => 
      rule.tags?.includes(tag)
    );
  }
} 