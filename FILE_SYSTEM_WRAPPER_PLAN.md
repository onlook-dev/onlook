# Code Editor API Plan

## Overview

This document outlines the plan for implementing the 4th component in our new syncing architecture - a unified code editing API that handles OID management, code formatting, and JSX element metadata indexing.

## Current Architecture

### Existing Components
1. **ZenFS/IndexedDB** (`packages/file-system/`) - Browser-based file system with IndexedDB backend
2. **Code Provider** (`packages/code-provider/`) - Abstract interface for sandbox providers (currently CodeSandbox)
3. **Sync Engine** (`apps/web/client/src/services/sync-engine/`) - Bidirectional sync between provider and local FS
4. **OID System** (`packages/parser/`) - Adds unique identifiers to JSX elements

### Current Flow
```
User Action → CodeManager → Generate Code → SandboxManager.writeFile() → Sync Engine → Provider
                                                    ↓
                                         TemplateNodeManager (separate process)
                                                    ↓
                                         Parse → Add OIDs → Format → Index
```

## Proposed Component: CodeEditorApi

### Purpose
Create a unified API for code editing operations that handles OID management, code formatting, and maintains the JSX element index, ensuring consistency across the application.

### Naming Updates
1. **Component Name**: `CodeEditorApi` instead of `FileSystemManager` - better reflects its role as an editing API
2. **Metadata Name**: `JsxElementMetadata` instead of `TemplateNode` - clearer about what it represents
3. **Include Code in Metadata**: No separate `getCodeBlock()` method needed - the code is part of the metadata

### Key Responsibilities
1. **OID Management** - Add, update, and validate OIDs during file operations
2. **Code Formatting** - Run Prettier on all code before writing
3. **Index Maintenance** - Keep template node map in sync with file changes
4. **Validation** - Ensure code integrity and OID uniqueness

### Architecture

```
Application Layer
    ↓
CodeEditorApi (new)
    ├── OID Processing
    ├── Code Formatting
    ├── Element Index
    └── Validation
    ↓
SandboxManager
    ↓
Sync Engine
    ↓
Provider (CodeSandbox)
```

### Core Interface

```typescript
interface CodeEditorApi {
  // File operations - simple boolean returns
  writeFile(path: string, content: string | Buffer | Uint8Array): Promise<boolean>;
  deleteFile(path: string): Promise<boolean>;
  renameFile(oldPath: string, newPath: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  
  
  // JSX element metadata access
  getJsxElementMetadata(oid: string): Promise<JsxElementMetadata | undefined>;
  getJsxElementMetadataForFile(path: string): Promise<Map<string, JsxElementMetadata>>; // (TODO(satya): Might only need internally)
}


// All the complex types are internal - not exposed to consumers
// OID processing, formatting, etc. happens automatically
// Binary files are auto-detected based on content/extension
```

### Implementation Details

#### 1. Write Pipeline
```
writeFile(path, content, options)
    ↓
Parse to AST
    ↓
Apply code changes (if provided)
    ↓
Process OIDs:
  - Add OIDs to elements without them
  - Validate existing OIDs
  - Handle branch-specific conflicts
    ↓
Format with Prettier
    ↓
Update JSX element metadata index
    ↓
Write to SandboxManager
    ↓
Return results
```

