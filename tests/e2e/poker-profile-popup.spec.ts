import { expect, test } from '@playwright/test';
import { authenticatePage, registerTestUser } from './helpers/auth';
import { enterGame } from './helpers/lobby';

const POKER_OPPONENTS = ['Taylor', 'Morgan', 'Jordan', 'Riley', 'Casey'];

test.describe('Poker — in-game opponent profile popup', () => {
  test('opens AI opponent popup with action / wager / stack and disabled Add Friend', async ({
    page,
    request,
  }) => {
    const { token } = await registerTestUser(request, 'pkr');
    await authenticatePage(page, token);

    await enterGame(page, 'Poker');

    // Wait for at least one Poker AI opponent's clickable avatar (title="View {name}").
    const opponentSelector = POKER_OPPONENTS
      .map((n) => `[title="View ${n}"]`)
      .join(', ');
    const opponentAvatar = page.locator(opponentSelector).first();
    await expect(opponentAvatar, 'an AI opponent avatar should be clickable').toBeVisible({
      timeout: 20_000,
    });

    const titleAttr = (await opponentAvatar.getAttribute('title')) ?? '';
    const oppName = titleAttr.replace(/^View\s+/, '').trim();
    expect(POKER_OPPONENTS).toContain(oppName);

    await opponentAvatar.click();

    // Profile dialog opens.
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Heading shows the opponent's display name + AI Opponent label.
    await expect(dialog.getByRole('heading', { name: oppName, exact: true })).toBeVisible();
    await expect(dialog.getByText('AI Opponent', { exact: true }).first()).toBeVisible();

    // Live · Poker section header is present (visible "Live" + "Poker" heading).
    await expect(dialog.getByText(/Live/i).first()).toBeVisible();
    await expect(dialog.getByText(/Poker/i).first()).toBeVisible();

    // Three columns: Action / Wager / Stack (poker overrides cashLabel to 'Stack').
    await expect(dialog.getByText(/^Action$/i).first()).toBeVisible();
    await expect(dialog.getByText(/^Wager$/i).first()).toBeVisible();
    await expect(dialog.getByText(/^Stack$/i).first()).toBeVisible();

    // Stack must show a numeric value (digits, optionally with thousands
    // separators), not the dash placeholder.
    const dialogText = (await dialog.innerText()).replace(/\s+/g, ' ');
    expect(dialogText, 'dialog should contain a numeric stack value').toMatch(/\d{1,3}(?:,\d{3})*|\d+/);

    // Add Friend gating: bots show the italic AI line and have no enabled
    // "Add Friend" button at all.
    await expect(dialog.getByText(/AI opponents can't be added as friends/i)).toBeVisible();
    const addFriendBtn = dialog.getByRole('button', { name: /^Add Friend$/i });
    expect(await addFriendBtn.count()).toBe(0);

    // Close via Escape and confirm dismissal.
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden({ timeout: 5_000 });
  });
});
