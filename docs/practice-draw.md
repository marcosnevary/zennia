# Practice draw

Practice never runs out: there are no due dates and no end to a session. Each time it needs an item, it estimates how likely the user is to have forgotten each one and draws with that in mind. It also limits how many items are being learned at once.

The model is in `src/lib/data/memory.ts`. The session (`src/lib/data/practice-session.ts`) calls `drawItem`, and every answer goes through `remember`.

## What is kept per item

Each word and each kana keeps three numbers next to its tally (`Memory` in `src/lib/core/types.ts`):

| Field        | Meaning                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| `halfLife`   | How long after the last answer the chance of recalling the item falls to one half. Short means fragile. |
| `answeredAt` | When the item was last answered, right or wrong.                                                        |
| `streak`     | Right answers in a row.                                                                                 |

An item that has never been answered has no memory. Neither does an item whose tally dates from before this model, so it starts as new.

## Recall

The chance of recalling an item right now is:

```
p = 2^(−Δt / h)
```

`Δt` is the time since the item's last answer and `h` is its half-life. Both are measured on the clock, including the time the app was closed. How long the user takes to answer plays no part.

| Δt, with h = 10 min | p    |
| ------------------- | ---- |
| 0                   | 1    |
| 10 min              | 0.5  |
| 20 min              | 0.25 |
| 1 day               | ≈ 0  |

A new item has `p = 0`.

`p` is never stored. It is worked out at each draw from `h` and `answeredAt`, so it falls on its own as time passes. Only an answer changes `h`.

## How an answer changes the memory

| Answer                      | Half-life        | Streak |
| --------------------------- | ---------------- | ------ |
| Right, and the first answer | 10 min           | 2      |
| Right                       | `max(h, 2 × Δt)` | +1     |
| Wrong (`almost` included)   | 5 min            | 0      |

A right answer proves the user recalled the item after `Δt`, so the half-life becomes at least twice that time. Answering the same item again moments later doesn't grow it: repeating an item in a row hardly strengthens long-term memory, the spacing effect. Recalling it after a gap does.

| h before | Right answer after | h after                     |
| -------- | ------------------ | --------------------------- |
| 10 min   | 1 min              | 10 min                      |
| 10 min   | 1 day              | 2 days                      |
| 2 days   | 3 days             | 6 days                      |
| 30 days  | (wrong, any time)  | 5 min, and back to learning |

## Stages

| Stage    | When                     |
| -------- | ------------------------ |
| New      | Never answered           |
| Learning | Answered, streak under 2 |
| Learned  | Streak of 2 or more      |

An item answered right the first time it comes up starts with a streak of 2, so it is learned at once. It was already known, so a second answer would only confirm it. An item missed the first time has to be answered right twice in a row.

A miss resets the streak, so a learned item that is missed goes back to learning.

## The draw

The draw first splits the pool in two:

- **The learning group** holds every item in learning, plus room up to 5 items. Each free place goes to a random new item. New items that don't fit stay out of the draw until a place opens. That happens when an item in learning reaches a streak of 2. A new item answered right goes straight to learned, so it frees its place at once.
- **The learned items** are all included.

A coin then picks one side. The learned items get a share that depends on how much they need review, and the learning group gets the rest:

```
learned share = 50% × min(1, S / 5)        S = the learned items' weight sum
```

The weight sum `S` is how many of the learned items are forgotten, on average. Ten items with weight 0.1 add up to 1, as if one were forgotten. The 5 is the size of the learning group. So the learned items reach their full share of 50% once they need as much review as a full learning group, and never go above it.

| Learned items                           | S    | Learned share | Learning group |
| --------------------------------------- | ---- | ------------- | -------------- |
| 3 just learned (weight about 0.05 each) | 0.15 | 1.5%          | 98.5%          |
| 21 learned minutes ago (weight 0.15)    | 3.2  | 32%           | 68%            |
| 21 not seen since yesterday (weight 1)  | 21   | 50%           | 50%            |
| 2000 not seen for a month               | 2000 | 50%           | 50%            |

If one side is empty, or all its weights are 0, the other side gets every draw. So when nothing is being learned, the learned items still come up however well they are known.

Right after items are learned, they barely compete, and the learning group turns faster, letting new items in. As they are forgotten, their share grows back to 50%. The cap keeps the learning group turning however many items are learned. Without it, a word just missed would compete with thousands of learned words and would not come back for a long time.

Within the chosen side, each item is drawn in proportion to its weight:

```
weight = 1 − p
```

That is the chance the item has been forgotten. The draw is still random, so an item with a high weight is likely to come up but never certain to. An item just answered weighs almost 0. A learned item seen a month ago with a long half-life still weighs a little, so known items keep coming back now and then.

Example of a draw within the learning group:

| Item                    | p   | Weight | Chance          |
| ----------------------- | --- | ------ | --------------- |
| 猫 (new)                | 0   | 1      | 1 / 1.6 ≈ 62%   |
| 犬 (answered 2 min ago) | 0.7 | 0.3    | 0.3 / 1.6 ≈ 19% |
| 鳥 (answered 1 min ago) | 0.7 | 0.3    | 0.3 / 1.6 ≈ 19% |

