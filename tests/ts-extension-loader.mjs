import { access } from "node:fs/promises";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
const extensions = [".ts", ".tsx"];
const resolvedExtensions = [".js", ".mjs", ".cjs", ".json", ".ts", ".tsx"];

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function resolveWithTsExtension(basePath) {
  if (resolvedExtensions.some((extension) => basePath.endsWith(extension))) return null;
  for (const extension of extensions) {
    const candidate = `${basePath}${extension}`;
    if (await exists(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = await resolveWithTsExtension(resolvePath(root, "src", specifier.slice(2)));
    if (resolved) return nextResolve(resolved, context);
  }

  if (specifier.startsWith(".")) {
    const parentPath = fileURLToPath(context.parentURL);
    const resolved = await resolveWithTsExtension(resolvePath(dirname(parentPath), specifier));
    if (resolved) return nextResolve(resolved, context);
  }

  return nextResolve(specifier, context);
}
