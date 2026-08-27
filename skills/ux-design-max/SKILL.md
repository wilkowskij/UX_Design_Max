---
name: ux-design-max
description: Install and run a four-agent design-build-router pipeline (research → design → build → review) that routes each stage of feature work to the right model — Haiku for research, Opus for design and review, Sonnet for implementation — with a built-in escalation path when the builder gets stuck. Use this whenever the user wants to set up a structured multi-agent workflow for building a feature end-to-end, wants research/design/build/review split across separate subagents instead of one agent doing everything, wants to cut cost by routing routine work to a cheaper model, or mentions wanting an escalation protocol so a stuck bug doesn't loop forever on retries. Also trigger when the user asks to install, package, or distribute this exact pipeline as a Claude Skill.
---

# UX Design Max — Design-Build Router

A four-agent pipeline that splits feature work into four roles, each on the model suited to it, with a defined handoff between stages and an explicit escalation path for stuck bugs.

## Why split the work this way

A single agent doing research, design, implementation, and review in one pass tends to blur the boundaries between them — it starts coding before the design is settled, or reviews its own work with the same blind spots it built it with. Splitting these into separate subagents forces each handoff to be explicit: research hands facts to design, design hands a concrete spec to build, build hands a diff to review. Each stage also runs on the model it actually needs — cheap and fast for research, careful reasoning for design and review, straightforward execution for implementation — which cuts cost without cutting quality on the stages that need it.

## The four agents

| Agent | Model | Role |
|---|---|---|
| `research-agent` | Haiku | Read-only research and codebase/doc exploration. Never edits files, never makes design decisions. |
| `design-agent` | Opus | Turns a feature/change into a concrete design (UX flow, component/API shape, architecture). Always states an explicit trade-off it considered — this self-review step is mandatory, not optional. |
| `build-agent` | Sonnet | Implements exactly the design it's handed. Doesn't expand scope or make its own design calls. Stops and escalates after two failed attempts at the same fix, rather than trying a third. |
| `code-reviewer-agent` | Opus | Reviews finished work against both the design/spec and general correctness/security/maintainability. Also the escalation target when build-agent has failed twice on the same issue — diagnoses with fresh eyes instead of repeating what already failed. |

Full system prompts for each are in `references/agents/`.

## Installing the pipeline into a project

1. Copy the four files from `references/agents/` into the target project's `.claude/agents/` (project scope, shared via version control) or `~/.claude/agents/` (personal scope, all projects). Project scope is the default — use personal scope only if the user asks for it explicitly.
2. Before copying, check whether a file of the same name already exists at the destination. If it does, stop and ask whether to overwrite or merge — don't silently clobber a customized agent. `code-reviewer-agent` in particular is a name shared with other skills (e.g. `smart-model-router`); if both are in play, ask whether to merge the two role descriptions or keep them side by side under different names.
3. After copying, smoke-test each agent independently with a trivial, single-purpose prompt before relying on it in a real pipeline:
   - `research-agent`: ask it a factual question about the codebase; confirm it cites a real file and doesn't try to edit anything.
   - `design-agent`: ask it to sketch a small design; confirm it states an explicit trade-off, not just a plan.
   - `build-agent`: give it a one-line design; confirm it implements exactly that and doesn't expand scope.
   - `code-reviewer-agent`: give it an obviously buggy stub; confirm it states the bug plainly rather than hedging.
4. Newly created agent definition files may not be visible to the Task/Agent tool until the session picks up the updated agent registry — if a dispatch fails with "agent type not found" right after installing, that's the likely cause, not a bad file. Retrying after the registry refreshes (e.g. next turn, or a fresh session) resolves it.

## Running the pipeline on a real feature

Run the four agents in sequence, passing each stage's real output as the next stage's input — don't fill gaps yourself in between, since that's exactly what the pipeline is meant to test and enforce:

1. **research-agent** — find the existing patterns, components, or conventions relevant to the feature.
2. **design-agent** — hand it the research findings; get back a concrete, implementable design plus its stated trade-off.
3. **build-agent** — hand it the design verbatim; get back the exact diff and what was verified.
4. **code-reviewer-agent** — hand it both the design and the build output; get back a match/mismatch verdict plus correctness/security/quality findings.

## The escalation path

If build-agent fails to fix the same issue twice, it should stop rather than attempt a third fix. Escalate to `code-reviewer-agent` with:
- The original design/spec.
- The bug as observed.
- Both failed attempts and, for each, why it didn't work.

`code-reviewer-agent` should diagnose the root cause without repeating either failed attempt — usually by noticing that both attempts touched a code path that isn't actually the one driving the bug (e.g. a display-layer fix when the bug is in a validation function, or a change to unrelated logic). It hands back a specific, different, concrete fix, or states plainly that it can't resolve it and why.

## A note on review accuracy

`code-reviewer-agent` is thorough but not infallible — in testing it correctly diagnosed a real escalated bug on the first pass, but also once flagged an issue as unfixed when the fix was already present in the file. Treat its findings as strong signal worth verifying against the actual code before treating a "still broken" claim as final, especially before deciding not to ship something it flagged.
