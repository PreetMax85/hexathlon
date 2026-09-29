# Hexathlon: rules for agents

At the start of every session, read `docs/SPEC.md`, `docs/PLAN.md` and `docs/BUILD_LOG.md`.
Continue from the first phase that BUILD_LOG doesn't mark as done.

## Working rules
- Follow `docs/PLAN.md`. Run all phases through to the end **without stopping to ask**. Stop only for a true blocker (see PLAN).
- **Commit after every logical change.** One focused change per commit, using Conventional Commits (`feat(engine): ...`, `fix(ui): ...`, `test: ...`, `docs: ...`). Add a body line `Phase: P<n>`.
- Before every commit, `pnpm check` must pass. Never commit failing tests, and never skip or weaken a test to make it pass.
- Push after each phase at minimum.
- Never commit secrets. `.env*` stays gitignored, and `DATABASE_URL` comes from the environment.
- `src/engine/` is pure TypeScript with no imports from React, Next or the DB. The UI and API both import the engine. The server re-verifies every result from the seed.
- Check the current documentation before using any library API. If docs are unreachable, read the installed package's type definitions. Never guess signatures.
- Don't add a new dependency without a one-line reason in BUILD_LOG.
- Follow SPEC exactly. If SPEC is ambiguous, pick the simplest reasonable reading, record it under "Decisions" in BUILD_LOG, and keep going.
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
