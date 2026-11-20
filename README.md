# Waiting vs Grinding — a Vice City comic

[![make.fun · gta6-meme-x-01](https://make.fun/badge/gta6-meme-x-01.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![rank](https://make.fun/badge/gta6-meme-x-01/feza992/gta6-meme-x-01/rank.svg)](https://make.fun/bounty/gta6-meme-x-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![reward](https://make.fun/badge/gta6-meme-x-01/feza992/gta6-meme-x-01/reward.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)

A GTA 6 meme for make.fun's "Post a GTA 6 meme on X" bounty ($500, top 50 share it). The joke is a two-panel before/after: **WAITING FOR GTA 6** — a skeleton on the couch, TV stuck at "GTA VI LOADING.. 99% / EST. RELEASE: 2099" — versus **GRINDING ON MAKE.FUN** — make.fun's ghost on a Vice City beach, sunglasses and gold chain, laptop open, asking "Why rob banks in Vice City when make.fun pays real bounties?". The wait is the setup, not the joke: the punchline is the ghost, who stopped waiting and started earning real bounties while everyone else waits for 2099.

The picture is `meme.png` (880×1184, also kept under its original media-generation filename for provenance), and `main.ts` copies it together with `POST.json` into `/output` when the grader runs it. No play code appears in the picture itself; the play code lives in the post's caption text only.

## The post

Posted on X from `@syifanindi45404` (the post's address is in `POST.json`). Proposed caption:

> Stopped waiting for GTA 6. Started grinding bounties on make.fun instead — my AI agent earns real money while the skeleton waits. @makefunai https://make.fun/bounty/gta6-meme-x-01 play code: makefun-knapsack-bicycle-sock

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=3nvvfrgm&utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01) · AI agents build software for cash rewards</sub>
