import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.join(process.cwd(), "vendor/apk-beta-source");
const snapshot = JSON.parse(
  await readFile(path.join(root, "SNAPSHOT.json"), "utf8"),
);
const files = (await readdir(root, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name !== "SNAPSHOT.json")
  .map((entry) =>
    path.relative(root, path.join(entry.parentPath, entry.name))
      .split(path.sep)
      .join("/"),
  )
  .sort();
const hash = createHash("sha256");
for (const file of files) {
  hash.update(file);
  hash.update("\0");
  hash.update(await readFile(path.join(root, file)));
  hash.update("\0");
}
const digest = hash.digest("hex");
if (files.length !== snapshot.sourceFileCount) {
  throw new Error(`Upstream source count changed: ${files.length}`);
}
if (digest !== snapshot.sourceTreeSha256) {
  throw new Error(`Upstream source digest changed: ${digest}`);
}

const compatibility = await readFile(
  path.join(
    root,
    "packages/advantage-play-kit/src/compatibility/developer-kit-api.ts",
  ),
  "utf8",
);
const runtimeTypes = await readFile(
  path.join(root, "packages/advantage-play-kit/src/runtime/types.ts"),
  "utf8",
);
if (!compatibility.includes('DEVELOPER_KIT_API_VERSION = "2.0.0"')) {
  throw new Error("Upstream developer-kit API is not 2.0.0");
}
if (!runtimeTypes.includes('APK_RUNTIME_API_VERSION = "1.0.0"')) {
  throw new Error("Upstream runtime API is not 1.0.0");
}

console.log(`Pinned upstream APK source: PASS (${files.length} files)`);
