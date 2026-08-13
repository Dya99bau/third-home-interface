import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

const ROOT = process.argv[2];
const exts = new Set(['.html', '.css', '.js']);
const refRe = /(?:src|href)\s*=\s*["']([^"'#?]+)["']|url\(\s*["']?([^"')?]+)["']?\s*\)|from\s+["'](\.[^"']+)["']|import\(\s*["'](\.[^"']+)["']\s*\)/g;

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

function dirCaseSensitiveListing(dir) {
  try { return readdirSync(dir); } catch { return null; }
}

const allFiles = walk(ROOT);
const scanFiles = allFiles.filter((f) => exts.has(path.extname(f)));

let issues = 0;
for (const file of scanFiles) {
  const text = readFileSync(file, 'utf-8');
  let m;
  refRe.lastIndex = 0;
  while ((m = refRe.exec(text))) {
    const ref = m[1] || m[2] || m[3] || m[4];
    if (!ref) continue;
    if (/^(https?:)?\/\//.test(ref) || ref.startsWith('data:') || ref.startsWith('mailto:')) continue;
    let refPath = ref.split('?')[0].split('#')[0];
    if (!refPath) continue;
    const baseDir = refPath.startsWith('/') ? ROOT : path.dirname(file);
    const cleanRef = refPath.startsWith('/') ? refPath.slice(1) : refPath;
    const parts = cleanRef.split('/').filter((p) => p && p !== '.');
    let cur = refPath.startsWith('/') ? ROOT : baseDir;
    let ok = true;
    for (const part of parts) {
      if (part === '..') { cur = path.dirname(cur); continue; }
      const listing = dirCaseSensitiveListing(cur);
      if (listing === null) { ok = null; break; }
      if (!listing.includes(part)) {
        const ciMatch = listing.find((l) => l.toLowerCase() === part.toLowerCase());
        console.log(`[CASE MISMATCH] in ${path.relative(ROOT, file)}: "${ref}" -> "${part}" not found` + (ciMatch ? ` (disk has "${ciMatch}")` : ' (no case-insensitive match either — broken link)'));
        issues++;
        ok = false;
        break;
      }
      cur = path.join(cur, part);
    }
  }
}
console.log(issues === 0 ? 'No case mismatches found.' : `${issues} issue(s) found.`);
