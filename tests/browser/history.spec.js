
import { expect, test } from '@playwright/test';

/* global window */

test('sohbet gecmisi acilir ve kayitlar geri yuklenir', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('cm:tour:v1:completed', 'true');
  });

  await page.goto('/');

  const savedText = '{#00FF00}Gecmis kayit testi';

  await page.evaluate((text) => {
    window.localStorage.setItem(
      'chatlogHistory',
      JSON.stringify([text])
    );
  }, savedText);

  await page.reload();

  if (await page.locator('#changelogDrawer.open').isVisible()) {
    await page.locator('#closeChangelogModal').click();
  }

  await page.locator('.history-tab').click();

  await expect(page.locator('#historyPanel')).toHaveClass(/open/);
  await expect(page.locator('#historyPanel .history-item')).toHaveCount(1);

  await page.locator('#historyPanel .history-item').first().click();

  await expect(page.locator('#chatlogInput')).toHaveValue(savedText);
  await expect(page.locator('#historyPanel')).not.toHaveClass(/open/);

  await page.reload();

  if (await page.locator('#changelogDrawer.open').isVisible()) {
    await page.locator('#closeChangelogModal').click();
  }

  await page.locator('.history-tab').click();

  await expect(page.locator('#historyPanel .history-item').first())
    .toContainText('Gecmis kayit testi');
});
