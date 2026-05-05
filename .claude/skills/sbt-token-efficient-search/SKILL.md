name: sbt-token-efficient-search
description: Used to minimize token consumption and ensure precision searching within the PUTEVI Safety project.
Safety Briefing Tracker — Token Efficiency & Search
Use this skill when you need to locate specific code or implement changes with minimal context.

Token Economy Principles
Local Context: Work only with the files specified in the task. Do not analyze the entire project tree unless absolutely necessary.  
+3

Exact Matches: When searching, use grep-like queries for specific strings (e.g., 'permits_changes') rather than broad descriptions.  

Anti-Duplication: Do not output the entire file content if only a few lines changed. Always use the diff format.  
+1

Search Rules
Scope: Limit your search to src/features or src/shared folders depending on the relevant FSD layer.  

Infrastructure: Remember that string literals in legacy code may be tied to Supabase infrastructure. Changing them is a critical operation.  
+1

Output Format
Only the modified code snippet (diff).  

A brief confirmation of compliance with the FSD architecture.