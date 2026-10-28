::: short
- Language models now read research papers and write down their causal design. Most of these readings are wrong, and a wrong reading still produces a confident result further down the line.
- Can we tell which readings to distrust without an answer key? We fixed three warning signals in advance and tested them once on four frontier model families.
- Two signals reversed. One held: when different model families disagree about a case, their reading is more likely wrong. Skipping the most disputed half cuts the error rate from 81 to 72 percent.
:::

[[figure]]

## The problem

A causal claim stands on its design: what was treated, what was measured, what was held fixed. Given that design, algorithms (Shpitser and Pearl; Jaber et al.) decide mechanically whether the effect can be identified. The weak link is the step before: reading the paper into a design. Language models now do that reading. Most of their readings fail the benchmark's grader, and a wrong reading still returns a verdict.

## The idea

::: intuition
Ask three people to summarise a paper. If they disagree, at least one of them is wrong. Disagreement is a warning light that needs no answer key.
:::

Three candidate lights:

- **Within model disagreement** $d^{W,f}_i$: ask one model family $f$ three times about item $i$ and see how much its answers differ.
- **Cross model disagreement** $d^{C}_i$: ask four different families and see how much they differ.
- **Task structure** $k^f_i$: count the design fields in the answer. More fields, more room for error.

## The test

Five open weight models served as the discovery sample and picked out the three signals. The decision rules were then registered on OSF on 13 September 2026, with the hash of the analysis script deposited, and run once on four frontier families: Anthropic, OpenAI, Google and xAI. Each answered every item three times at temperature 1.0, 2,088 readings in all.

The items are the 174 cases of CausalReasoningBenchmark (Sawarni, Tan, Syrgkanis), each with an expert design. The authors' grader, `evaluate_identification`, checks each family's most frequent answer. The error $e^f_i$ is 1 when it fails and 0 when it passes.

A signal $s$ is scored by its AUROC, written $A(s)$:

$$A(s) = \Pr\big(s_i > s_j \mid e_i = 1,\ e_j = 0\big)$$

::: intuition
Pick one wrong reading and one right reading at random. $A(s)$ is the chance the signal flags the wrong one as more suspicious, with ties counted as half. A coin flip scores 0.5; a perfect signal scores 1.
:::

The registered bar was 0.65. With $f$ running over the four families, the rules were:

$$\begin{aligned} \text{C1:}&\quad \#\{f : A(d^{W,f}) \ge 0.65\} \ge 3 \\ \text{C2:}&\quad A(d^{C}) \ge 0.65 \\ \text{C3:}&\quad \#\{f : A(k^{f}) > A(d^{W,f})\} \ge 3 \end{aligned}$$

## The result

| Signal | Discovery | Frontier | Verdict |
|---|---|---|---|
| C1 Within model | 0.727 | 0.680, Google only | Failed |
| C2 Cross model | 0.609 | 0.753, interval [0.661, 0.840] | Held |
| C3 Task structure | 0.771 | about 0.50, one family | Retracted |

The signal ranked last in discovery is the only one that survived. Disagreement inside one family says little about its errors; disagreement between families tracks them.

A registered falsifier predicted the opposite on unusual designs: families would agree on the same wrong answer. Disagreement flagged errors better there, 0.868 against 0.646, with a permutation $p = 0.025$. Neither the number of families nor how accurate they are explains the reversal.

Skipping the half of the items with the most cross model disagreement lowers the error on what is kept:

$$\bar e_{\text{all}} = 80.9\% \;\longrightarrow\; \bar e_{\text{kept}} = 72.4\%$$

## Why it matters

Two lessons. Cross model disagreement is a cheap, honest warning light for automated reading of research. But it is no fix: the half it keeps is still wrong 72 percent of the time, so the reading step itself needs work. And registering the rules in advance mattered. On discovery data alone, two of the three signals would have been reported as findings.
