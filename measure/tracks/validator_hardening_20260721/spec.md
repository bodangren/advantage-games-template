# Specification

Make the submission validators prove what they claim. `scripts/validate-import.mjs` prints "import dry run: PASS" but only checks that five files exist; it must actually dynamic-import the built cartridge and smoke-run the manifest and entry-point contract. `scripts/validate-submission.mjs` hardcodes rules already declared in `submission.schema.json`, so the two can drift; the schema must become the single source of truth. `pnpm test` is hardcoded to one cartridge test file and silently ignores every other test in the workspace, including the negative fixtures this track adds.

Scope: `scripts/`, `submission.schema.json`, the `test` script in `package.json`, and new validator fixtures. Contract semantics stay unchanged.
