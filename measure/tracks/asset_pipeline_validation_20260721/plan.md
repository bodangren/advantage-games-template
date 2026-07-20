# Plan

- [ ] Add failing fixture tests: a manifest binding pointing at a missing file, an oversize or disallowed-format asset, and an asset absent from `ASSET-LICENSES.json` must each fail validation
- [ ] Add a failing fixture test: a cartridge whose bindings, files, and license entries are complete passes validation
- [ ] Extend the validators to resolve every `requiredAssetBindings` entry to a file under the cartridge asset directory
- [ ] Enforce asset format and size limits and require `ASSET-LICENSES.json` coverage for every shipped asset file
- [ ] Document the asset workflow (adding assets, declaring bindings, recording licenses) in `docs/SUBMISSION.md`
- [ ] Run `pnpm validate` and confirm all stages pass, including the new fixtures
