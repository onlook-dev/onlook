# @onlook/file-system

Browser-based file system abstraction using ZenFS with IndexedDB storage.

## Features

- 🗂️ **Virtual file system** - Complete file system API in the browser
- 💾 **Persistent storage** - Files are stored in IndexedDB
- 📁 **Recursive operations** - Built-in recursive directory operations
- 👀 **File watching** - Real-time file and directory change notifications
- 🔧 **Opinionated API** - Simple, intuitive methods for common operations
- ⚛️ **React hooks** - Ready-to-use React hooks for file operations

## Installation

```bash
bun add @onlook/file-system
```

## Usage

### Basic Usage

```typescript
import { FileSystem } from '@onlook/file-system';

// Create a file system instance with a root directory
const fs = new FileSystem('/my-project');
await fs.initialize();

// Create files and directories
await fs.createFile('/src/index.js', 'console.log("Hello World");');
await fs.createDirectory('/src/components');

// Read files (auto-detects text files)
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

## API

### FileSystem Class

#### Constructor

```typescript
new FileSystem(rootDir: string)
```

Creates a new file system instance with the specified root directory.

#### Methods

- `initialize()` - Initialize the file system
- `createFile(path, content)` - Create a new file
- `readFile(path)` - Read a file (auto-detects text encoding)
- `writeFile(path, content)` - Write/update a file
- `deleteFile(path)` - Delete a file
- `createDirectory(path)` - Create a directory (recursive)
- `readDirectory(path)` - Read directory contents (recursive)
- `deleteDirectory(path)` - Delete a directory (recursive)
- `exists(path)` - Check if file/directory exists
- `watchFile(path, callback)` - Watch a file for changes
- `watchDirectory(path, callback)` - Watch a directory recursively

### React Hooks

- `useFS(rootDir)` - Get a file system instance
- `useFile(rootDir, path)` - Read and watch a file
- `useDirectory(rootDir, path)` - Read and watch a directory

## License

Apache-2.0
