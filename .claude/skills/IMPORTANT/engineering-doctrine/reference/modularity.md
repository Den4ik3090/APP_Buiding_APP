# Modularity

## Questions
- Are responsibilities isolated?
- Can modules evolve independently?
- Are interfaces minimal?
- Does this module do one coherent thing?
- Does changing one feature force changes in many files?

## Bad Signals
- god classes,
- shotgun surgery,
- shared mutable state,
- duplicate responsibilities,
- leaky abstractions,
- modules that expose implementation details.

## Desired Shape
- high cohesion,
- low coupling,
- small interfaces,
- explicit contracts,
- clear ownership,
- localized change impact.