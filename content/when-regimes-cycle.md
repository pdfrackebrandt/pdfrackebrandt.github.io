::: short
- Countries can swing between open and closed rule on their own. No run of bad luck is needed.
- One quantity decides whether the swings fade or last: the pool of young people free to mobilize. Below a threshold, shocks die out. Above it, the swings never stop.
- The economy moves countries across that threshold. Falling behind the neighbours pushes them over; a crisis pulls them back. All three predictions hold in data on nearly every country from 1950 to 2019.
:::

[[figure]]

## The puzzle

Many countries swing between democracy and autocracy for decades. Polybius called it anacyclosis. The usual story blames bad luck: a coup here, a crash there. But the swings look too regular for luck. Is there an engine?

## Two forces

The model follows two quantities, each measured from where the country would settle if left alone.

- **Mobilization** $m$: how many people are organized against the rulers. It feeds on a pool of young people free to be mobilized. The size of that pool is $K$.
- **Inclusiveness** $x$: how far the elite opens institutions to absorb opponents, with seats, jobs and a say.

Opening up has a payoff and a price. Each opponent absorbed is worth $v$ to the elite. Keeping institutions open costs $c\eta$. Absorbing also takes time, $h$ per activist, so institutions can take in at most $1/h$ activists at once.

> Openness survives only if $v > c\eta$: an absorbed opponent must be worth more than keeping the doors open. Otherwise inclusiveness dies out, whatever the starting point.

## The loop

The two forces chase each other round a circle.

<svg class="loop" viewBox="0 0 360 222" role="img" aria-label="The loop: mobilization builds, the elite opens up, activists are absorbed and mobilization falls, openness stops paying and the elite closes, then mobilization builds again."><defs><marker id="loop-head" viewBox="0 0 8 8" refX="6.5" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path class="loop-tip" d="M0,0 L8,4 L0,8 z"/></marker></defs><path class="loop-arc" d="M198.7,44.6 A68,68 0 0 1 245.4,91.3" marker-end="url(#loop-head)"/><path class="loop-arc" d="M245.4,128.7 A68,68 0 0 1 198.7,175.4" marker-end="url(#loop-head)"/><path class="loop-arc" d="M161.3,175.4 A68,68 0 0 1 114.6,128.7" marker-end="url(#loop-head)"/><path class="loop-arc" d="M114.6,91.3 A68,68 0 0 1 161.3,44.6" marker-end="url(#loop-head)"/><text x="180" y="30" text-anchor="middle">Mobilization builds</text><text x="258" y="114" text-anchor="start">Elite opens up</text><text x="180" y="198" text-anchor="middle">Activists absorbed,</text><text x="180" y="212" text-anchor="middle">mobilization falls</text><text x="102" y="100" text-anchor="end">Openness no</text><text x="102" y="114" text-anchor="end">longer pays,</text><text x="102" y="128" text-anchor="end">elite closes</text><text class="loop-mid" x="180" y="106" text-anchor="middle">fed by the</text><text class="loop-mid" x="180" y="120" text-anchor="middle">pool K</text></svg>

1. Young people join, and mobilization builds.
2. The elite opens up, because absorbing opponents pays.
3. Absorption drains mobilization.
4. With few opponents left, openness stops paying and institutions close.
5. The pool refills, and mobilization builds again.

This is the logic of predator and prey in ecology, the Rosenzweig and MacArthur model. Activists are the prey and open institutions the predator.

## Fade or cycle?

Each turn of the loop is either a little smaller than the last or the same size. The size of the pool decides which:

$$K^* = \frac{1}{h} + 2m^*$$

Here $m^*$ is mobilization at the resting point.

::: intuition
A small pool behaves like a pendulum with friction: push it and it swings, but each swing is smaller than the last. A large pool behaves like a clock: mobilization surges faster than institutions can absorb it, overshoots, and the swing never dies. Ecologists call this the paradox of enrichment: feed a pond and predator and prey start to boom and bust.
:::

- **Below $K^*$**, a shock sets off loops that shrink. A new regime is safest at first and most at risk when the first swing comes back.
- **Above $K^*$**, the resting point breaks and a lasting cycle appears. Mathematicians call this a Hopf bifurcation.

Near the threshold every such cycle looks alike. Write $r$ for the distance from the resting point:

$$\dot r = \mu\, r - r^3, \qquad \mu \propto K - K^*$$

When $\mu < 0$, every loop shrinks back to $r = 0$. When $\mu > 0$, small loops grow until the $r^3$ term stops them at $r = \sqrt{\mu}$. So cycles are born small, and their size grows with $\sqrt{K - K^*}$.

## What moves a country across

- **Falling behind the neighbours** fills the pool and raises $K$. A calm autocracy can tip into the loop and start to open.
- **A crisis** speeds the erosion of institutions and drops the country below the threshold. The loop shuts, and a young democracy can close with it.
- **A neighbour turning democratic** pulls a new autocracy toward reopening, until the autocracy consolidates.

## The evidence

The tests use V-Dem, which scores nearly every country's regime each year, from 1950 to 2019. They are repeated under eight different codings of regime type. All three predictions hold:

1. Young autocracies that fall behind their neighbours open up.
2. Crises keep autocracies shut and break young democracies.
3. New autocracies often fall when a neighbour turns democratic, until they consolidate.

## Why it matters

Regime change need not be an accident. The economy decides which side of $K^*$ a country sits on, so the same country can be stable in one decade and cycling in the next. Any shock, a new technology included, matters through two levers: whether absorbing opponents still pays ($v$ against $c\eta$), and how fast institutions can absorb them ($h$, and with it $K^*$).
