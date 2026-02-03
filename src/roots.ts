import { log } from "./logger.js";

// ============================================================================
// MCP Roots Management
// ============================================================================

export interface Root {
  uri: string;
  name?: string;
}

interface RootsState {
  roots: Root[];
  initialized: boolean;
  supported: boolean;
}

const state: RootsState = {
  roots: [],
  initialized: false,
  supported: false,
};

// ============================================================================
// Roots Initialization
// ============================================================================

export async function initializeRoots(
  listRootsFn: () => Promise<{ roots: Root[] }>
): Promise<void> {
  try {
    const result = await listRootsFn();
    state.roots = result.roots || [];
    state.supported = true;
    state.initialized = true;
    log(
      "info",
      `Roots initialized: ${state.roots.length} root(s)`,
      state.roots.map((r) => r.uri)
    );
  } catch (error: unknown) {
    state.supported = false;
    state.initialized = true;
    log("info", "Client does not support roots capability - operating without root restrictions");
  }
}

export async function handleRootsChanged(
  listRootsFn: () => Promise<{ roots: Root[] }>
): Promise<void> {
  if (!state.supported) return;

  try {
    const result = await listRootsFn();
    state.roots = result.roots || [];
    log(
      "info",
      `Roots updated: ${state.roots.length} root(s)`,
      state.roots.map((r) => r.uri)
    );
  } catch (error) {
    log("warning", "Failed to refresh roots after change notification");
  }
}

// ============================================================================
// Path Validation Against Roots
// ============================================================================

function uriToPath(uri: string): string {
  if (!uri.startsWith("file://")) {
    return uri;
  }

  const FILE_SCHEME_LENGTH = 7;
  let path = uri.slice(FILE_SCHEME_LENGTH);

  const isWindowsPath = /^\/[A-Za-z]:/.test(path);
  if (isWindowsPath) {
    path = path.slice(1);
  }

  return path.replace(/\\/g, "/");
}

function normalizePath(path: string): string {
  let normalized = path.replace(/\\/g, "/");

  const hasTrailingSlash = normalized.endsWith("/") && normalized.length > 1;
  if (hasTrailingSlash) {
    normalized = normalized.slice(0, -1);
  }

  const isWindowsPath = process.platform === "win32" || normalized.match(/^[A-Za-z]:/);
  if (isWindowsPath) {
    normalized = normalized.toLowerCase();
  }

  return normalized;
}

export function isPathWithinRoots(path: string): boolean {
  if (!state.initialized || !state.supported) {
    return true;
  }

  if (state.roots.length === 0) {
    return true;
  }

  const normalizedPath = normalizePath(path);

  for (const root of state.roots) {
    const rootPath = normalizePath(uriToPath(root.uri));
    const isExactMatch = normalizedPath === rootPath;
    const isWithinRoot = normalizedPath.startsWith(rootPath + "/");

    if (isExactMatch || isWithinRoot) {
      return true;
    }
  }

  log("warning", `Path outside roots: ${path}`, {
    roots: state.roots.map((r) => r.uri),
  });

  return false;
}

export function getRoots(): Root[] {
  return [...state.roots];
}

export function hasRoots(): boolean {
  return state.supported && state.roots.length > 0;
}

export function getRootsState(): {
  initialized: boolean;
  supported: boolean;
  count: number;
} {
  return {
    initialized: state.initialized,
    supported: state.supported,
    count: state.roots.length,
  };
}
