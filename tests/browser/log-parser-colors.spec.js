import { expect, test } from '@playwright/test';

/* global window, getComputedStyle */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('cm:tour:v1:completed', 'true');
  });

  await page.goto('/');
});

test('Log Parser HEX renk kodlarını işler', async ({ page }) => {
  await page.locator('#chatlogInput').fill(
    '{#C2A2DA}Mor renk testi\n' +
    '!{#FF0000}Kırmızı renk testi\n' +
    '{#00FF00}Yeşil renk testi'
  );

  await page.evaluate(() => window.ChatlogParser.processOutput());

  const output = page.locator('#output');

  await expect(output).toContainText('Mor renk testi');
  await expect(output).toContainText('Kırmızı renk testi');
  await expect(output).toContainText('Yeşil renk testi');

  await expect(output).not.toContainText('{#C2A2DA}');
  await expect(output).not.toContainText('{#FF0000}');
  await expect(output).not.toContainText('{#00FF00}');

  const colors = await output.locator('span[style*="color"]').evaluateAll(
    (elements) => elements.map((element) => ({
      text: element.textContent,
      color: getComputedStyle(element).color,
    }))
  );

  expect(colors).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        text: expect.stringContaining('Mor renk testi'),
        color: 'rgb(194, 162, 218)',
      }),
      expect.objectContaining({
        text: expect.stringContaining('Kırmızı renk testi'),
        color: 'rgb(255, 0, 0)',
      }),
      expect.objectContaining({
        text: expect.stringContaining('Yeşil renk testi'),
        color: 'rgb(0, 255, 0)',
      }),
    ])
  );
});

test('Aynı satırda birden fazla HEX renk geçişini korur', async ({ page }) => {
  await page.locator('#chatlogInput').fill(
    '{#FFFFFF}Normal konuşma ' +
    '{#FF0000}kırmızı bölüm ' +
    '{#00FF00}yeşil bölüm ' +
    '{#FFFFFF}tekrar normal.'
  );

  await page.evaluate(() => window.ChatlogParser.processOutput());

  const output = page.locator('#output');

  await expect(output).toContainText(
    'Normal konuşma kırmızı bölüm yeşil bölüm tekrar normal.'
  );

  const segments = await output.locator('span[style*="color"]').evaluateAll(
    (elements) => elements.map((element) => ({
      text: element.textContent.trim(),
      color: getComputedStyle(element).color,
    }))
  );

  for (const [text, color] of [
    ['Normal konuşma', 'rgb(255, 255, 255)'],
    ['kırmızı bölüm', 'rgb(255, 0, 0)'],
    ['yeşil bölüm', 'rgb(0, 255, 0)'],
    ['tekrar normal.', 'rgb(255, 255, 255)'],
  ]) {
    expect(segments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining(text),
          color,
        }),
      ])
    );
  }
});