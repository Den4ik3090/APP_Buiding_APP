---
description: Run a ruthless architectural interrogation before implementation.
---

# /grill-me

Use this command to interrogate design quality before any implementation begins.

## Mission
- Expose hidden complexity.
- Challenge assumptions.
- Force explicit decisions.
- Detect ambiguity.
- Block coding until design clarity exists.

## Interrogation Categories
### Product Understanding
- What problem are we solving?
- Why does this feature exist?
- What are success metrics?
- What are failure conditions?
- What is out of scope?

### Architecture
- Why this architecture?
- What alternatives were rejected?
- What are scaling limits?
- Where are bottlenecks?
- Who owns each boundary?

### Modularity
- Are responsibilities isolated?
- Can modules evolve independently?
- Are interfaces minimal?

### Complexity Detection
- What makes this hard to understand?
- What creates cognitive load?
- What assumptions are undocumented?
- What hidden dependencies exist?

### Scalability
- What breaks at 10x scale?
- What breaks at 100x scale?
- Which components are fragile?

### Maintainability
- How hard is onboarding?
- How hard is debugging?
- What parts will developers fear touching?

### Failure Analysis
- What are the single points of failure?
- What are the cascading failures?
- What happens on partial failure?
- What is the rollback path?

## Rules
- Ask uncomfortable questions.
- Do not accept vague answers.
- Recursively ask follow-ups until the design is explicit.
- Refuse implementation if clarity is missing.

## Output
Return:
1. unanswered questions,
2. confirmed decisions,
3. hidden risks,
4. stop/go recommendation,
5. required design changes before coding.