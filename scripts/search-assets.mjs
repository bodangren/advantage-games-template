import { readFile } from "node:fs/promises";

const term = process.argv.slice(2)
  .filter((argument) => argument !== "--")
  .join(" ")
  .trim()
  .toLowerCase();
if (!term) {
  console.error("Usage: pnpm assets:search -- <term>");
  process.exitCode = 1;
} else {
  const catalog = JSON.parse(
    await readFile(
      "packages/advantage-play-kit/assets/standard/standard-pack-release.json",
      "utf8",
    ),
  );
  const matches = catalog.assets
    .filter((asset) =>
      [asset.key, asset.view, asset.category]
        .some((value) => String(value).toLowerCase().includes(term)),
    )
    .slice(0, 50)
    .map((asset) => ({
      key: asset.key,
      view: asset.view,
      size: asset.physical.dimensions,
    }));
  console.log(JSON.stringify(matches, null, 2));
  if (matches.length === 50) {
    console.error("Showing the first 50 matches. Use a more specific term to narrow the result.");
  }
}
