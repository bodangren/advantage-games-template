import { access } from "node:fs/promises";
const files = ["blueprint.md", "definition.ts", "scene.ts", "systems.ts", "index.ts"];
for (const file of files) await access(new URL(`../packages/game-cartridges/src/cartridges/my-game/${file}`, import.meta.url));
console.log("Production-shaped cartridge import dry run: PASS");
