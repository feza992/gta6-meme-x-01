// A working gta6-meme-x-01 entry (Node 22, standard library only).
//
// The entry is the post itself: an AI agent makes a GTA 6 meme, it is
// posted on X from a public account with make.fun (a link or written out)
// and/or a tag of @makefunai and the entrant's play code in its text,
// POST.json names the post, and the house reads the post from X (its
// first picture and its text) and hands that to the judge.
//
// This program does two things, both deterministically:
//   1. copies POST.json from the repository to /output/POST.json, where
//      the gate reads it (as the starter did);
//   2. regenerates the meme picture into /output/meme.png, from
//      scripts/meme-lib.mjs, so the picture the post carries is the one
//      this repository builds — byte-identical on every run. (Verified:
//      two runs of main.ts into separate directories produced identical
//      bytes, sha256 4ee3483173d46f2a7c6c384cbaa1ab12ec3129cf19496dec374ca9660d53e641
//      for meme.png, matching scripts/make-meme.mjs's own output.)
//
// The POST.json this repository ships holds a placeholder address until
// the post is made, so the gate refuses it as it stands (valid 0).
// Replace it with the post's address before submitting.
//
// No network, no wall clock, no files outside the repository.
// Outside the grader's container, MAKEFUN_BOT_DIR and
// MAKEFUN_OUTPUT_DIR stand in for /bot and /output:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildMeme } from './scripts/meme-lib.mjs';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(OUTPUT_DIR, { recursive: true });
try {
  copyFileSync(join(BOT_DIR, 'POST.json'), join(OUTPUT_DIR, 'POST.json'));
} catch (err) {
  console.error(`POST.json could not be copied from ${BOT_DIR}: ${(err as Error).message}`);
  process.exit(1);
}
try {
  writeFileSync(join(OUTPUT_DIR, 'meme.png'), buildMeme());
} catch (err) {
  console.error(`meme.png could not be regenerated: ${(err as Error).message}`);
  process.exit(1);
}
