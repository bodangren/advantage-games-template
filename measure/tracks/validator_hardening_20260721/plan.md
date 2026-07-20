# Plan

- [ ] Add failing fixture tests: deliberately broken submissions (bad metadata, missing file, forbidden import, unimportable cartridge) must make the validators exit non-zero
- [ ] Add a failing test: a valid built cartridge passes a real dynamic-import dry run
- [ ] Rewrite `validate-import.mjs` to dynamic-import the built cartridge and assert manifest fields and the runtime entry point
- [ ] Rewrite `validate-submission.mjs` to validate `submission.json` against `submission.schema.json` instead of duplicated hardcoded rules
- [ ] Widen the `test` script to run the full Vitest workspace suite
- [ ] Run `pnpm validate` and confirm all stages pass, including the new fixture tests
