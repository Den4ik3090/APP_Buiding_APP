# Failure Analysis

## Questions
- What are the single points of failure?
- What failure cascades are possible?
- Where can state be corrupted?
- Where are race conditions likely?
- What happens during deployment failure?
- How do we recover?
- What is the rollback path?

## Required Review
- SPOF,
- cascading failure,
- partial failure,
- retry storms,
- data corruption,
- idempotency,
- recovery procedure,
- observability gaps.

## Rule
If failure modes are unknown, implementation is blocked.