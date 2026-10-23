import { expect, test } from '@playwright/test';

test('Türkçe fısıltı türleri doğru renklendirilir', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('cm:tour:v1:completed', 'true');
    window.localStorage.setItem('chatlogWhisperColoring', 'true');
  });

  await page.goto('/');

  await page.locator('#chatlogInput').fill([
    'Ahmet Yılmaz fısıldar: Beni duyabiliyor musun?',
    'Ahmet Yılmaz kısık sesle diyor ki: Biraz yaklaş.',
    'Ahmet Yılmaz alçak sesle diyor ki: Sessiz ol.',
    'Ahmet Yılmaz diyor ki: Normal konuşma.',
  ].join('\n'));

  await page.evaluate(() => window.ChatlogParser.processOutput());

  const lines = page.locator('#output .generated');
  await expect(lines).toHaveCount(4);

  const results = await lines.evaluateAll((elements) =>
    elements.map((element) => ({
      text: element.textContent,
      color: getComputedStyle(element.querySelector('span') || element).color,
    }))
  );

  expect(results[0].text).toContain('fısıldar');
  expect(results[0].color).toBe('rgb(237, 168, 65)');

  expect(results[1].text).toContain('kısık sesle');
  expect(results[1].color).toBe('rgb(147, 151, 153)');

  expect(results[2].text).toContain('alçak sesle');
  expect(results[2].color).toBe('rgb(90, 90, 91)');

  expect(results[3].text).toContain('Normal konuşma');
});