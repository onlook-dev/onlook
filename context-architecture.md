# Context Base Class Architecture

## Overview
Create a base class system for contexts similar to the existing tool architecture, integrating with the current context generation and prompt formatting system.

## Current Architecture Analysis

### Context Generation
- **`ChatContext` class** (apps/web/client/src/components/store/editor/chat/context.ts): Dynamically creates `MessageContext` objects from editor state
- **Data Sources**: Selected elements, files, errors, branches, images, agent rules

### Prompt Formatting  
- **`provider.ts`** (packages/ai/src/prompt/provider.ts): Contains functions like `getFilesContent()`, `getErrorsContent()` that convert contexts to formatted prompts
- **Data Flow**: Raw data → `MessageContext` → Formatted prompts for AI

### Context Types
- `FILE` - File contents with path and branch info
- `HIGHLIGHT` - Code selections with line ranges
- `IMAGE` - Image attachments with mime types
- `ERROR` - Build/runtime errors by branch
- `BRANCH` - Branch metadata and descriptions
- `AGENT_RULE` - Agent instruction files (CLAUDE.md, etc.)

## Proposed Base Context Architecture

### 1. Base Context Class (Tool Pattern)
**Location**: `packages/ai/src/contexts/models/base.ts`

Following the existing `BaseTool` pattern for consistency:

```typescript
export interface ContextIcon {
    className?: string;
}

export abstract class BaseContext {
    static readonly contextType: MessageContextType;
    static readonly displayName: string;
    static readonly icon: ComponentType<ContextIcon>;
    
    /**
     * Generate formatted prompt content for this context type
     */
    static getPrompt(context: MessageContext): string;
    
    /**
     * Generate display label for UI
     */
    static getLabel(context: MessageContext): string;
}
```

**Usage Example:**
```typescript
// Direct static calls, similar to tools
const filePrompt = FileContext.getPrompt(fileContext);
const highlightLabel = HighlightContext.getLabel(highlightContext);
```

### 2. Context Implementations
**Location**: `packages/ai/src/contexts/classes/`

#### FileContext
```typescript
export class FileContext extends BaseContext {
    static readonly contextType = MessageContextType.FILE;
    static readonly displayName = 'File';
    static readonly icon = Icons.FileText;
    
    static getPrompt(context: FileMessageContext): string {
        // Move existing getFilesContent() logic here
        return `<path>${context.path}</path>\n<branch id="${context.branchId}" />\n\`\`\`${getLanguageFromFilePath(context.path)}\n${context.content}\n\`\`\``;
    }
    
    static getLabel(context: FileMessageContext): string {
        return context.path.split('/').pop() || 'File';
    }
}
```

#### HighlightContext  
```typescript
export class HighlightContext extends BaseContext {
    static readonly contextType = MessageContextType.HIGHLIGHT;
    static readonly displayName = 'Code Selection';
    static readonly icon = Icons.Target;
    
    static getPrompt(context: HighlightMessageContext): string {
        // Move existing getHighlightsContent() logic here
    }
}
```

#### ErrorContext
```typescript
export class ErrorContext extends BaseContext {
    static readonly contextType = MessageContextType.ERROR;
    static readonly displayName = 'Error';
    static readonly icon = Icons.ExclamationTriangle;
    
    static getPrompt(context: ErrorMessageContext): string {
        // Move existing getErrorsContent() logic here
    }
}
```

#### BranchContext, ImageContext, AgentRuleContext
- Similar pattern following the static method approach
- Each handles their specific prompt generation and labeling

### 3. Simple Context Mapping 
**Location**: `packages/ai/src/contexts/index.ts`

Instead of a complex registry, use a simple mapping pattern:

```typescript
import { FileContext } from './classes/file-context';
import { HighlightContext } from './classes/highlight-context';
import { ErrorContext } from './classes/error-context';
// ... other imports

const CONTEXT_CLASSES = {
    [MessageContextType.FILE]: FileContext,
    [MessageContextType.HIGHLIGHT]: HighlightContext,
    [MessageContextType.ERROR]: ErrorContext,
    [MessageContextType.BRANCH]: BranchContext,
    [MessageContextType.IMAGE]: ImageContext,
    [MessageContextType.AGENT_RULE]: AgentRuleContext,
} as const;

export function getContextPrompt(context: MessageContext): string {
    const contextClass = CONTEXT_CLASSES[context.type];
    return contextClass.getPrompt(context as any);
}

export function getContextLabel(context: MessageContext): string {
    const contextClass = CONTEXT_CLASSES[context.type];
    return contextClass.getLabel(context as any);
}

