# Sync Engine Rewrite Plan

## Overview

Rewrite Onlook's sync engine to use CodeSandbox as the source of truth with a local file system abstraction layer using ZenFS. This decouples the application from CodeSandbox and enables better multiplayer support.

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Application   │────────▶│   Local FS      │◀───────▶│   Sync Engine   │
│   (UI/Tools)    │  R/W    │   (ZenFS)       │  Watch  │                 │
└─────────────────┘         └─────────────────┘         └────────┬────────┘
                                     ▲                            │
                                     │                            │
                                     └────────────────────────────┤
                                              Watch               │ Sync
                                                                 ▼
                                                      ┌─────────────────┐
                                                      │   CodeSandbox   │
                                                      │      (SOT)      │
                                                      └─────────────────┘
```

## Implementation Plan

### 1. Set up ZenFS Infrastructure

**Goal**: Create a local file system abstraction using ZenFS with IndexedDB backend.

```typescript
// services/local-fs/zenfs-wrapper.ts
class ZenFSWrapper {
  private fs: ZenFS;
  
  async initialize(projectId: string, branchId: string) {
    this.fs = await createZenFS({
      backend: 'indexeddb',
      storeName: `onlook-zenfs-${projectId}-${branchId}`
    });
  }
  
  // Implement core FS operations
  async readFile(path: string): Promise<string | Buffer>
  async writeFile(path: string, content: string | Buffer): Promise<void>
  async readdir(path: string): Promise<string[]>
  async mkdir(path: string): Promise<void>
  async unlink(path: string): Promise<void>
  async rename(oldPath: string, newPath: string): Promise<void>
  async stat(path: string): Promise<Stats>
  watch(path: string, options: WatchOptions, callback: WatchCallback): Watcher
}
```

### 2. Create Observable Hooks

**Goal**: Provide React hooks for observing file system changes.

```typescript
// hooks/useFileSystem.ts
export function useFile(path: string) {
  const [content, setContent] = useState<string | null>(null);
  const { localFS } = useFileSystem();
  
  useEffect(() => {
    localFS.readFile(path).then(setContent);
    const watcher = localFS.watch(path, () => {
      localFS.readFile(path).then(setContent);
    });
    return () => watcher.close();
  }, [path, localFS]);
  
  return { content, loading: !content };
}

export function useDirectory(path: string): FileEntry[]
export function useOnlookIndex(): OnlookIndex | null
export function useFileSystem(): { localFS: OnlookFileSystem }
```

### 3. Initial Sync from CodeSandbox

**Goal**: Pull all files from CodeSandbox to populate local FS on startup.

```typescript
async function initializeProject(sandbox: CodeSandboxProvider, localFS: OnlookFileSystem) {
  // 1. Detect router type
  const routerType = await detectRouterType(sandbox);
  
  // 2. Pull all files
  const files = await sandbox.listFilesRecursively('/');
  
  // 3. Write to local FS (triggers OID processing)
  for (const file of files) {
    const content = await sandbox.readFile(file.path);
    await localFS.writeFile(file.path, content);
  }
}
```

### 4. Implement OID Processing Layer

**Goal**: Add data-oid attributes to JSX elements before writing files.

```typescript
// services/local-fs/onlook-fs.ts
class OnlookFileSystem extends ZenFSWrapper {
  private templateNodeManager: TemplateNodeManager;
  private branchId: string;
  private routerType: RouterType;
  
  async writeFile(path: string, content: string | Buffer) {
    let finalContent = content;
    
    // Process text JSX files for OIDs
    if (typeof content === 'string' && isJsxFile(path)) {
      const { newContent, templateNodes } = await this.templateNodeManager.processFileForMapping(
        this.branchId,
        path,
        content,
        this.routerType
      );
      finalContent = newContent;
      
      // Update index
      await this.updateIndex(path, templateNodes);
    }
    
    return super.writeFile(path, finalContent);
  }
}
```

### 5. Two-Way Sync Engine

**Goal**: Keep local FS and CodeSandbox in sync.

```typescript
// services/sync-engine.ts
class SyncEngine {
  private localFS: OnlookFileSystem;
  private remote: CodeSandboxProvider;
  private syncInProgress = new Set<string>();
  
  start() {
    // Watch local changes
    this.localFS.watch('/', { 
      recursive: true,
      exclude: ['.onlook/**']
    }, (event) => {
      if (!this.isSyncEvent(event)) {
        this.syncToRemote(event);
      }
    });
    
    // Watch remote changes
    this.remote.watchFiles({
      onFileChange: (event) => {
        this.syncToLocal(event);
      }
    });
  }
  
