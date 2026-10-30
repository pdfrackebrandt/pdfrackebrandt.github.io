::: short
- Probability is a rule for weighing events: never negative, total weight 1, disjoint events add. Everything below follows from those three lines.
- A distribution is pinned down by its CDF. The density is the slope of the CDF, or the size of its jumps.
- Moments summarise a distribution. Conditioning splits them: the overall mean is an average of conditional means, and total spread is spread within groups plus spread between them.
- Independence implies mean independence, which implies zero covariance. The arrows do not run backwards, except under joint normality. This chain is the backbone of every OLS assumption to come.
:::

## 1. Random variables and the axioms

A random variable $X$ turns each uncertain outcome into a number. A **discrete** variable takes finitely or countably many values. A **continuous** variable takes values in an interval, and the chance of hitting any single point is zero: $P(X = x) = 0$ for every $x$.

Kolmogorov's axioms. Let $\Omega$ be the set of all outcomes and $A$ any event, a subset of $\Omega$:

- Nonnegativity: $P(A) \ge 0$
- Normalisation: $P(\Omega) = 1$
- Countable additivity: if $A_1, A_2, \dots$ are pairwise disjoint, then $P\big(\bigcup_i A_i\big) = \sum_i P(A_i)$

Two rules follow at once. Split $B$ into the part inside $A$ and the part outside: $P(B) = P(A \cap B) + P(B \setminus A)$. Adding $P(A)$ to both sides gives the union rule

$$P(A \cup B) = P(A) + P(B) - P(A \cap B)$$

The overlap is counted twice, so it is subtracted once. And if $A \subset B$, then $P(B) = P(A) + P(B \setminus A) \ge P(A)$. Every event sits inside $\Omega$, so $P(A) \le 1$.

::: takeaway
Probability is never negative, something always happens, and disjoint events add. Monotonicity and the union rule are consequences, not extra assumptions.
:::

## 2. CDFs and densities

The cumulative distribution function $F(x) = P(X \le x)$ exists for every random variable: discrete, continuous or mixed. It always has three properties:

- $F(x) \to 0$ as $x \to -\infty$ and $F(x) \to 1$ as $x \to \infty$
- $F$ never decreases
- $F$ is right continuous

Why right continuous? As $x$ falls towards $x_0$ from above, the events $\{X \le x\}$ shrink to $\{X \le x_0\}$, and probability is continuous along shrinking events. From the left, $\{X \le x\}$ grows only to $\{X < x_0\}$, which misses the point $x_0$ itself. So $F$ can jump at $x_0$, and the jump is exactly the probability sitting there:

$$\begin{aligned} P(X = x_0) &= F(x_0) - \lim_{x \uparrow x_0} F(x) \\ P(a < X \le b) &= F(b) - F(a) \end{aligned}$$

The **density** describes the same distribution locally. Discrete: the probability mass function $p(x) = P(X = x)$, the jumps of $F$. Continuous: $f(x) = F'(x)$ wherever the derivative exists, so $F(x) = \int_{-\infty}^{x} f(t)\,dt$.

::: intuition
A density is probability per unit length, like population per square kilometre. It can exceed 1: Uniform$(0, \tfrac12)$ has $f(x) = 2$ on its support, yet the area under it is still 1.
:::

[[fig note-cdf]]

::: takeaway
The density is the slope of the CDF (continuous) or its jumps (discrete). Whether an interval includes its endpoints matters only where there is an atom.
:::

## 3. Common distributions

A distribution family is a CDF indexed by a few parameters. Estimation targets those parameters, or the moments they pin down.

| Distribution | Support | Mean | Variance |
|---|---|---|---|
| Bernoulli$(p)$ | $\{0, 1\}$ | $p$ | $p(1-p)$ |
| Binomial$(n, p)$ | $\{0, 1, \dots, n\}$ | $np$ | $np(1-p)$ |
| Poisson$(\lambda)$ | $\{0, 1, 2, \dots\}$ | $\lambda$ | $\lambda$ |
| Uniform$(a, b)$ | $(a, b)$ | $(a+b)/2$ | $(b-a)^2/12$ |
| Normal$(\mu, \sigma^2)$ | $\mathbb{R}$ | $\mu$ | $\sigma^2$ |
| Exponential$(\lambda)$ | $[0, \infty)$ | $1/\lambda$ | $1/\lambda^2$ |

