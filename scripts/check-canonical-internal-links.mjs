import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, '..');
const skippedDirectories = new Set([
  '.git',
  '.codex_tmp',
  'applications',
  'node_modules',
  'output',
  'tools',
  'work',
]);
const htmlFiles = [];

async function visit(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skippedDirectories.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      htmlFiles.push(fullPath);
    }
  }
}

await visit(root);

const failures = [];
let checkedLinks = 0;

for (const filePath of htmlFiles) {
  const relativeFile = path.relative(root, filePath).replaceAll('\\', '/');
  const content = await fs.readFile(filePath, 'utf8');

  for (const match of content.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)) {
    const href = match[1];
    if (/^(?:https?:|mailto:|tel:|javascript:|#)/i.test(href)) continue;
    checkedLinks += 1;

    const hrefPath = href.split(/[?#]/, 1)[0];
    if (hrefPath.endsWith('.html')) {
      failures.push(`${relativeFile}: extension-bearing internal link ${href}`);
      continue;
    }

    if (!hrefPath.startsWith('/')) {
      failures.push(`${relativeFile}: non-canonical relative link ${href}`);
      continue;
    }

    if (!hrefPath || hrefPath === '/') continue;
    const sourcePath = path.join(root, `${hrefPath.slice(1)}.html`);
    try {
      const stats = await fs.stat(sourcePath);
      if (!stats.isFile()) failures.push(`${relativeFile}: missing target ${hrefPath}`);
    } catch {
      failures.push(`${relativeFile}: missing target ${hrefPath}`);
    }
  }
}

const script = await fs.readFile(path.join(root, 'script.js'), 'utf8');
if (/['"`]\.\.?\/[^'"`]*\.html/.test(script) || /['"`][a-z0-9/_-]+\.html/i.test(script)) {
  failures.push('script.js: extension-bearing internal URL');
}

const robots = await fs.readFile(path.join(root, 'robots.txt'), 'utf8');
if (!/^Disallow: \/admin$/m.test(robots)) {
  failures.push('robots.txt: clean admin route /admin is not disallowed');
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`Canonical internal-link check passed for ${checkedLinks} links across ${htmlFiles.length} HTML files.`);
