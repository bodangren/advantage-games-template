# Plan

- [ ] Add failing tests: `resume()` resumes only previously paused scenes; `choicesFor` never emits duplicate identical choices for single-item input
- [ ] Add failing tests: `mountCartridge` happy path — mount, validated completion emitted exactly once, restart, unmount leaks nothing
- [ ] Add tests: invalid input and invalid result payloads are rejected by the kit's Zod validation
- [ ] Fix `resume()` scene selection and the `choicesFor` degenerate case (or enforce a minimum input length in the contract)
- [ ] Run `pnpm validate` and confirm all new and existing tests pass