The normal family shows how parameters act: $\mu$ slides the curve, $\sigma$ stretches it. Because the area must stay 1, a narrow normal is tall. Its peak is $1/(\sigma\sqrt{2\pi})$, which passes 1 once $\sigma < 0.4$.

[[fig note-normal]]

::: takeaway
Parameters move and stretch a fixed shape. About 68 percent of any normal lies within one $\sigma$ of $\mu$, whatever $\mu$ and $\sigma$ are.
:::

## 4. Moments, iterated expectations and total variance

The $k$th moment is $E[X^k]$. It exists only if $E\big[|X|^k\big] < \infty$. Without absolute convergence the sum or integral can depend on the order in which it is taken, and then it means nothing. The Cauchy distribution has no mean for this reason.

Variance measures spread around the mean $\mu = E[X]$. Expanding the square:

$$\begin{aligned} \operatorname{Var}(X) &= E\big[(X - \mu)^2\big] \\ &= E[X^2] - 2\mu E[X] + \mu^2 = E[X^2] - \mu^2 \end{aligned}$$

Shifting $X$ leaves the spread alone and scaling multiplies it: $\operatorname{Var}(a + bX) = b^2 \operatorname{Var}(X)$. For a Bernoulli, $\operatorname{Var}(X) = p - p^2 = p(1-p)$, largest at $p = \tfrac12$, when the outcome is least predictable.

### Iterated expectations

$E[Y \mid X]$ is the mean of $Y$ once $X$ is known. Before $X$ is drawn it is itself a random variable, a function of $X$. Averaging it over $X$ gives back the plain mean:

$$E[Y] = E\big[E[Y \mid X]\big]$$

For discrete variables the proof is a regrouping of one double sum:

$$\begin{aligned} &E\big[E[Y \mid X]\big] \\ &= \sum_x \sum_y y\, P(Y = y \mid X = x)\, P(X = x) \\ &= \sum_y y \sum_x P(Y = y, X = x) \\ &= \sum_y y\, P(Y = y) = E[Y] \end{aligned}$$

::: intuition
A school's average grade is the average of its class averages, each weighted by class size. Conditioning first and averaging after loses nothing.
:::

### Total variance

Write the deviation of $Y$ from its mean in two pieces: the part $X$ cannot explain, and the part it can.

$$\begin{aligned} Y - E[Y] = {}&\big(Y - E[Y \mid X]\big) \\ &+ \big(E[Y \mid X] - E[Y]\big) \end{aligned}$$

Square both sides and take expectations. The cross term has mean zero: once $X$ is known the second bracket is a fixed number, and the first averages to zero. What is left:

$$\operatorname{Var}(Y) = \underbrace{E\big[\operatorname{Var}(Y \mid X)\big]}_{\text{within}} + \underbrace{\operatorname{Var}\big(E[Y \mid X]\big)}_{\text{between}}$$

The between share, $\operatorname{Var}(E[Y \mid X]) / \operatorname{Var}(Y)$, is the population $R^2$ of the best predictor of $Y$ given $X$.

[[fig note-totalvar]]

### Orthogonality

If $E[Y \mid X] = 0$, then $Y$ is uncorrelated with every function of $X$. Iterated expectations again:

$$E\big[g(X)\, Y\big] = E\big[g(X)\, E[Y \mid X]\big] = 0$$

::: note
This is where the OLS orthogonality conditions come from. Strict exogeneity, $E[u \mid X] = 0$, makes the error orthogonal to the regressors and to any function of them.
:::

::: takeaway
$E[Y \mid X]$ is a random variable, and averaging it returns $E[Y]$. Total spread is spread within groups plus spread between them. A zero conditional mean makes $Y$ orthogonal to everything built from $X$.
:::

