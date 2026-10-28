::: short
- Try enough trading rules and the best one will look good by pure luck. The bar a rule must clear has to rise with the number of rules tried.
- Similar rules are not independent tests, and some software counts a grid of 2,825 moving averages as just 2. We measure the real count with a bootstrap: about 1,400 on the DAX.
- Undercounting cuts the bar by up to 84 percent and calls noise a discovery. Using the full count overstates it by only 6 percent. When in doubt, count every rule.
:::

[[figure]]

## The problem

Give 2,825 traders a coin each and let them trade the DAX by its flips. One of them will post a superb record. Testing a grid of moving average rules plays the same game: the best rule's record is partly luck, and the more rules you try, the more luck the best one carries.

## The bar set by luck

How good does the best of $N$ worthless strategies look on average? Bailey and López de Prado (2014) give the answer:

$$\begin{aligned} \widehat{SR}_0 = \mathrm{E}\Big[\max_n \widehat{SR}_n\Big] \approx \sigma_{SR}\Big[&(1-\gamma)\,\Phi^{-1}\Big(1-\frac{1}{N}\Big) \\ &+\gamma\,\Phi^{-1}\Big(1-\frac{1}{N e}\Big)\Big] \end{aligned}$$

$\widehat{SR}_n$ is the measured Sharpe ratio of rule $n$ and $\sigma_{SR}$ how much those ratios vary across rules. $\Phi^{-1}$ turns a probability into a normal quantile, $\gamma \approx 0.5772$ is the Euler Mascheroni constant and $e$ is Euler's number.

::: intuition
The best of many draws creeps up slowly. In the figure's calibration, the bar is 0.05 with 2 rules, 0.30 with 1,000 and 0.35 with 10,000. It grows like $\sqrt{\ln N}$, so the order of magnitude of $N$ is what matters. Counting 2 instead of 1,400 changes everything; counting 2,825 instead of 1,400 changes little.
:::

A rule convinces only if it clears this bar with room to spare. The deflated Sharpe ratio turns "room to spare" into a probability:

$$\mathrm{DSR} = \Phi\!\left(\frac{\big(\widehat{SR}-\widehat{SR}_0\big)\sqrt{T-1}}{\sqrt{1-\hat{S}\,\widehat{SR}+\dfrac{\hat{K}-1}{4}\,\widehat{SR}^{2}}}\right)$$

The top is the margin over luck, scaled up by the length of the record, $T$ returns. The bottom is how noisy a Sharpe ratio is: skew $\hat S$ and fat tails $\hat K$ (3 for normal returns) make it noisier. A DSR near 1 means the margin is too large to be luck.

## How many tests is a grid?

A 50 day and a 51 day moving average trade almost the same way. So 2,825 rules are fewer than 2,825 independent tests. How many fewer?

We let the data answer. A stationary block bootstrap reshuffles the market's own history in blocks of about ten trading days and runs every rule on the same reshuffled days, so the rules stay as similar as they really are. Each reshuffle shows how good the best rule looks in a world with no skill. The effective number of tests $N_{\text{eff}}$ is the count of independent rules that would produce the same average best:

$$\begin{aligned} \mathrm{E}^{*}\Big[\max_n \widehat{SR}_n\Big] = \sigma_{SR}\Big[&(1-\gamma)\,\Phi^{-1}\Big(1-\frac{1}{N_{\text{eff}}}\Big) \\ &+\gamma\,\Phi^{-1}\Big(1-\frac{1}{N_{\text{eff}}\,e}\Big)\Big] \end{aligned}$$

$\mathrm{E}^{*}$ is the average over reshuffles. The right side rises with $N_{\text{eff}}$, so exactly one count fits.

## The result

| Count | $N$ | Bar set by luck |
|---|---|---|
| Clustering software | 2 | 0.05 |
| Bootstrap, DAX | about 1,400 | 0.31 |
| Every rule | 2,825 | 0.33 |

The cluster count cuts the bar by 84 percent and lets noise pass as skill. The full count overstates it by 6 percent.

::: intuition
Why do similar rules still count as so many tests? A move shared by every rule lifts or sinks the whole grid together, so it never singles out a winner. Luck enters through the ways rules differ, and those differences stay many. Only rules locked together in tight blocks act as one test.
:::

Of the standard corrections based on eigenvalues of the correlation matrix, only Gao (2008) comes close. What moves the Sharpe ratio a rule must beat:

| Source | Effect |
|---|---|
| Trying many rules | factor of 7.3 |
| $N_{\text{eff}}$ in place of $N$ | minus 3.1 percent |
| Daily returns not being normal | plus 0.2 percent |

The best moving average rule survives in 3 of 17 markets and 2 of 31 German stocks. On the DAX it beats the average luck of the best noise rule and fails the 95 percent band.

## Why it matters

The two errors are not symmetric. Counting too many tests costs a few percent of the bar; counting too few can wipe out most of it. So the safe default is the plain count of every rule you tried.
