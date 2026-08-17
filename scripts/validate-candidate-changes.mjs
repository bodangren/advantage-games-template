import { execFileSync } from "node:child_process";
import { findProtectedPaths } from "./candidate-validation.mjs";

function gitPaths(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split(/\r?\n/u)
    .filter(Boolean);
}

const baseRef = process.env.CANDIDATE_BASE_REF?.trim();
const changedPaths = new Set(
  gitPaths([
    "diff",
    "--name-only",
    "--diff-filter=ACDMRTUXB",
    baseRef ? `${baseRef}...HEAD` : "HEAD",
  ]),
);

if (baseRef) {
  for (const changedPath of gitPaths([
    "diff",
    "--name-only",
    "--diff-filter=ACDMRTUXB",
    "HEAD",
  ])) {
    changedPaths.add(changedPath);
  }
}

for (const changedPath of gitPaths([
  "ls-files",
  "--others",
  "--exclude-standard",
])) {
  changedPaths.add(changedPath);
}

const protectedPaths = findProtectedPaths(changedPaths);
if (protectedPaths.length > 0) {
  const shownPaths = protectedPaths.slice(0, 50);
  const omittedCount = protectedPaths.length - shownPaths.length;
  throw new Error(
    `Candidate changes include ${protectedPaths.length} maintainer-owned paths:\n${shownPaths.map((file) => `- ${file}`).join("\n")}${omittedCount > 0 ? `\n- ... ${omittedCount} more` : ""}`,
  );
}

console.log("Candidate change boundary: PASS");
