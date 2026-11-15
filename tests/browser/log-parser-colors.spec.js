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

test('Tum HEX bicimleri ve saydamlik dogru islenir', async ({ page }) => {
  await page.locator('#chatlogInput').fill(
    '{#F60}Uc haneli renk\n' +
    '{#F608}Dort haneli saydam\n' +
    '{#FF6600}Alti haneli renk\n' +
    '{#FF660080}Sekiz haneli saydam\n' +
    '!{#0F0}Unlemli kisa renk\n' +
    '{#FFFFFF}Beyaz bolum {#F00}Kirmizi bolum'
  );

  await page.evaluate(() => window.ChatlogParser.processOutput());

  const output = page.locator('#output');

  await expect(output).not.toContainText('{#');
  await expect(output).not.toContainText('!{#');

  const colors = await output.locator('span[style*="color"]').evaluateAll(
    (elements) => elements.map((element) => ({
      text: element.textContent.trim(),
      color: getComputedStyle(element).color,
    }))
  );

const colorOf = (text) =>
  colors.findLast((item) => item.text.includes(text))?.color;

  expect(colorOf('Uc haneli renk')).toBe('rgb(255, 102, 0)');
  expect(colorOf('Alti haneli renk')).toBe('rgb(255, 102, 0)');
  expect(colorOf('Unlemli kisa renk')).toBe('rgb(0, 255, 0)');
  expect(colorOf('Beyaz bolum')).toBe('rgb(255, 255, 255)');
  expect(colorOf('Kirmizi bolum')).toBe('rgb(255, 0, 0)');

  const alphaOf = (text) => {
    const color = colorOf(text);
    expect(color).toMatch(/^rgba\(255,\s*102,\s*0,\s*[\d.]+\)$/);
    return Number(color.match(/,\s*([\d.]+)\)$/)[1]);
  };

  expect(alphaOf('Dort haneli saydam')).toBeCloseTo(136 / 255, 2);
  expect(alphaOf('Sekiz haneli saydam')).toBeCloseTo(128 / 255, 2);
});
