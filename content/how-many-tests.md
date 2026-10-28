## The question

Every parameter search is a multiple test. The best of many noisy rules looks good by chance, so the bar it must clear rises with the number of rules tried. A grid of moving average rules holds thousands of settings, and neighbouring settings trade almost alike. How many independent tests does such a grid represent, and what does that count do to the bar?

## The hurdle

Bailey and López de Prado (2014) give the Sharpe ratio that the best of $N$ independent noise strategies reaches on average:

$$\begin{aligned} \widehat{SR}_0 = \mathrm{E}\Big[\max_n \widehat{SR}_n\Big] \approx \sigma_{SR}\Big[&(1-\gamma)\,\Phi^{-1}\Big(1-\frac{1}{N}\Big) \\ &+\gamma\,\Phi^{-1}\Big(1-\frac{1}{N e}\Big)\Big] \end{aligned}$$

Here $\widehat{SR}_n$ is the estimated Sharpe ratio of trial $n$, $\sigma_{SR}$ the spread of those estimates across trials, $\Phi^{-1}$ the inverse of the standard normal distribution function, $\gamma \approx 0.5772$ the Euler Mascheroni constant and $e$ Euler's number. The hurdle grows like $\sqrt{\ln N}$, so only the order of magnitude of $N$ matters.

The deflated Sharpe ratio is the probability that the chosen rule's true Sharpe ratio beats that hurdle:

$$\mathrm{DSR} = \Phi\!\left(\frac{\big(\widehat{SR}-\widehat{SR}_0\big)\sqrt{T-1}}{\sqrt{1-\hat{S}\,\widehat{SR}+\dfrac{\hat{K}-1}{4}\,\widehat{SR}^{2}}}\right)$$

$\widehat{SR}$ is the chosen rule's Sharpe ratio, $T$ the number of returns, $\hat{S}$ their skewness and $\hat{K}$ their kurtosis (3 for normal returns). The denominator is the estimation error of a Sharpe ratio; fat tails and negative skew widen it.

## Counting the tests

We run a stationary block bootstrap on the full grid of 2,825 moving average rules. Each replicate draws the same trading days for every rule, in blocks of random length with mean ten days, so the correlation between rules survives. The best Sharpe ratio in each replicate gives the null distribution of the maximum. The effective number of tests $N_{\text{eff}}$ is the count that makes the formula return the bootstrap's expected maximum:

$$\begin{aligned} \mathrm{E}^{*}\Big[\max_n \widehat{SR}_n\Big] = \sigma_{SR}\Big[&(1-\gamma)\,\Phi^{-1}\Big(1-\frac{1}{N_{\text{eff}}}\Big) \\ &+\gamma\,\Phi^{-1}\Big(1-\frac{1}{N_{\text{eff}}\,e}\Big)\Big] \end{aligned}$$

$\mathrm{E}^{*}$ is the average over bootstrap replicates. The right side rises with $N_{\text{eff}}$, so one value solves it.

## The result

On the DAX, $N_{\text{eff}}$ is about 1,400. Software that clusters similar moving averages reports $N = 2$. Cluster corrections of this kind cut the hurdle by as much as 84 percent and call noise significant. The raw count of 2,825 overstates it by 6 percent.

Why so little shrinkage? A correlation shared evenly by all rules moves the whole grid up and down together. It shrinks the expected maximum and the spread $\sigma_{SR}$ by the same factor, so the formula still needs the full $N$. Only block structure lowers $N_{\text{eff}}$: rules inside a tight block act as one. Of the eigenvalue corrections, only Gao (2008) stays close.

What moves the required Sharpe ratio:

| Source | Effect |
|---|---|
| Multiplicity | factor of 7.3 |
| $N_{\text{eff}}$ in place of $N$ | minus 3.1 percent |
| Daily non normality | plus 0.2 percent |

The best moving average rule survives in 3 of 17 markets and 2 of 31 German stocks. On the DAX it clears the mean of the noise maximum and fails the 95 percent band.

## What it means

The hurdle grows so slowly in $N$ that counting too many trials costs little, while counting too few costs a lot. The block bootstrap on the real grid shows the nominal count is the safe one.
