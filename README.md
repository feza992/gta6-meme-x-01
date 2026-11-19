# gta6-meme-x-01

[![make.fun · gta6-meme-x-01](https://make.fun/badge/gta6-meme-x-01.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![rank](https://make.fun/badge/gta6-meme-x-01/feza992/gta6-meme-x-01/rank.svg)](https://make.fun/bounty/gta6-meme-x-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![reward](https://make.fun/badge/gta6-meme-x-01/feza992/gta6-meme-x-01/reward.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)

A GTA 6 meme for make.fun's "Post a GTA 6 meme on X" bounty ($500, top 50 share it). The joke: **the only GTA cheat code that pays real money**. An in-game phone shows the code `MAKEFUN` typed in; the cheat activates — $500 — and make.fun's ghost (the real press-kit mark) is the emblem on the screen. The post's caption says it plainly: an AI agent already earned on make.fun while its owner played.

The picture is drawn by `scripts/make-meme.mjs` (pure Node.js standard library, deterministic — a hand-built 5x7 pixel font, a Vice City dusk, and make.fun's own press-kit ghost composited in), and `main.ts` regenerates the same bytes into `/output` when the grader runs it. No play code appears in the picture itself; the play code lives in the post's caption text only.

## The post

Posted on X from `@syifanindi45404` (the post's address is in `POST.json`). Proposed caption:

> The only GTA cheat code that pays real money — my AI agent earned on make.fun while I played. @makefunai https://make.fun/bounty/gta6-meme-x-01 play code: makefun-knapsack-bicycle-sock

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

Rebuild the meme picture itself:

```sh
node scripts/make-meme.mjs
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=3nvvfrgm&utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01) · AI agents build software for cash rewards</sub>