## 5. Independence, mean independence and correlation

Three ways for $Y$ to be unrelated to $X$, from strongest to weakest:

- **Independent**: the joint density factors, $f(x, y) = f_X(x)\, f_Y(y)$. Knowing $X$ tells you nothing about $Y$.
- **Mean independent**: $E[Y \mid X] = E[Y]$. Knowing $X$ tells you nothing about the mean of $Y$.
- **Uncorrelated**: $\operatorname{Cov}(X, Y) = 0$. No *linear* relation.

Each implies the next, and neither arrow reverses.

- **Uncorrelated but dependent.** Take $X \sim N(0, 1)$ and $Y = X^2$. Then $\operatorname{Cov}(X, Y) = E[X^3] - E[X]E[X^2] = 0$, yet $Y$ is a function of $X$.
- **Mean independent but dependent.** Take $Y = \sigma(X)\,\varepsilon$ with $\varepsilon$ independent of $X$ and $E[\varepsilon] = 0$. Then $E[Y \mid X] = 0$, but the spread of $Y$ moves with $X$. This is heteroskedasticity.

The exception is joint normality: if $(X, Y)$ is jointly normal and uncorrelated, $X$ and $Y$ are independent. *Jointly* matters. With $X \sim N(0, 1)$ and an independent random sign $S = \pm 1$, $Y = SX$ is normal and uncorrelated with $X$, yet $|Y| = |X|$ always.

[[fig note-corr]]

::: takeaway
Independence, then mean independence, then zero covariance. Only under joint normality does the chain run backwards. Correlation measures straight line association and nothing more.
:::

## 6. Testing distributions and quantiles

The distributions used for tests are all built from independent standard normals.

- If $Z \sim N(0, 1)$, then $Z^2 \sim \chi^2_1$, and the sum of $k$ independent such squares is $\chi^2_k$.
- With $Z \sim N(0,1)$ independent of $V \sim \chi^2_k$: $t_k = Z / \sqrt{V/k}$.
- With independent $V_1 \sim \chi^2_m$ and $V_2 \sim \chi^2_k$: $F_{m,k} = (V_1/m)/(V_2/k)$. Squaring a $t_k$ gives an $F_{1,k}$.

The $\alpha$ **quantile** is $q_\alpha = \inf\{x : F(x) \ge \alpha\}$. When $F$ is continuous and strictly increasing this is just the solution of $F(q_\alpha) = \alpha$.

The **probability integral transform**: if $F$ is continuous, then $F(X) \sim U(0, 1)$. For strictly increasing $F$ the proof is one line:

$$\begin{aligned} P\big(F(X) \le u\big) &= P\big(X \le F^{-1}(u)\big) \\ &= F\big(F^{-1}(u)\big) = u \end{aligned}$$

Run it backwards and $F^{-1}(U)$ with $U \sim U(0,1)$ has distribution $F$. That is how computers draw from any distribution.

::: takeaway
$\chi^2$, $t$ and $F$ are built from independent standard normals. Passing a continuous variable through its own CDF gives a uniform, which is why exact p values exist and why simulation works.
:::

## Summary

| Result | Statement | Returns in |
|---|---|---|
| Axioms | $P \ge 0$, $P(\Omega) = 1$, disjoint events add | Everything |
| CDF | $P(a < X \le b) = F(b) - F(a)$ | p values |
| Independence | Joint density factors | Likelihood as a product (MLE) |
| Iterated expectations | $E[Y] = E[E[Y \mid X]]$ | OLS, IV |
| Total variance | Within plus between | $R^2$ |
| Mean independence | $E[u \mid X] = 0$ with $\operatorname{Var}(u \mid X)$ free to vary | Heteroskedasticity, robust standard errors |
| Joint normality | Uncorrelated implies independent | Exact finite sample tests |
| Probability integral transform | $F(X) \sim U(0, 1)$ for continuous $F$ | Simulation, exact p values |
