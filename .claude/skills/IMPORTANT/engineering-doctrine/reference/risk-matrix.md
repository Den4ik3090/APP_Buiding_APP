# Risk Matrix

| Rating | Meaning | Action |
|---|---|---|
| Excellent | Clear, modular, observable, low-risk | Approve |
| Good | Acceptable, minor issues only | Approve with notes |
| Risky | Noticeable design or operational risk | Require mitigation |
| Dangerous | High chance of failure or long-term decay | Block until fixed |
| Critical | Threatens reliability, velocity, or data integrity | Stop implementation immediately |

## Evaluation Axes
- maintainability,
- readability,
- modularity,
- scalability,
- cognitive complexity,
- operational risk,
- engineering maturity.

## Rule
If any axis is Critical, the overall result is Critical.