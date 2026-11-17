export interface TreeRow {
  /** The worktree-relative path: a folder's own path, or the file's. */
  path: string;
  /** What the row reads as. A chain of single-child folders shares one row, so this can be `src/components/ui`. */
  label: string;
  depth: number;
  kind: 'folder' | 'file';
  /** Folders only. */
  isOpen?: boolean;
}

interface Node {
  name: string;
  path: string;
  children: Map<string, Node>;
  isFile: boolean;
}

function emptyNode(name: string, path: string): Node {
  return { name, path, children: new Map(), isFile: false };
}

function build(paths: readonly string[]): Node {
  const root = emptyNode('', '');
  for (const path of paths) {
    let at = root;
    const parts = path.split('/');
    parts.forEach((part, index) => {
      const full = parts.slice(0, index + 1).join('/');
      let next = at.children.get(part);
      if (next === undefined) {
        next = emptyNode(part, full);
        at.children.set(part, next);
      }
      at = next;
      if (index === parts.length - 1) at.isFile = true;
    });
  }
  return root;
}

/** Folders before files, each alphabetical: the shape a reader scans. */
function ordered(node: Node): Node[] {
  return [...node.children.values()].sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
}

/** A folder holding only one folder shares its row, so `src/components/ui` is one line rather than three. */
function collapse(node: Node): { label: string; node: Node } {
  let at = node;
  let label = node.name;
  for (;;) {
    const children = [...at.children.values()];
    const only = children[0];
    if (children.length !== 1 || only === undefined || only.isFile) return { label, node: at };
    label = `${label}/${only.name}`;
    at = only;
  }
}

/** Every folder on the way to a path, so the tree opens to where the designer is. */
export function foldersTo(path: string | null): string[] {
  if (path === null || path === '') return [];
  const parts = path.split('/');
  const open: string[] = [];
  for (let index = 1; index < parts.length; index += 1) open.push(parts.slice(0, index).join('/'));
  return open;
}

export interface TreeOptions {
  /** The file whose folders are open whether or not the designer opened them. */
  openPath?: string | null;
  // An explicit collapse outranks the active file's ancestors (ONL-2563).
  overrides?: ReadonlyMap<string, boolean>;
  /** A search opens everything, so a match is never behind a closed folder. */
  isExpandedAll?: boolean;
}

export function treeRows(paths: readonly string[], options: TreeOptions = {}): TreeRow[] {
  const { openPath = null, overrides, isExpandedAll = false } = options;
  const onPath = new Set(foldersTo(openPath));

  const rows: TreeRow[] = [];
  const walk = (node: Node, depth: number): void => {
    for (const child of ordered(node)) {
      if (child.isFile) {
        rows.push({ path: child.path, label: child.name, depth, kind: 'file' });
        continue;
      }
      const { label, node: folder } = collapse(child);
      const decided = overrides?.get(folder.path);
      const isOpen = decided ?? (isExpandedAll || onPath.has(folder.path));
      rows.push({ path: folder.path, label, depth, kind: 'folder', isOpen });
      if (isOpen) walk(folder, depth + 1);
    }
  };
  walk(build(paths), 0);
  return rows;
}