#### 2. OID Processing Rules
- Strip all existing OIDs on write (TODO(satya): look into the parser implementation and see if there's some considerations necessary there to avoid unnecessary diffs)
- Add fresh OIDs to all JSX elements
- Skip React Fragments
- No global tracking or branch validation needed
- Each sandbox has its own isolated OID namespace

#### 3. JSX Element Metadata Index Management
- Build index after OID processing
- Store mapping: OID → JsxElementMetadata (file path, line, column)
- Update index on file changes
- Clean up index on file deletion
- Handle file renames by updating paths

#### 4. Error Handling
- Invalid JSX syntax → Return original content with error
- OID conflicts → Generate new OIDs and log
- Prettier failures → Use unformatted content
- Index corruption → Rebuild from files

### Integration Points

#### 1. Replace Direct File Writes
```typescript
// Before
await sandboxManager.writeFile(path, content);

// After
await codeEditorApi.writeFile(path, content);
```

#### 2. Usage Examples
```typescript
// Simple file write (auto-detects binary vs text)
await codeEditorApi.writeFile('/src/image.png', imageBuffer);
await codeEditorApi.writeFile('/src/App.tsx', componentCode);

// Current CodeManager flow stays the same:
const codeDiffs = await processGroupedRequests(requests);
for (const diff of codeDiffs) {
  // Just use writeFile - no special diff handling needed
  await codeEditorApi.writeFile(diff.path, diff.generated);
}
```

#### 3. TemplateNodeManager Removal
- **Remove entirely** - No longer needed with file-based index
- Move OID processing logic to CodeEditorApi
- Index is just files in the sandbox - no separate manager needed
- No initialization or state management required

#### 4. Initial Setup
```typescript
// No initialization needed! 
// Index files are already in the sandbox via sync
// Just start using the API
```

### Benefits

1. **Dead Simple API** - Just `writeFile()` returns boolean, handles binary/text automatically
2. **LLM-Friendly Edits** - `applyEdit()` handles line/column based modifications
3. **Zero Configuration** - OID processing and formatting happen automatically
4. **No In-Memory State** - Index is just files, syncs automatically
5. **No TemplateNodeManager** - One less complex component to maintain
6. **Unified File Operations** - No need for separate image operations or binary handlers
7. **Drop-in Replacement** - Superset of current SandboxManager API

### Migration Plan

1. **Phase 1**: Create CodeEditorApi with basic file operations
2. **Phase 2**: Implement OID stripping/regeneration logic
3. **Phase 3**: Add file-based JSX element metadata index
4. **Phase 4**: Integrate with CodeManager (simple drop-in replacement)
5. **Phase 5**: Remove TemplateNodeManager entirely
6. **Phase 6**: Simplify parser to remove branch validation logic

### What Stays The Same

1. **InstanceId handling** - Remains in DOM/selection layer, not our concern
2. **CodeDiff generation** - CodeManager continues to generate diffs
3. **Undo/Redo** - Works without changes since CodeDiff stores complete files
4. **AST transformations** - Stay in parser package
5. **Action → CodeDiff flow** - Remains unchanged

### Key Simplifications

1. **No applyDiff() method** - Just use writeFile() directly
2. **No global OID validation** - Each sandbox is isolated
3. **No branch tracking** - OIDs are sandbox-specific
4. **No complex caching** - Start with simple file reads
5. **No TemplateNodeManager** - Everything moves to CodeEditorApi

### Open Questions

1. **Caching Strategy** - Should we cache parsed ASTs and element metadata?
2. **Event System** - Should CodeEditorApi emit events for index updates?
3. **Partial Updates** - How to efficiently handle small code changes without reprocessing entire files?
4. **Performance** - Should OID processing be done in a web worker?
5. **Prettier Config** - Where should formatting rules be defined?

### Index Storage Strategy

Since this is an LLM-powered editor where operations take 1-5+ seconds, we can use a simple file-based approach with no in-memory caching needed.

#### Sharded File-Based Approach
```typescript
class CodeEditorApi {
  // No in-memory index - just read/write files as needed
  
  async getJsxElementMetadata(oid: string): Promise<JsxElementMetadata | undefined> {
    const indexPath = this.getIndexPath(oid);
    try {
      const data = await sandboxManager.readFile(indexPath);
      return JSON.parse(data);
    } catch {
      return undefined;
    }
  }
  
  async setJsxElementMetadata(oid: string, metadata: JsxElementMetadata): Promise<void> {
    const indexPath = this.getIndexPath(oid);
    await sandboxManager.writeFile(indexPath, JSON.stringify(metadata, null, 2));
  }
  
  async removeJsxElementMetadata(oid: string): Promise<void> {
    const indexPath = this.getIndexPath(oid);
    await sandboxManager.deleteFile(indexPath);
  }
  
  private getIndexPath(oid: string): string {
    // Shard by first 2 chars of OID for better file system performance
    const shard = oid.slice(0, 2);
    return `/.onlook/oid-cache/${shard}/${oid}.json`;
  }
}
```

#### Why This Approach Works
- **Zero memory footprint** - No in-memory state to manage
- **IndexedDB speed is fine** - 1ms reads are negligible vs LLM processing time
- **Multiplayer for free** - Index syncs automatically through file system
- **Simple implementation** - Just file reads/writes
- **Scales well** - Sharding prevents too many files in one directory
- **No cache invalidation** - Always reading fresh data

#### File Structure
```
/.onlook/
  └── elements/
      ├── ab/
      │   ├── abc123def.json
      │   └── abd456ghi.json
      ├── cd/
      │   └── cde789jkl.json
      └── ... (up to 256 shards)
```
## Architecture Decision: Wrapper vs Separate Service

### Option 1: Light Wrapper Around FileSystem (Proposed)
```typescript
class CodeEditorApi extends FileSystem {
  constructor(basePath: string) {
    super(basePath);
  }
  
  // Override writeFile to add OID processing
  async writeFile(path: string, content: string | Buffer): Promise<boolean> {
    if (isJsxFile(path) && typeof content === 'string') {
      const processedContent = await this.processWithOids(content);
      return super.writeFile(path, processedContent);
    }
    return super.writeFile(path, content);
  }
  
  // New methods for JSX metadata
  async getJsxElementMetadata(oid: string): Promise<JsxElementMetadata | undefined> {
    // Uses this.readFile() internally
  }
}
```

**Pros:**
- Inherits all FileSystem functionality automatically
- Clear relationship - "CodeEditorApi IS A FileSystem with extras"
- Less code duplication
- Easy to maintain consistency

**Cons:**
- Tight coupling to FileSystem implementation
- Harder to mock/test in isolation
- May inherit unwanted behaviors

### Option 2: Separate Service with FileSystem Dependency
```typescript
class CodeEditorApi {
  constructor(private fs: FileSystem) {}
  
  async writeFile(path: string, content: string | Buffer): Promise<boolean> {
    if (isJsxFile(path) && typeof content === 'string') {
      content = await this.processWithOids(content);
    }
    return this.fs.writeFile(path, content);
  }
  
  // Delegate other methods
  async readFile(path: string): Promise<string> {
    return this.fs.readFile(path);
  }
}
```

**Pros:**
- Looser coupling (composition over inheritance)
- Easier to test with mock FileSystem
- Can selectively expose FileSystem methods
- More flexible for future changes

**Cons:**
- More boilerplate for delegation
- Need to explicitly forward each method

### Recommendation: Light Wrapper (Option 1)

Given that CodeEditorApi is conceptually "a FileSystem with code-aware features", inheritance makes sense here. The tight coupling is actually desirable because:
1. We want all FileSystem operations available
2. We're just adding side effects, not changing core behavior  
3. It clearly communicates the relationship

## Implementation Checklist

### Files to Create
1. **`/apps/web/client/src/services/code-editor-api/index.ts`** - The main CodeEditorApi class
2. **`/apps/web/client/src/services/code-editor-api/oid-processor.ts`** - Strip/add OID logic
3. **`/apps/web/client/src/services/code-editor-api/metadata-index.ts`** - File-based index management

### Files to Update
1. **`/apps/web/client/src/components/store/editor/code/index.ts`**
   - Change: `sandbox.writeFile()` → `codeEditorApi.writeFile()`
   - Remove: Direct template node lookups

2. **`/apps/web/client/src/components/store/editor/element/index.ts`**
   - Change: `templateNodes.getCodeBlock()` → `codeEditorApi.getJsxElementMetadata().code`

3. **`/apps/web/client/src/components/store/editor/copy/index.ts`**
   - Change: `templateNodes.getCodeBlock()` → `codeEditorApi.getJsxElementMetadata().code`

4. **`/apps/web/client/src/components/store/editor/chat/context.ts`**
   - Change: `templateNodes.getCodeBlock()` → `codeEditorApi.getJsxElementMetadata().code`

5. **`/apps/web/client/src/components/store/editor/ast/index.ts`**
   - Change: `templateNodes.getTemplateNode()` → `codeEditorApi.getJsxElementMetadata()`
   - Note: Can remove `getTemplateNodeChild()` logic initially

### Files to Simplify
1. **`/packages/parser/src/ids.ts`**
   - Remove: `shouldReplaceOid()`, `branchOidMap` parameter, global validation
   - Add: Simple `stripOids()` and `addFreshOids()` functions
   - Simplify: `addOidsToAst()` to not need branch/global params

### Files to Delete Entirely
1. **`/apps/web/client/src/components/store/editor/template-nodes/index.ts`** - Entire TemplateNodeManager
2. **`/apps/web/client/test/template-nodes/index.test.ts`** - TemplateNodeManager tests
3. **`/packages/parser/test/ids.test.ts`** - Complex OID validation tests (rewrite simpler ones)

### Store Cleanup
In **`/apps/web/client/src/components/store/editor/engine.ts`**:
- Remove: `templateNodes: TemplateNodeManager` property
- Remove: TemplateNodeManager initialization
- Add: `codeEditorApi: CodeEditorApi` property

### Other Integration Points
1. **Font Manager** (`/font/index.ts`) - Update to use CodeEditorApi.writeFile()
2. **Theme Manager** (`/theme/index.ts`) - Update to use CodeEditorApi.writeFile()
3. **Page Operations** (`/pages/helper.ts`) - Update to use CodeEditorApi.writeFile()
4. **Image Operations** - Can be deleted, just use CodeEditorApi.writeFile()

### Sync Engine Considerations
The current sync engine should continue to work since we're just replacing the write layer. However, we may need to ensure the `.onlook/` directory is included in sync patterns.

## Next Steps

1. Review and refine this plan
2. Decide on open questions
3. Create initial implementation
4. Write unit tests
5. Migrate existing code gradually