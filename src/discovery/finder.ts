/**
 * Spec Finder - Discovers OpenAPI specs in a directory
 */

import { readdir, readFile, stat } from 'fs/promises';
import { join, extname } from 'path';
import yaml from 'yaml';

export interface DiscoveredSpec {
  path: string;
  format: 'openapi3' | 'openapi2' | 'swagger';
  version: string;
  title: string;
}

export interface DiscoveryOptions {
  /** Skip these directory names */
  skipDirs?: string[];
  /** Max depth to recurse (default: 10) */
  maxDepth?: number;
  /** Include specs in node_modules (default: false) */
  includeNodeModules?: boolean;
}

const DEFAULT_SKIP_DIRS = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  '.nyc_output',
  '__pycache__',
  '.pytest_cache',
  'venv',
  '.venv',
  'vendor',
  '.idea',
  '.vscode',
];

/**
 * Find all OpenAPI/Swagger specs in a directory
 */
export async function findSpecs(
  directory: string,
  options: DiscoveryOptions = {}
): Promise<DiscoveredSpec[]> {
  const skipDirs = options.skipDirs || DEFAULT_SKIP_DIRS;
  const maxDepth = options.maxDepth ?? 10;
  const includeNodeModules = options.includeNodeModules ?? false;

  if (!includeNodeModules && !skipDirs.includes('node_modules')) {
    skipDirs.push('node_modules');
  }

  const specs: DiscoveredSpec[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      // Permission denied or other error - skip this directory
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (skipDirs.includes(entry.name)) continue;
        await walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        // Check if it's a potential spec file
        const ext = extname(entry.name).toLowerCase();
        if (ext === '.yaml' || ext === '.yml' || ext === '.json') {
          const spec = await tryParseSpec(fullPath);
          if (spec) {
            specs.push(spec);
          }
        }
      }
    }
  }

  await walk(directory, 0);
  return specs;
}

/**
 * Try to parse a file as an OpenAPI spec
 */
async function tryParseSpec(filePath: string): Promise<DiscoveredSpec | null> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const ext = extname(filePath).toLowerCase();

    let parsed: unknown;
    try {
      if (ext === '.json') {
        parsed = JSON.parse(content);
      } else {
        parsed = yaml.parse(content);
      }
    } catch {
      // Not valid JSON/YAML
      return null;
    }

    if (!parsed || typeof parsed !== 'object') return null;

    const doc = parsed as Record<string, unknown>;

    // Check for OpenAPI 3.x
    if (typeof doc.openapi === 'string' && doc.openapi.startsWith('3.')) {
      const info = doc.info as Record<string, unknown> | undefined;
      return {
        path: filePath,
        format: 'openapi3',
        version: doc.openapi,
        title: (info?.title as string) || 'Untitled API',
      };
    }

    // Check for Swagger 2.0 (OpenAPI 2.x)
    if (doc.swagger === '2.0') {
      const info = doc.info as Record<string, unknown> | undefined;
      return {
        path: filePath,
        format: 'openapi2',
        version: '2.0',
        title: (info?.title as string) || 'Untitled API',
      };
    }

    // Check for older Swagger
    if (typeof doc.swagger === 'string') {
      const info = doc.info as Record<string, unknown> | undefined;
      return {
        path: filePath,
        format: 'swagger',
        version: doc.swagger,
        title: (info?.title as string) || 'Untitled API',
      };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Find documentation files in a directory
 */
export async function findDocs(directory: string): Promise<string[]> {
  const docPatterns = [
    'README.md',
    'readme.md',
    'API.md',
    'api.md',
    'DOCS.md',
    'docs.md',
    'docs/README.md',
    'docs/index.md',
    'documentation/README.md',
  ];

  const found: string[] = [];

  for (const pattern of docPatterns) {
    const fullPath = join(directory, pattern);
    try {
      const stats = await stat(fullPath);
      if (stats.isFile()) {
        found.push(fullPath);
      }
    } catch {
      // File doesn't exist
    }
  }

  // Also look for docs/ directory
  const docsDir = join(directory, 'docs');
  try {
    const stats = await stat(docsDir);
    if (stats.isDirectory()) {
      const entries = await readdir(docsDir);
      for (const entry of entries) {
        if (entry.endsWith('.md')) {
          found.push(join(docsDir, entry));
        }
      }
    }
  } catch {
    // docs/ doesn't exist
  }

  return found;
}
