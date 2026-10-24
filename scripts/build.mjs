// Builds every app and assembles one static site in ./dist (GitHub Pages layout):
//   dist/            -> apps/hub
//   dist/exam/       -> apps/exam (frontend only; its API is deployed separately) — ONLY when INCLUDE_EXAM=1
// HUB_BASE = URL prefix the site is served under. "/<repo>/" for a GitHub project page, "/" for a custom domain.
// INCLUDE_EXAM=1 publishes the exam app and turns its tile on in the Hub. Leave it unset until exam login works.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
let base = process.env.HUB_BASE ?? '/dentenplay-hub/';
if (!base.startsWith('/')) base = `/${base}`;
if (!base.endsWith('/')) base += '/';

const includeExam = process.env.INCLUDE_EXAM === '1';
const env = {
  ...process.env,
  HUB_BASE: base,
  EXAM_BASE: `${base}exam/`,
  VITE_INCLUDE_EXAM: includeExam ? '1' : '0',
};
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit', env });

run('npm run build -w apps/hub');
if (includeExam) run('npm run build -w apps/exam');

const dist = resolve(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(resolve(root, 'apps/hub/dist'), dist, { recursive: true });
if (includeExam) cpSync(resolve(root, 'apps/exam/dist'), resolve(dist, 'exam'), { recursive: true });

// GitHub Pages serves only the root 404.html for unknown paths. Send deep links of the exam SPA
// back to /exam/?r=<route>; the exam's index.html restores the real URL (see apps/exam/index.html).
const notFound = `<!doctype html>
<html lang="th"><head><meta charset="utf-8"><title>Redirecting…</title>
<script>
  (function () {
    var base = ${JSON.stringify(base)};
    var p = location.pathname;
    if (${includeExam} && p.indexOf(base + 'exam/') === 0) {
      var sub = p.slice((base + 'exam').length);
      location.replace(base + 'exam/?r=' + encodeURIComponent(sub + location.search + location.hash));
      return;
    }
    location.replace(base);
  })();
</script></head><body></body></html>
`;
writeFileSync(resolve(dist, '404.html'), notFound);
writeFileSync(resolve(dist, '.nojekyll'), '');

for (const f of ['index.html', '404.html', ...(includeExam ? ['exam/index.html'] : [])]) {
  if (!existsSync(resolve(dist, f))) throw new Error(`missing in dist: ${f}`);
}
console.log(`\nBuilt site for base ${base} -> ${dist} (exam ${includeExam ? 'included' : 'NOT included'})`);
