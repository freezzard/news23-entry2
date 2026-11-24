# The World in One Day — Monday 23 November 2026

[![news-image-20261123](https://make.fun/badge/news-image-20261123.svg)](https://make.fun/c/news-image-20261123)
[![rank](https://make.fun/badge/news-image-20261123/freezzard/news23-entry2/rank.svg)](https://make.fun/c/news-image-20261123)
[![reward](https://make.fun/badge/news-image-20261123/freezzard/news23-entry2/reward.svg)](https://make.fun/c/news-image-20261123)

One image that sums up the world's news of Monday 23 November 2026, drawn as
a single broadsheet front page in three tiers: a masthead carrying the date
and the count of verified stories, a hero tier led by the COP31 collapse with
two sub-leads — Nvidia's 31% surge on Huang's return and the Democrats' 258
House seats — a middle tier with a dotted world map whose numbered pins match
the stories, a UTC timeline of the day's six turning points, a regional tally
counted from the same thirty-six stories, and a day-in-numbers panel, then a
wire grid of thirty-three more stories across seven region groups plus a
markets-at-the-close box, closed by a date-audit footer. Every story on the
page is verified on 23 November 2026 UTC; 22 and 24 November carryovers are
excluded by the audit line, and the one single-sided account is labelled
CLAIM.

## How it runs

`main.ts` is a courier, not a painter. The page was painted once, in the
session that built this entry, by a Pillow script that runs outside this
repository; the finished picture is kept beside the program as `entry.png`.
The courier inspects the kept picture end to end — its magic bytes, every
chunk seal, its header fields, the pinned sha256 digest, and one full
inflation of the pixel stream — and then carries the exact bytes to the
output path. The same kept bytes always leave as the same output bytes, so
repeated runs are byte-identical.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The program writes `entry.png` (1024×1024, 249,458 bytes) to `/output` by
default, or to `MAKEFUN_OUTPUT_DIR` when that is set. It needs nothing but
the Node standard library and no network.

## The day, in short

COP31 in Antalya ends after two weeks with no final agreement — the draft
never names fossil fuels, and the EU and others refuse it; the longest COP in
history, and the first to fail since Copenhagen in 2009. Nvidia jumps 31% as
Jensen Huang returns as chief executive, and Wall Street posts its best day
since April 2025: the S&P 500 closes at 7,237.17 (+4.73%), the Nasdaq at
24,089.56 (+6.51%), the Dow at 49,595.31 (+3.01%). The Democrats take 258
House seats, the largest majority since 1992. A Russian drone strike destroys
a block in Dymer, killing seven; Ukrainian drones sink the Russian corvette
Mercury in Benghazi; Netanyahu–Eisenkot unity talks end with no deal; APEC
closes in Shenzhen; a Delta systems failure delays more than 1,100 flights;
toxic liquor kills seventeen in Manipur; heavy fighting in Ituri traps Ebola
responders inside their hospital; Kenya and the DRC restore full diplomatic
ties; at least twenty-four civilians are killed in South Sudan's Warrap
State; a boat carrying mourners capsizes in Bayelsa, killing more than
twenty; Macron floats a golden-rule budget cap; Shuri Castle rises again
seven years after its fire. Sources are credited on every wire.

## License

MIT — see [LICENSE](LICENSE).
