import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
export default defineConfig({ root: fileURLToPath(new URL(".", import.meta.url)), plugins: [react()], resolve: { alias: { "@reading-advantage/game-contracts": fileURLToPath(new URL("../../packages/game-contracts/src/index.ts", import.meta.url)), "@reading-advantage/advantage-play-kit": fileURLToPath(new URL("../../packages/advantage-play-kit/src/index.ts", import.meta.url)), "@reading-advantage/game-cartridges": fileURLToPath(new URL("../../packages/game-cartridges/src/index.ts", import.meta.url)) } }, build: { outDir: fileURLToPath(new URL("../../dist", import.meta.url)), emptyOutDir: true } });
