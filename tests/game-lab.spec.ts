import { expect, test } from "playwright/test";

test("completes at compact size and preserves state at wide size", async ({ page }) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator("canvas")).toBeVisible();

  await page.keyboard.press("Digit1");
  await page.waitForTimeout(350);
  await page.keyboard.press("Digit2");
  await page.waitForTimeout(350);
  await page.keyboard.press("Digit1");

  await expect(page.locator("aside pre")).toContainText('"totalAttempts": 3');
  await expect(page.locator("aside pre")).toContainText('"correctAnswers": 3');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Wide 1440x900" }).click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator("canvas")).toBeVisible();
  await expect(page.locator("section.frame")).toHaveClass(/wide/);
  await expect(page.locator("aside pre")).toContainText('"totalAttempts": 3');
  const frame = await page.locator("section.frame").boundingBox();
  expect(frame?.width).toBeGreaterThan(1000);
  expect(browserErrors).toEqual([]);
});
