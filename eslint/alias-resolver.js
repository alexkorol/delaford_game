import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_EXTENSIONS = ['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.json', '.vue'];

function normalizeMap(mapEntries = []) {
  return [...mapEntries]
    .filter((entry) => Array.isArray(entry) && entry.length >= 2)
    .map(([alias, target]) => [alias, path.resolve(process.cwd(), target)])
    .sort((a, b) => b[0].length - a[0].length);
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function directoryExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function resolveFromBase(basePath, extensions) {
  const candidates = [basePath];
  for (const ext of extensions) {
    if (!basePath.endsWith(ext)) {
      candidates.push(`${basePath}${ext}`);
    }
  }

  for (const candidate of candidates) {
    if (fileExists(candidate)) {
      return candidate;
    }
  }

  if (directoryExists(basePath)) {
    for (const ext of extensions) {
      const indexCandidate = path.join(basePath, `index${ext}`);
      if (fileExists(indexCandidate)) {
        return indexCandidate;
      }
    }
  }

  return null;
}

export function createAliasResolver(defaultOptions = {}) {
  const baseOptions = {
    map: defaultOptions.map ?? [],
    extensions: defaultOptions.extensions ?? DEFAULT_EXTENSIONS,
  };

  return {
    interfaceVersion: 2,
    resolve(modulePath, sourceFile, options = {}) {
      const map = normalizeMap(options.map ?? baseOptions.map);
      const extensions = options.extensions ?? baseOptions.extensions;

      for (const [alias, target] of map) {
        if (modulePath === alias || modulePath.startsWith(`${alias}/`)) {
          const remainder = modulePath.slice(alias.length).replace(/^\//, '');
          const candidateBase = path.join(target, remainder);
          const resolved = resolveFromBase(candidateBase, extensions);
          if (resolved) {
            return { found: true, path: resolved };
          }
        }
      }

      return { found: false };
    },
  };
}
