export type FileNode = {
  name: string;
  /** Path relative to the folder root, `/` separated. */
  path: string;
  isDirectory: boolean;
  children: FileNode[];
};

export type VisibleRow = {
  name: string;
  path: string;
  depth: number;
  isDirectory: boolean;
  expanded: boolean;
};

export type Expansion = Record<string, boolean>;

/**
 * Turns the flat list returned by the backend into a sorted hierarchy.
 * Directories come before files, both in case-insensitive name order.
 */
export function buildFileTree(paths: string[]): FileNode[] {
  const roots: FileNode[] = [];
  const directories = new Map<string, FileNode>();
  const children = new Map<string, Map<string, FileNode>>();
  children.set("", new Map());

  function siblingsOf(parentPath: string): Map<string, FileNode> {
    let siblings = children.get(parentPath);

    if (!siblings) {
      siblings = new Map();
      children.set(parentPath, siblings);
    }

    return siblings;
  }

  for (const path of paths) {
    const segments = path.split("/").filter(Boolean);
    let parentPath = "";

    segments.forEach((segment, index) => {
      const isDirectory = index < segments.length - 1;
      const siblings = siblingsOf(parentPath);
      const key = `${isDirectory ? "d" : "f"}:${segment}`;

      let node = siblings.get(key);

      if (!node) {
        const nodePath = parentPath ? `${parentPath}/${segment}` : segment;
        node = { name: segment, path: nodePath, isDirectory, children: [] };
        siblings.set(key, node);

        const parent = parentPath ? directories.get(parentPath) : undefined;
        (parent ? parent.children : roots).push(node);

        if (isDirectory) {
          directories.set(nodePath, node);
        }
      }

      parentPath = node.path;
    });
  }

  sortNodes(roots);

  return roots;
}

function sortNodes(nodes: FileNode[]): void {
  nodes.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }

    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  for (const node of nodes) {
    sortNodes(node.children);
  }
}

/** Collapses the tree into the rows that should currently be visible. */
export function flattenVisible(nodes: FileNode[], expanded: Expansion): VisibleRow[] {
  const rows: VisibleRow[] = [];

  function visit(list: FileNode[], depth: number) {
    for (const node of list) {
      const isExpanded = node.isDirectory && expanded[node.path] === true;

      rows.push({
        name: node.name,
        path: node.path,
        depth,
        isDirectory: node.isDirectory,
        expanded: isExpanded,
      });

      if (isExpanded) {
        visit(node.children, depth + 1);
      }
    }
  }

  visit(nodes, 0);

  return rows;
}

/** Every directory path leading to a file, outermost first. */
export function ancestorsOf(path: string): string[] {
  const segments = path.split("/").filter(Boolean);

  return segments
    .slice(0, -1)
    .map((_, index) => segments.slice(0, index + 1).join("/"));
}

/**
 * Returns the expansion with the ancestors of a path expanded. The original
 * object is returned untouched when there is nothing to expand, so callers can
 * compare references to avoid redundant updates.
 */
export function withAncestorsExpanded(expansion: Expansion, path: string): Expansion {
  let changed = false;
  const next: Expansion = { ...expansion };

  for (const ancestor of ancestorsOf(path)) {
    if (next[ancestor] !== true) {
      next[ancestor] = true;
      changed = true;
    }
  }

  return changed ? next : expansion;
}
