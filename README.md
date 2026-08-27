# UX Design Max

A four-agent **design-build-router** pipeline for Claude Code: separate subagents for research, design, implementation, and review, each running on the model suited to its job, with a defined handoff between stages and a built-in escalation path when a fix doesn't stick.

## Why

A single agent doing research, design, implementation, and review in one pass tends to blur the boundaries between them — it starts coding before a design is settled, or reviews its own work with the same blind spots that built it. Splitting the work into four roles forces every handoff to be explicit, and lets each stage run on the model it actually needs instead of paying premium-model cost for routine research or paying junior-model risk for design and review.

## The four agents

| Agent | Model | Role |
|---|---|---|
| `research-agent` | Haiku | Read-only research and codebase/doc exploration. Never edits files, never makes design decisions. |
| `design-agent` | Opus | Turns a feature or change into a concrete design (UX flow, component/API shape, architecture). Always states an explicit trade-off it considered — the self-review step is mandatory. |
| `build-agent` | Sonnet | Implements exactly the design it's handed. Doesn't expand scope or invent its own design calls. Stops and escalates after two failed attempts at the same fix rather than trying a third. |
| `code-reviewer-agent` | Opus | Reviews finished work against both the design/spec and general correctness, security, and maintainability. Also the escalation target when `build-agent` has failed twice on the same issue. |

Agent definitions live in [`.claude/agents/`](.claude/agents/) and are picked up automatically by Claude Code's Task/Agent tool in this repo.

## Repository layout

```
.claude/agents/          Installed agent definitions (project scope)
skills/ux-design-max/    The pipeline packaged as a distributable Claude Skill
  SKILL.md               Skill manifest — install/run/escalation instructions
  references/agents/     Copies of the four agent definitions, bundled for distribution
dist/                    Packaged .skill zip for upload to Claude's skill library
```

## Using the pipeline

Run the four agents in sequence, passing each stage's real output as the next stage's input:

1. **research-agent** — find the existing patterns, components, or conventions relevant to the feature.
2. **design-agent** — hand it the research findings; get back a concrete, implementable design plus its stated trade-off.
3. **build-agent** — hand it the design verbatim; get back the exact diff and what was verified.
4. **code-reviewer-agent** — hand it both the design and the build output; get back a match/mismatch verdict plus correctness/security/quality findings.

### Escalation path

If `build-agent` fails to fix the same issue twice, it stops rather than attempting a third fix. Escalate to `code-reviewer-agent` with the original design, the bug as observed, and both failed attempts (and why each one didn't work). `code-reviewer-agent` diagnoses the root cause with fresh eyes instead of repeating either failed attempt, and hands back a specific, different, concrete fix — or states plainly that it can't resolve it and why.

This was tested end-to-end in this repo: a deliberately introduced off-by-one bug, paired with two fabricated failed fix attempts, was correctly diagnosed by `code-reviewer-agent` on the first pass, including a clear explanation of why each fake attempt could never have worked.

### A note on review accuracy

`code-reviewer-agent` is thorough but not infallible. In testing it correctly diagnosed a real escalated bug, but also once flagged a previously-fixed issue as still broken. Treat its findings as strong signal worth verifying against the actual code, especially before deciding not to ship something it flagged.

## Installing into another project

1. Copy the four files from `.claude/agents/` (or `skills/ux-design-max/references/agents/`) into the target project's `.claude/agents/` (project scope, shared via version control) or `~/.claude/agents/` (personal scope, all projects).
2. If a file of the same name already exists at the destination, don't overwrite silently — `code-reviewer-agent` in particular is a name shared with other skills (e.g. `smart-model-router`); decide whether to merge the role descriptions or keep them separate.
3. Smoke-test each agent independently with a trivial prompt before relying on it in a real pipeline (see `skills/ux-design-max/SKILL.md` for exact test prompts and expected behavior).
4. Newly created agent definition files may not be visible to the Task/Agent tool until the session's agent registry refreshes — an immediate "agent type not found" error after installing is a registry-timing issue, not a bad file.

## Installing as a Claude Skill

The pipeline is also packaged as a standalone Claude Skill at [`skills/ux-design-max/`](skills/ux-design-max/), zipped for distribution at `dist/ux-design-max.skill`. Upload that file through Claude's skill creation flow (claude.ai) to install the pipeline into your own skill library.
