# AOTS3 Cell Saga - local guardrails
- Do not commit, push, publish or deploy. Do not modify the original Namek project or its saves.
- Saves use the isolated `aots3.cell.v1.*` namespace only.
- Never claim a QA gate passed unless it was executed; logs live in tests/logs.
- Commands: `npm run build`, `npm test`, `npm run lint`, `node tests/e2e/playthrough.mjs` (needs dist + Chrome).
