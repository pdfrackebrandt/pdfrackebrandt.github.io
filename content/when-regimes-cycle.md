## The question

Many countries swing between democracy and autocracy for decades. Polybius called the pattern anacyclosis. Do the swings need a run of bad luck, or do they have an engine of their own? In this model they have one, and the economy decides when it starts and when it stops.

## The model

A country is two numbers, measured around its steady state: inclusiveness $x$, how open its institutions are, and mobilization $m$, how many of its people are mobilized. Mobilization has a ceiling $K$: the pool of young people free to be mobilized. Institutions absorb activists, and $h$ is the time they need per activist. The structure is the Rosenzweig and MacArthur model from population ecology.

> Inclusive institutions exist only if $v > c\eta$: an elite's gain from absorbing an opponent, $v$, must exceed the cost of keeping institutions open, $c\eta$. Otherwise $x \to 0$ from every starting point.

## The threshold

One number decides the dynamics:

$$K^* = \frac{1}{h} + 2m^*$$

where $m^*$ is mobilization at the steady state. Below $K^*$ the steady state is a stable focus: after a shock the country spirals back in loops. Above it the steady state loses stability and a limit cycle appears. This is a Hopf bifurcation.

Near the threshold the dynamics reduce to the Hopf normal form. Write $r$ for the distance from the steady state and $\varphi$ for the phase of the loop:

$$\dot r = \mu\, r - r^3, \qquad \dot\varphi = \omega, \qquad \mu \propto K - K^*$$

The loops take $2\pi/\omega$ to complete, the model's own period.

- If $K < K^*$, then $\mu < 0$ and $r \to 0$. Shocks fade in loops, so a new regime is safest at first and most at risk when the first swing comes back.
- If $K > K^*$, then $\mu > 0$ and $r \to \sqrt{\mu}$. The country keeps cycling, and the cycle starts small: its size grows with $\sqrt{K - K^*}$.

## What moves a country across

Falling behind the neighbours enlarges the pool of young people and raises $K$. A crisis speeds the erosion of institutions, which drops the country below the threshold and closes the regime. New autocracies also respond to an outside pull toward reopening, which acts only until they consolidate.

## The evidence

The tests use V-Dem from 1950 to 2019 and repeat under eight codings of regime type. All three predictions hold:

1. Young autocracies that fall behind their neighbours open up.
2. Crises keep autocracies shut and break young democracies.
3. New autocracies often fall when a neighbour turns democratic, until they consolidate.

## What it means

The cycle is conditional. The economy sets which side of $K^*$ a country sits on, and one pool of young people answers two triggers: relative decline opens autocracies, outright crisis breaks young democracies. The thresholds also say what any shock must move to matter: $v$ against $c\eta$, or $h$ and with it $K^*$.
