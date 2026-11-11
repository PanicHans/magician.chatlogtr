import { expect, test } from '@playwright/test';

/* global window, getComputedStyle */

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

test('Eski ve yeni FiveM fısıltı formatları turuncu renklendirilir', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('cm:tour:v1:completed', 'true');
    window.localStorage.setItem('chatlogWhisperColoring', 'true');
  });

  await page.goto('/');

  const messages = [
    'John Doe fısıldar: x',
    'John Doe fısıldıyor: x',
    'Carmen Garcia fısıldıyor: Hey.',
  ];

  await page.locator('#chatlogInput').fill(messages.join('\n'));

  await page.evaluate(() => window.ChatlogParser.processOutput());

  const lines = page.locator('#output .generated');

  await expect(lines).toHaveCount(3);

  const results = await lines.evaluateAll((elements) =>
    elements.map((element) => {
      const whisper = element.querySelector('.whisper');

      return {
        text: element.textContent,
        isWhisper: Boolean(whisper),
        color: whisper ? getComputedStyle(whisper).color : null,
      };
    })
  );

  for (let i = 0; i < messages.length; i++) {
    expect(results[i].text).toContain(messages[i]);
    expect(results[i].isWhisper).toBe(true);
    expect(results[i].color).toBe('rgb(237, 168, 65)');
  }
});