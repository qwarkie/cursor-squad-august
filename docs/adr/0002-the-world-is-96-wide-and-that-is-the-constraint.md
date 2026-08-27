# ADR-0002: The world stays 96 art-pixels wide; its height may follow the Budget

**Status**: Accepted · **Date**: 2026-08-27 · **Feature**: [001-money-river](../../specs/001-money-river/spec.md)

**Recording, not deciding.** The width half was ruled during the responsive work; the height half was ruled on #72. This file exists because three separate pieces of work measured their way back to the same wall from three directions without recognising it as one, and the next person should meet it as a written constraint rather than as a surprise.

## Context

`WORLD_W = 96` and `RANK_ART_W = 27` (`world/path.ts`, `world/geometry.ts`). A village is 28% of the world's width, and it stands at the end of a stream that also has to be visible.

Three sections of the procedural-world brief were each scoped, measured, and found to be bounded by that ratio rather than by their own difficulty:

| Section | What it asked for | What the measurement said |
|---|---|---|
| §3 distribution | expenses spread along the river, the lake pushed down | five categories need **112 art-px of village against an 88 art-px river**. Seven is the last size that lays out; six has five pixels of headroom |
| §4 river-to-city | visible water between the river and the town | the largest village's outer edge is at **95.5 of 96**. There is no room to stand it further out, so the **water** gave way and now stops at the village's near edge |
| §5 branch length | length varying with spending | about **five art-px of range**, and a positional penalty of up to four inside it |

Two instruments sharing no code found the §3 boundary at seven categories, in both budget shapes. §4's constraint was found by building the obvious fix and measuring it doing half a job. §5's was found by expecting to add variation and discovering it already existed for the wrong reason.

## Decision

**`WORLD_W` stays 96, and outlet positions stay a pure function of the Budget.**

The alternative — growing the world with the viewport — was proposed and rejected: it makes `geometry.ts`'s outlet positions and `grove.ts`'s foliage placement functions of the browser window, and **FR-015/SC-007 require the picture to be a pure function of the Budget**. A bigger screen shows more *of* the world, not more world. `baseline_390` exists to pin exactly that, and it has held byte-identical through the world's sizing, the page layout and the meadow generator all being rewritten.

**`WORLD_H` may become a pure function of the Budget.** These look like the same question and are not: height growing with the *number of categories* is data, exactly like trunk width, settlement count and pool size. It stays deterministic and `budgetToRiver(budget)` stays single-argument.

**The camera is what makes that viable.** Pan, zoom and Fit already exist, and `world/view.ts` separates `worldPx` — the coordinate space, fixed — from `reachPx`, how far the camera may travel. A river that outgrows its canvas is precisely the case that machinery was built for.

## Consequences

**§3 escapes downward.** The river can get longer and the lower lake can move with it, because the camera follows. That work is specified and unbuilt at the time of writing.

**§4 and §5 have nowhere to escape to.** Neither can be solved by giving the village more room, because the room does not exist and cannot be created without breaking the decision above. §4 was therefore solved by moving the *water* rather than the town, which is why `tributaryWaterEnd()` exists alongside `tributaryEnd()`. §5 remains open and any implementation of it has to work inside five pixels.

**A branch's reach is not what the constant says.** `STREAM_REACH` is 10 for every branch; branches clamped against the world edge get less. The reduction depends on the meander phase at that `atY` and on the trunk width there — which is set by the amounts listed *above* the branch. **It never depends on the branch's own amount.** In the seeded month the first category is also the largest, which makes this read as an inverted signal; it is not inverted, it is unrelated, and the correlation is an accident of the demo budget.

**The demo month is the most forgiving size in the range.** Its lowest drawn row sits at art-y 92 against a 128 world — more headroom than four categories, because its last category is savings and a reservoir plants no settlement. Six has five pixels; seven has none. Every gate on this board measured that month for the first six hours of the feature's life, which is why none of them saw the wall.

## Alternatives considered

**Widen `WORLD_W`.** Rejected: art-bible §1 fixes the grid, and every sprite, keep-out and pinned reference is expressed in it. The cost is not the constant, it is that `baseline_390` — a reference taken before any of this work — stops meaning what it means.

**Let the village narrow when it runs out of room.** Rejected for §4: a cluster that reflows at the world's edge would make a category's appearance depend on which side of the river it landed on, and side is assigned by position rather than by anything a person chose.

**Cap the settlement count.** Rejected earlier and worth restating: FR-007 ties the count to the amount, so capping it made $1,500 of Housing render exactly like $650 of Food. The largest expense stopped looking largest and the metaphor flattened.
