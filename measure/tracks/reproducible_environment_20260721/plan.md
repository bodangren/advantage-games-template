# Plan

- [ ] Add failing checks: a script test asserting no `"latest"` specifiers remain in `package.json` and that the running Node major matches `engines`
- [ ] Pin every `"latest"` dependency to the exact version already resolved in `pnpm-lock.yaml` and regenerate the lockfile
- [ ] Document the Node `>=24 <25` requirement in `README.md` alongside the existing `.nvmrc`/`.node-version` files, and surface a clear engine error in `validate:submission`
- [ ] Add `measure/tracks/**/review-*` to `.gitignore`
- [ ] Run `pnpm install --frozen-lockfile` and `pnpm validate` on a clean checkout to confirm reproducibility
