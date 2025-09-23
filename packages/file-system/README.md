# @onlook/file-system

Browser-based file system abstraction using ZenFS with IndexedDB storage.

## Features

### Basic Usage

```typescript
import { FileSystem } from '@onlook/file-system';

// Create a file system instance with a root directory
const fs = new FileSystem('/my-project');
await fs.initialize();

// Create files and directories
await fs.createFile('/src/index.js', 'console.log("Hello World");');
await fs.createDirectory('/src/components');

// Read files (auto-detects text files and returns a string in that case)
const content = await fs.readFile('/src/index.js');
console.log(content); // "console.log("Hello World");"

// List directory contents recursively
const files = await fs.readDirectory('/');
```

### React Hooks

```typescript
import { useFS, useFile, useDirectory } from '@onlook/file-system/hooks';

function FileExplorer() {
  const rootDir = '/my-project';
  const { entries, loading, error } = useDirectory(rootDir, '/');

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {entries.map(entry => (
        <li key={entry.path}>
          {entry.isDirectory ? '📁' : '📄'} {entry.name}
        </li>
      ))}
    </ul>
  );
}
```
