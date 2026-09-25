// Renders the certificate background and laurel PNGs used by CertificatesService.
// Usage (from apps/backend): node certificate-template/build.mjs
// Needs chrome-headless-shell: set CHROME_BIN, or it falls back to the Playwright cache.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const assets = resolve(here, '../src/certificates/assets');

function findChrome() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  const cache = join(homedir(), '.cache/ms-playwright');
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache).filter((d) => d.startsWith('chromium_headless_shell-'))) {
      const bin = join(cache, dir, 'chrome-headless-shell-linux64/chrome-headless-shell');
      if (existsSync(bin)) return bin;
    }
  }
  throw new Error('Chrome not found; set CHROME_BIN');
}

const chrome = findChrome();
const work = join(tmpdir(), 'lexassess-cert-build');
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

function shoot(page, out, width, height, scale, transparent, hash = '') {
  execFileSync(chrome, [
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    `--user-data-dir=${join(work, 'profile')}`,
    `--window-size=${width},${height}`,
    `--force-device-scale-factor=${scale}`,
    '--virtual-time-budget=4000',
    ...(transparent ? ['--default-background-color=00000000'] : []),
    `--screenshot=${out}`,
    pathToFileURL(join(here, page)).href + hash,
  ], { stdio: 'inherit', timeout: 90_000 });
}

// Background: 1400x990 design px at 2.5x = 3500x2475.
const bgPng = join(work, 'bg.png');
shoot('certificate-template.html', bgPng, 1400, 990, 2.5, false);

// Laurels (transparent), 641x289 at 2x.
shoot('laurel.html', join(assets, 'laurel-left.png'), 641, 289, 2, true);
shoot('laurel.html', join(assets, 'laurel-right.png'), 641, 289, 2, true, '#right');

execFileSync('python3', [
  '-c',
  `from PIL import Image; Image.open(${JSON.stringify(bgPng)}).convert('RGB').save(${JSON.stringify(
    join(assets, 'certificate-bg.jpg'),
  )}, quality=92, optimize=True, subsampling=0)`,
]);
console.log('Wrote certificate-bg.jpg, laurel-left.png, laurel-right.png to', assets);
