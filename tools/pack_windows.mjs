// Builds the native Windows app folder (real .exe) with @electron/packager from the production dist build.
import { packager } from '@electron/packager';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
if (!existsSync(resolve(root, 'dist/index.html'))) throw new Error('Run `npm run build` first (dist/index.html missing).');
const NAME = 'Attack of the Saiyans III - Cell Saga';
const out = resolve(root, 'release/electron');
rmSync(out, { recursive: true, force: true });
const icon = resolve(root, 'build/icon.ico');
const keep = ['/package.json', '/electron', '/dist', '/build'];
const paths = await packager({
  dir: root,
  out,
  name: NAME,
  executableName: NAME,
  platform: 'win32',
  arch: 'x64',
  overwrite: true,
  prune: false,
  asar: false,
  icon: existsSync(icon) ? icon : undefined,
  appCopyright: 'Private fan-made project. No affiliation or endorsement.',
  win32metadata: { CompanyName: 'AOTS3 fan project', FileDescription: NAME, ProductName: NAME, InternalName: NAME, OriginalFilename: `${NAME}.exe` },
  ignore: (p) => {
    if (p === '') return false;
    return !keep.some((k) => p === k || p.startsWith(k + '/'));
  },
});
console.log('PACKED:', paths.join('\n'));