  private async syncToRemote(event: WatchEvent) {
    for (const path of event.paths) {
      this.syncInProgress.add(path);
      try {
        const content = await this.localFS.readFile(path);
        await this.remote.writeFile(path, content);
      } finally {
        setTimeout(() => this.syncInProgress.delete(path), 100);
      }
    }
  }
  
  private async syncToLocal(event: WatchEvent) {
    for (const path of event.paths) {
      if (this.syncInProgress.has(path)) continue;
      
      const content = await this.remote.readFile(path);
      await this.localFS.writeFile(path, content);
    }
  }
}
```

### 6. Index Management

**Goal**: Maintain OID index in `.onlook/index.json` for fast element lookups.

```typescript
// types/index.ts
interface OnlookIndex {
  version: string;
  lastUpdated: string;
  oids: Record<string, TemplateNode>;
  fileToOids: Record<string, string[]>;
}

// In OnlookFileSystem
private async updateIndex(filePath: string, templateNodes: Map<string, TemplateNode>) {
  // Update in-memory index
  const oldOids = this.currentIndex.fileToOids[filePath] || [];
  oldOids.forEach(oid => delete this.currentIndex.oids[oid]);
  
  const newOids: string[] = [];
  templateNodes.forEach((node, oid) => {
    this.currentIndex.oids[oid] = node;
    newOids.push(oid);
  });
  
  this.currentIndex.fileToOids[filePath] = newOids;
  this.currentIndex.lastUpdated = new Date().toISOString();
  
  // Persist to file
  await this.fs.writeFile('/.onlook/index.json', JSON.stringify(this.currentIndex, null, 2));
}

// Fast lookup
findElement(oid: string): TemplateNode | null {
  return this.currentIndex.oids[oid] || null;
}
```

### 7. Testing Suite

**Goal**: Ensure reliability of the new sync engine.

- **File Operations**: Create, read, update, delete files
- **Directory Operations**: Create, list, delete directories
- **OID Processing**: Verify OIDs are added correctly
- **Index Consistency**: Ensure index stays in sync with files
- **Sync Scenarios**: Test local→remote and remote→local sync
- **Conflict Handling**: Test concurrent edits
- **Edge Cases**: Binary files, empty files, special characters

### 8. Migration & Cleanup

**Goal**: Replace current system with new implementation.

1. **No data migration needed** - Fresh sync from CodeSandbox
2. **Update imports** - Replace SandboxManager usage with new hooks
3. **Remove old code**:
   - `FileSyncManager`
   - `FileCacheManager`
   - Old file handling in `SandboxManager`

### 9. Error Handling & Recovery

**Goal**: Handle failures gracefully.

```typescript
class SyncEngine {
  private retryQueue = new Map<string, number>();
  
  private async syncWithRetry(path: string, operation: () => Promise<void>) {
    try {
      await operation();
      this.retryQueue.delete(path);
    } catch (error) {
      const retries = this.retryQueue.get(path) || 0;
      if (retries < 3) {
        this.retryQueue.set(path, retries + 1);
        setTimeout(() => this.syncWithRetry(path, operation), 1000 * Math.pow(2, retries));
      } else {
        console.error(`Sync failed for ${path} after 3 retries`, error);
        this.notifyUser(`Failed to sync ${path}`);
      }
    }
  }
}
```

## API Compatibility

Ensure new system maintains compatibility with existing code:

```typescript
// Match existing return types
interface SandboxFile {
  type: 'text' | 'binary';
  path: string;
  content: string | Uint8Array;
}

// Keep same method signatures
async readFile(path: string): Promise<SandboxFile | null>
async writeFile(path: string, content: string): Promise<boolean>
```

## Success Criteria

1. ✅ All UI components work without modification
2. ✅ Files sync bidirectionally without conflicts
3. ✅ OIDs are consistently applied to all JSX elements
4. ✅ Element selection works via OID lookup
5. ✅ Performance is equal or better than current system
6. ✅ Works offline (reads from local FS)
7. ✅ Handles large projects (100+ files)

## Timeline

- Phase 1 (Week 1): ZenFS setup, hooks, basic read/write
- Phase 2 (Week 2): OID processing, index management
- Phase 3 (Week 3): Sync engine, conflict resolution
- Phase 4 (Week 4): Testing, migration, cleanup

## Open Questions

1. Should we implement conflict resolution UI for sync conflicts?
2. Do we need file locking for multiplayer scenarios?
3. Should `.onlook` folder be synced to CodeSandbox or kept local only?

## Future Enhancements

- Offline mode with full editing capabilities
- Diff-based sync for better performance
- CRDT-based conflict resolution for true multiplayer
- Incremental index updates for large projects