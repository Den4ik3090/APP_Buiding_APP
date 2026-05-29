# Architecture

## Questions
- Why this architecture?
- What alternatives were rejected?
- What are the tradeoffs?
- Where are the bottlenecks?
- What breaks first at scale?
- What are the ownership boundaries?
- What is the single source of truth?

## Rules
- Every architecture must be defensible.
- Every boundary must be explicit.
- Every dependency must have a reason.
- Every shared responsibility must be suspicious.
- Every hidden coupling is a defect.

## Required Analysis
- component boundaries,
- dependency direction,
- data ownership,
- deployment shape,
- integration points,
- scaling limits,
- rollback strategy.