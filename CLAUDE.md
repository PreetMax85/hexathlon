# Hexathlon: rules for agents

At the start of every session, read `PRODUCT.md`, `docs/PLAN-v1.1.md`, `docs/BUILD_LOG.md` and the current plan, `docs/PLAN-v1.4.md`.
Continue from the first phase that BUILD_LOG doesn't mark as done. v1 (P0–P5, `docs/PLAN.md`) is done.

## Working rules
- Follow `docs/PLAN-v1.1.md`. Run all phases through to the end **without stopping to ask**. Stop only for a true blocker (see the plan).
- Use the skills vendored in `.claude/skills/`: `impeccable` for all UI work, `tdd` for engine and server changes, and `improve-codebase-architecture` and `code-review` in the final phase.
- You have design latitude. `PRODUCT.md`, the briefs in `docs/briefs/` and the direction contract in `.impeccable/surfaces/src-app.md` set the bar, and you make the calls within them.
- **Commit after every logical change.** One focused change per commit, using Conventional Commits (`feat(engine): ...`, `fix(ui): ...`, `test: ...`, `docs: ...`). Add a body line `Phase: V<n>`.
- Before every commit, `pnpm check` must pass. Never commit failing tests, and never skip or weaken a test to make it pass.
- Push after each phase at minimum.
- Never commit secrets. `.env*` stays gitignored, and `DATABASE_URL` comes from the environment.
- `src/engine/` is pure TypeScript with no imports from React, Next or the DB. The UI and API both import the engine. The server re-verifies every result from the seed.
- Check the current documentation before using any library API. If docs are unreachable, read the installed package's type definitions. Never guess signatures.
- Don't add a new dependency without a one-line reason in BUILD_LOG.
- `docs/SPEC.md` describes v1. Where `PRODUCT.md`, the briefs or `docs/PLAN-v1.1.md` differ from it, they win. If something is ambiguous, pick the reading that best serves `PRODUCT.md`'s principles, record it under "Decisions" in BUILD_LOG, and keep going.
- IP rule: never use "Catan" or "Settlers" in code, UI or copy.

## BUILD_LOG entry format (append at the end of each phase)
```
## P<n> — <name> — done
- What shipped:
- Decisions (and why):
- What broke and how it was fixed:
- Tests: <count> passing
- Notes for next phase:
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