// Direct exports for specific usage
export { FileContext, HighlightContext, ErrorContext, BranchContext, ImageContext, AgentRuleContext };
```

### 4. Migration Strategy

#### Phase 1: Base Architecture
1. Create base context class following tool pattern
2. Create concrete context implementations with static methods
3. Set up simple context mapping

#### Phase 2: Integration  
1. Move prompt generation logic from `provider.ts` into context classes
2. Update `provider.ts` functions to delegate to context classes
3. Maintain backward compatibility during transition

#### Phase 3: Adoption
1. Update `ChatContext` to use new context classes directly
2. Replace `provider.ts` function calls with direct context class usage
3. Clean up deprecated prompt formatting functions

### 5. Key Benefits

#### Consistency
- Unified API similar to existing tool architecture
- Consistent prompt formatting across context types
- Standard display and labeling patterns

#### Maintainability  
- Encapsulated prompt generation logic
- Easier to test individual context types
- Clear separation of concerns

#### Extensibility
- Simple to add new context types
- Direct static method pattern (no complex registry)
- Reusable context patterns following tool architecture

#### Compatibility
- Maintains existing data flow
- Preserves transferable object patterns
- Server/client compatibility maintained

## Implementation Notes

### Server/Client Considerations
- Context classes must work on both server and client
- Transferable objects remain plain data for serialization
- Static methods for utility functions that don't require instance state

## Testing Requirements

### Migrate Existing Tests
**Current Location**: `packages/ai/test/prompt/prompt.test.ts`

The existing tests need to be adapted for context classes:

#### 1. Extract Context-Specific Tests
Move these existing tests to individual context class test files:

**`packages/ai/test/contexts/file-context.test.ts`**:
```typescript
import { MessageContextType, type FileMessageContext } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import { FileContext } from '../../src/contexts/classes/file-context';

describe('FileContext', () => {
    test('should generate correct prompt format', () => {
        const context: FileMessageContext = {
            type: MessageContextType.FILE,
            path: 'test.txt',
            content: 'test',
            displayName: 'test.txt',
            branchId: 'test',
        };
        
        const prompt = FileContext.getPrompt(context);
        expect(prompt).toContain('<path>test.txt</path>');
        expect(prompt).toContain('<branch id="test" />');
        expect(prompt).toContain('```txt');
        expect(prompt).toContain('test');
    });
    
    test('should generate correct label', () => {
        const context: FileMessageContext = {
            type: MessageContextType.FILE,
            path: 'src/app/page.tsx',
            content: 'content',
            displayName: 'page.tsx',
            branchId: 'test',
        };
        
        expect(FileContext.getLabel(context)).toBe('page.tsx');
    });
});
```

**`packages/ai/test/contexts/highlight-context.test.ts`**:
```typescript
import { MessageContextType, type HighlightMessageContext } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import { HighlightContext } from '../../src/contexts/classes/highlight-context';

describe('HighlightContext', () => {
    test('should generate correct prompt format', () => {
        const context: HighlightMessageContext = {
            type: MessageContextType.HIGHLIGHT,
            path: 'test.txt',
            start: 1,
            end: 2,
            content: 'test',
            displayName: 'test.txt',
            branchId: 'test',
        };
        
        const prompt = HighlightContext.getPrompt(context);
        expect(prompt).toContain('<path>test.txt#L1:L2</path>');
        expect(prompt).toContain('```');
        expect(prompt).toContain('test');
    });
});
```

#### 2. Update Integration Tests
Keep the high-level integration tests in `prompt.test.ts` but update them to use context classes:

```typescript
// In prompt.test.ts - update getFilesContent test to verify it uses FileContext
test('File content should be the same', async () => {
    const fileContentPath = path.resolve(__dirname, './data/file.txt');
    
    // Test that getFilesContent still works (backward compatibility)
    const prompt = getFilesContent([...], [...]);
    
    // Test that it produces same result as direct context usage
    const contextPrompt = FileContext.getPrompt(fileContext);
    expect(prompt).toContain(contextPrompt);
    
    // Existing file comparison logic...
});
```

#### 3. New Context Class Tests
Create test files for all context classes:
- `packages/ai/test/contexts/file-context.test.ts`
- `packages/ai/test/contexts/highlight-context.test.ts`
- `packages/ai/test/contexts/error-context.test.ts`
- `packages/ai/test/contexts/branch-context.test.ts`
- `packages/ai/test/contexts/image-context.test.ts`
- `packages/ai/test/contexts/agent-rule-context.test.ts`

#### 4. Context Index Tests
**`packages/ai/test/contexts/index.test.ts`**:
```typescript
import { MessageContextType } from '@onlook/models';
import { describe, expect, test } from 'bun:test';
import { getContextPrompt, getContextLabel } from '../../src/contexts';

describe('Context Index', () => {
    test('should route to correct context class for prompts', () => {
        const fileContext = {
            type: MessageContextType.FILE,
            path: 'test.txt',
            content: 'test',
            displayName: 'test.txt',
            branchId: 'test',
        };
        
        const prompt = getContextPrompt(fileContext);
        expect(prompt).toContain('<path>test.txt</path>');
    });
});
```

### Migration Strategy for Tests
1. **Phase 1**: Create new context class test files
2. **Phase 2**: Extract relevant test logic from `prompt.test.ts`
3. **Phase 3**: Update integration tests to verify backward compatibility
4. **Phase 4**: Ensure all existing test data files still pass

## Directory Structure
```
packages/ai/src/contexts/
├── models/
│   └── base.ts
├── classes/
│   ├── file-context.ts
│   ├── highlight-context.ts
│   ├── error-context.ts
│   ├── branch-context.ts
│   ├── image-context.ts
│   └── agent-rule-context.ts
└── index.ts
```
