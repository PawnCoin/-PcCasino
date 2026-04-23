import { expect, test } from '@playwright/test';
import { authenticatePage, registerTestUser } from './helpers/auth';
import { enterGame } from './helpers/lobby';

const DOMINOES_AI = ['Carlos', 'Maya', 'Zara'];

test.describe('Dominoes — in-game opponent profile popup', () => {
  test('opens AI opponent popup with action / score / tiles and disabled Add Friend', async ({
    page,
    request,
  }) => {
    const { token } = await registerTestUser(request, 'dom');
    await authenticatePage(page, token);

    await enterGame(page, 'Dominoes');

    // Dominoes opens to a setup screen. The fastest path to seeing AI seats
    // (which carry the clickable PublicProfileCard avatars) is the free
    // practice button — it skips bet confirmation and proceeds directly to
    // washing → picking, where PlayerSeat components render the AI avatars
    // with title="View {name}".
    const practiceBtn = page.getByRole('button', { name: /Start Free Practice/i });
    await expect(practiceBtn, 'Dominoes setup should show practice start button').toBeVisible({
      timeout: 15_000,
    });
    await practiceBtn.click();

    // Wait for one of the AI opponent seats to be clickable.
    const opponentSelector = DOMINOES_AI.map((n) => `[title="View ${n}"]`).join(', ');
    const opponentAvatar = page.locator(opponentSelector).first();
    await expect(opponentAvatar, 'a Dominoes AI opponent avatar should be clickable').toBeVisible({
      timeout: 30_000,
    });

    const titleAttr = (await opponentAvatar.getAttribute('title')) ?? '';
    const dominoName = titleAttr.replace(/^View\s+/, '').trim();
    expect(DOMINOES_AI).toContain(dominoName);

    await opponentAvatar.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await expect(dialog.getByRole('heading', { name: dominoName, exact: true })).toBeVisible();
    await expect(dialog.getByText('AI Opponent', { exact: true }).first()).toBeVisible();

    // Live · Dominoes header.
    await expect(dialog.getByText(/Live/i).first()).toBeVisible();
    await expect(dialog.getByText(/Dominoes/i).first()).toBeVisible();

    // Three columns: Action / Score / Tiles (dominoes-specific overrides for
    // betLabel and cashLabel).
    await expect(dialog.getByText(/^Action$/i).first()).toBeVisible();
    await expect(dialog.getByText(/^Score$/i).first()).toBeVisible();
    await expect(dialog.getByText(/^Tiles$/i).first()).toBeVisible();

    // Action chip should show PLAYING / KNOCKED, or the placeholder dash.
    const dialogText = (await dialog.innerText()).replace(/\s+/g, ' ');
    expect(dialogText).toMatch(/PLAYING|KNOCKED|—/);

    // Tile count: at game start each AI holds 7 tiles; assert a numeric tiles
    // value is present in the dialog.
    expect(dialogText).toMatch(/\b\d+\b/);

    // Add Friend gating for AI: italic line present, no enabled Add Friend button.
    await expect(dialog.getByText(/AI opponents can't be added as friends/i)).toBeVisible();
    const addFriendBtn = dialog.getByRole('button', { name: /^Add Friend$/i });
    expect(await addFriendBtn.count()).toBe(0);

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });
});
