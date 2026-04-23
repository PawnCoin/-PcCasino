import { expect, type Page } from '@playwright/test';

/**
 * Navigate from the marketing landing into the lobby and open a game card.
 * The SPA uses in-memory routing (setCurrentView), so direct URLs do not work.
 */
export async function enterGame(page: Page, gameName: 'Poker' | 'Dominoes'): Promise<void> {
  await page.goto('/');

  // Landing page exposes a primary "START PLAYING" CTA when not yet in lobby.
  const startBtn = page.getByRole('button', { name: /start playing/i }).first();
  if (await startBtn.isVisible()) {
    await startBtn.click();
  }

  const card = page
    .locator(
      `[class*="cursor-pointer"]:has-text("${gameName}"), button:has-text("${gameName}"), [role="button"]:has-text("${gameName}")`,
    )
    .first();
  await expect(card, `${gameName} lobby card should be visible`).toBeVisible({ timeout: 15_000 });
  await card.click();
}
