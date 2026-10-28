## The question

A causal claim rests on its identification: treatment, outcome, controls, design. Given that specification, identification algorithms (Shpitser and Pearl; Jaber et al.) decide whether the effect can be recovered. The weak step is reading the paper into the specification. Language models now do that reading, most of their extractions fail the benchmark's grader, and a wrong specification still returns a verdict.

Does disagreement among extractions flag the wrong ones, item by item and with no answer key, well enough to tell a pipeline when to abstain?

## The design

The corpus is CausalReasoningBenchmark (Sawarni, Tan, Syrgkanis): 174 items, each with an expert specification. The authors' grader, `evaluate_identification`, scores each model's modal answer, the specification it returns most often across its draws. The error $e^f_i$ is 1 if the grader rejects family $f$'s modal answer on item $i$, and 0 otherwise.

Five open weight arms served as the discovery sample and named three candidate signals. The decision rules were then registered on OSF on 13 September 2026, with the hash of the analysis script deposited, and run once on four frontier families: Anthropic, OpenAI, Google and xAI, three draws each at temperature 1.0. That is 2,088 extractions.

## The signals

- **Within model disagreement** $d^{W,f}_i$: how far family $f$'s three draws on item $i$ differ.
- **Cross model disagreement** $d^{C}_i$: how far the four families differ on item $i$.
- **Task structure** $k^f_i$: the number of design fields in family $f$'s predicted specification.

Each signal $s$ is judged by its AUROC, written $A(s)$: the probability that a randomly drawn wrong item scores higher than a randomly drawn right one.

$$A(s) = \Pr\big(s_i > s_j \mid e_i = 1,\ e_j = 0\big)$$

Ties count as half. Chance is 0.5; perfect separation is 1. With $f$ running over the four families, the registered rules were:

$$\begin{aligned} \text{C1:}&\quad \#\{f : A(d^{W,f}) \ge 0.65\} \ge 3 \\ \text{C2:}&\quad A(d^{C}) \ge 0.65 \\ \text{C3:}&\quad \#\{f : A(k^{f}) > A(d^{W,f})\} \ge 3 \end{aligned}$$

## The result

| Rule | Discovery | Frontier | Verdict |
|---|---|---|---|
| C1 Within model | 0.727 | 0.680, Google only | Failed |
| C2 Cross model | 0.609 | 0.753, interval [0.661, 0.840] | Held |
| C3 Task structure | 0.771 | about 0.50, one family | Retracted |

A registered falsifier predicted that families would agree on the same wrong answer for unconventional designs. Disagreement separated errors better there: 0.868 against 0.646, permutation $p = 0.025$. Neither ensemble breadth nor model accuracy explains the reversal.

Abstaining where the families disagree most lowers the error on what is kept:

$$\bar e_{\text{all}} = 80.9\% \;\longrightarrow\; \bar e_{H} = 72.4\%$$

$H$ is the half of the items with the lowest $d^{C}_i$, and $\bar e$ is the share of graded answers that are wrong.

## What it means

The signal ranked last in discovery is the only one that survived. Five open weight arms favoured task structure and within model sampling; four frontier families reversed both. Cross model disagreement worked best on unconventional designs, the case the falsifier expected to break it. As an abstention rule it cuts error by 8.5 points, and the half it keeps is still wrong 72.4 percent of the time.
