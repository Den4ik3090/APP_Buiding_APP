---
name: sbt-safe-move
description: A protocol for safe file movement with automatic import updates and project verification.
---

# Safe Move Protocol (v1.0)

This skill is activated when files or entire directories are moved to ensure the architectural integrity of the PUTEVI Safety project.

##1. Pre-scan phase (Pre-flight)
Before physically moving any file:
* **Dependency Analysis:* Scan the entire project (especially `src/pages` and `src/features') for imports of the file being moved.
* **Asset Check:** Check whether the file itself imports local resources: styles ('.scss`, `.css`), images, or types.

## 2. Physical relocation and refactoring of imports
When executing the `mv` command or its analogues:
* **Relative Path Correction:** Automatically update relative paths (`../`, `./`) inside the moved file, so that they point to the current position of the dependencies.
* **External Reference Update:** Update the paths in all the consumer files that import the moved component.
* **FSD Import Rules:** 
    * Use relative paths inside a single slice (for example, inside `features/permissions').
    * Between layers (from `pages` to `features`), use absolute aliases via `@/'.

## 3. Saving styles and related files (Co-location)
* **Style Binding:** Always move `.scss`, `.module.scss` or `.css` files along with their `.tsx/'.jsx` components.
* **Index Update:** If there is an `index.ts` (Public API) in the target folder, add the export of the moved component to it.

## 4. Mandatory verification (Post-flight)
After each significant move (or a group of moves from a single RoadMap step):
1. **TypeScript Check:** Run `npx tsc --noEmit'. 
2. **Error Handling:** If import or type errors are found, fix them immediately. Do not proceed to the next step of restructuring until the current one is confirmed as "Clean".
3. **Log Progress:** Make a mark in `Migration.md `about the completion of a specific stage of movement.

> **Principle:** It's better to move one file and make sure everything works, than to move ten and look for an error in the paths.