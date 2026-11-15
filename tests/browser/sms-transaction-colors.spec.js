import { expect, test } from '@playwright/test';

/* global window */

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('cm:tour:v1:completed', 'true');
  });

  await page.goto('/');
});

async function processChat(page, text) {
  await page.locator('#chatlogInput').fill(text);
  await page.evaluate(() => window.ChatlogParser.processOutput());

  return page.locator('#output .generated');
}

async function checkColor(line, text, color) {
  await expect(line).toContainText(text);
  await expect(line.locator('span.colorable').first()).toHaveCSS(
    'color',
    color
  );
}

test('Araç içi fısıltı turuncu renklendirilir', async ({ page }) => {
  const lines = await processChat(
    page,
    '(Araba) Enzo Moretti fısıldıyor: Merhaba.'
  );

  await expect(lines).toHaveCount(1);

  await checkColor(
    lines.nth(0),
    'Enzo Moretti fısıldıyor',
    'rgb(237, 168, 65)'
  );
});

test('Eşya verme mesajı yeşil renklendirilir', async ({ page }) => {
  const lines = await processChat(
    page,
    'Alex Carter kişisine (Kokain) (1) verdin.'
  );

  await expect(lines).toHaveCount(1);

  await checkColor(
    lines.nth(0),
    'Kokain',
    'rgb(86, 214, 75)'
  );
});

test('SMS bildirimi sarı renklendirilir', async ({ page }) => {
  const lines = await processChat(
    page,
    '[SMS] 2 okunmamış mesajın var.'
  );

  await expect(lines).toHaveCount(1);

  await checkColor(
    lines.nth(0),
    '2 okunmamış mesajın var',
    'rgb(251, 247, 36)'
  );
});

test('Fısıltı, eşya verme ve SMS renkleri birbirini etkilemez', async ({ page }) => {
  const lines = await processChat(
    page,
    [
      '(Araba) Enzo Moretti fısıldıyor: Merhaba.',
      'Alex Carter kişisine (Kokain) (1) verdin.',
      '[SMS] 2 okunmamış mesajın var.',
    ].join('\n')
  );

  await expect(lines).toHaveCount(3);

  await checkColor(
    lines.nth(0),
    'fısıldıyor',
    'rgb(237, 168, 65)'
  );

  await checkColor(
    lines.nth(1),
    'Kokain',
    'rgb(86, 214, 75)'
  );

  await checkColor(
    lines.nth(2),
    'okunmamış mesajın var',
    'rgb(251, 247, 36)'
  );
});

test('SMS bildirimi undefined göstermeden doğru görüntülenir', async ({ page }) => {
  const message = '[SMS] %ABC123 okunmamış mesajın var.';

  const lines = await processChat(page, message);

  await expect(lines).toHaveCount(1);

  // SMS metninin eksiksiz görüntülendiğini kontrol et.
  await expect(lines.nth(0)).toContainText(message);

  // Eski undefined hatası tekrar oluşmamalı.
  await expect(lines.nth(0)).not.toContainText('undefined');

  // Bildirim sarı renkte olmalı.
  await checkColor(
    lines.nth(0),
    'okunmamış mesajın var',
    'rgb(251, 247, 36)'
  );
});