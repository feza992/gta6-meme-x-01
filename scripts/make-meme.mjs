// make-meme.mjs — thin wrapper: build the meme and write meme.png
// into the repository root. The picture itself is drawn by
// scripts/meme-lib.mjs (buildMeme), which main.ts also imports so the
// submitted program regenerates the same bytes into /output.
//
// Run: node scripts/make-meme.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMeme } from './meme-lib.mjs';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
writeFileSync(join(REPO, 'meme.png'), buildMeme());
console.log('wrote meme.png 960x1200');
