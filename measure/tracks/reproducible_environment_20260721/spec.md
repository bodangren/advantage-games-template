# Specification

Guarantee every contestant gets an identical, reproducible workspace. Six dependencies in `package.json` (vite, zod, vitest, @vitejs/plugin-react, @types/node, @types/react, among others) use `"latest"` specifiers, so any lockfile regeneration silently jumps major versions. The `engines` field requires Node `>=24 <25` but nothing enforces or explains it, so contestants on the wrong Node get noisy warnings and subtle differences from CI. Review artifacts such as `measure/tracks/**/review-*` are untracked clutter with no ignore rule.

Scope: `package.json` dependency specifiers, `pnpm-lock.yaml`, `.gitignore`, Node version documentation, and validation. No runtime or contract behavior changes.
