import Phaser from "phaser";
import type { SoilLevel } from "../systems/MineGrid";
import { MINE_ROCK } from "../data/visual";

/**
 * Terraria-style block break: spawns a burst of stone/ore fragment particles and
 * a little rock-dust puff at the dug cell, then animates them away.
 */
export function spawnDigParticles(
  scene: Phaser.Scene,
  x: number,
  y: number,
  cell: number,
  soil: SoilLevel,
  count = 8
): void {
  const palette = MINE_ROCK[soil];
  for (let i = 0; i < count; i++) {
    const angle = Phaser.Math.FloatBetween(-Math.PI, 0);
    const speed = Phaser.Math.FloatBetween(cell * 2, cell * 4);
    // Sprinkle in ore-coloured chips alongside the rock chunks.
    const color = i % 3 === 0 ? palette.ore : palette.rock;
    const particle = scene.add.rectangle(x, y, Phaser.Math.Between(2, Math.max(3, cell * 0.12)), Phaser.Math.Between(2, Math.max(3, cell * 0.12)), color, 1);
    particle.setDepth(6);
    scene.tweens.add({
      targets: particle,
      x: x + Math.cos(angle) * speed,
      y: y + Math.sin(angle) * speed + cell * 0.5,
      angle: Phaser.Math.Between(-180, 180),
      alpha: 0,
      duration: Phaser.Math.Between(350, 600),
      ease: "Cubic.easeOut",
      onComplete: () => particle.destroy(),
    });
  }
  // Rock-dust puff
  const puff = scene.add.circle(x, y, cell * 0.25, palette.speck, 0.5);
  puff.setDepth(5);
  scene.tweens.add({
    targets: puff,
    scale: 1.8,
    alpha: 0,
    duration: 300,
    ease: "Quad.easeOut",
    onComplete: () => puff.destroy(),
  });
}

/**
 * A gem that pops out of a dug block (bounces) then fades — used to sell the
 * Terraria dig feel before the letter is counted toward the spelling goal.
 */
export function spawnGemPop(
  scene: Phaser.Scene,
  obj: { setDepth: (d: number) => void; setScale: (s: number) => void; setAlpha: (a: number) => void },
): void {
  obj.setDepth(7);
  obj.setScale(0.2);
  scene.tweens.add({
    targets: obj,
    scale: 1,
    alpha: 1,
    duration: 140,
    ease: "Back.easeOut",
  });
}