The item just shown is left out of the draw, unless it is the only one. The learning group still counts it.

### Timing

The next item is drawn when the answer is checked, so what it needs, such as its font and its audio, can load while the result is up. The answer is recorded first, so the draw already sees the new memory. If the selection changes in Settings meanwhile and leaves the drawn item out, Next draws again.

## Watching the draw

On the local dev server, Settings has a **Developer mode** switch, kept per browser in `localStorage` (`src/lib/data/dev-mode.svelte.ts`). The published app never shows it. With it on, Practice shows the draw details below the card (`DrawDetails.svelte`):

- **Pool counts:** how many items are new, learning and learned, and how much room the learning group has.
- **This item:** its stage, recall, half-life, time since its last answer and streak, and the chance it had when it was drawn.
- **Effect of the answer:** after Check, the half-life, streak and stage before and after.
- **Next draw:** the candidates ranked by their chance, with the weight sum of each side and the learned items' share. Before Check, these are the odds if the next item were drawn now. After Check, they are the odds of the draw that picked the upcoming item, shown in bold.

The panel reads the same `drawPlan` and `chanceOf` the draw uses, so what it shows can't drift from what the draw does.

## What the model leaves out

This first version keeps only what the behaviour needs. Each of these was considered and left out until use shows it is missing:

| Left out                                                                               | It would help when                                                      |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A bigger half-life gain when the item was nearly forgotten (`p` low) at a right answer | hard items come up too rarely, or easy ones too often                   |
| A proportional drop on a miss, `max(5 min, h × F)`, instead of starting over           | well-known items take too long to recover after a slip                  |
| A squared weight, or a minimum weight                                                  | the draw doesn't focus enough on the most forgotten items               |
| A queue that brings a missed item back after a set number of items                     | missed items take too long to come back even inside the learning group  |
| Response time                                                                          | it proves to tell a slow right answer from a sure one                   |
| Newest-first order for new items                                                       | so many new items pile up that a lesson just done takes long to come up |
| Rebuilding every memory from the answer log                                            | the model changes and should apply to past answers                      |

## Where the ideas come from

- **The curve** `p = 2^(−Δt/h)` is that of Half-Life Regression: B. Settles and B. Meeder, _A Trainable Spaced Repetition Model for Language Learning_, ACL 2016 (Duolingo). It goes back to Ebbinghaus's forgetting curve. In HLR, `h` is learned by regression from millions of answers. Here it follows fixed rules instead.
- **Rules that grow the interval on a right answer and start over on a miss** follow the Leitner system (S. Leitner, _So lernt man lernen_, 1972) and SuperMemo's SM-2 (P. Woźniak, 1987).
- **Growing the half-life by the gap, not by repetition,** is the spacing effect. R. A. Bjork's "desirable difficulties" (1994) make the same point: recall that takes effort strengthens memory more.
- **The 10 and 5 minute half-lives** come from the short learning steps of Anki and of P. Pimsleur's graduated interval recall (_A Memory Schedule_, 1967).
- **Limiting the items learned at once** is how keybr.com unlocks a new letter only when the current ones are good enough, and how Anki caps new cards.
- **Drawing by the chance of having forgotten** is how Duolingo uses HLR. P. Pavlik and J. Anderson (_Using a model to compute the optimal schedule of practice_, 2008) argue that the best item to practise is the one that gains most, not always the most forgotten. That needs a much heavier model.
- **The half-life update `max(h, 2Δt)`, the coin's share and the weight `1 − p`** are this app's own choices.

## Decisions

- **No FSRS.** FSRS has the strongest memory model, but its output is a due date, and Practice has no queue of due items. Its parameters are also fitted to reviews days apart, not to dozens of answers in a few minutes.
- **The half-life grows with the gap, not with each right answer.** Doubling `h` on every right answer let a few minutes of repetition claim days of memory.
- **The learning group is filled by right answers in a row, not by time.** With a few items taking turns, each comes back every minute or so, so a rule in time would never be met within a session.
- **A coin splits the draw between the two sides.** With weights alone, a full backlog of learned items buries the learning group.
- **An item right the first time is learned at once.** In a second 120-answer session on words the user already knew, 37 answers only confirmed items in learning, 97% of them right, and new words came in at one every four answers. If the item wasn't really known, the curve brings it back for review.
- **The learned items' share follows how much they need review.** A fixed 50/50 coin spent a third of a first 100-answer session on words learned minutes before, 99% of them right, while new words waited.
- **The memory is computed in the app and only stored in the database.** This keeps the rule in one place. Two tabs answering the same item at once can overwrite each other's memory, which costs little. The tallies are still counted by the database ([data model](data-model.md#decisions)).
- **Every answer is logged, unless the user turns off Help improve zennia** ([usage log](data-model.md#the-usage-log)). The memory columns are a cache that `load` reads, one row per item. The log lets a future model be rebuilt from the history, because answers that aren't recorded now are lost for good. With each answer it keeps the recall the model predicted, to measure its calibration, and the chance of the draw, to evaluate other draw rules on the same answers.
