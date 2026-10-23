import { expect, test } from '@playwright/test';

/* global window, getComputedStyle, Event */

test('HEX renk kodlu TXT dosyası doğru yüklenir', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('cm:tour:v1:completed', 'true');
  });

  await page.goto('/');

  const sample = [
    '{#C2A2DA}Mor renk testi',
    '{#FF0000}Kırmızı renk testi',
    '{#00FF00}Yeşil renk testi',
    '{#FFFFFF}Türkçe karakterler: ğ ü ş ı ö ç',
  ].join('\n');

  // Gerçek bir TXT dosyası seçilmiş gibi tarayıcıya dosya ver.
  await page.locator('#chatlogFileInput').setInputFiles({
    name: 'gtaw-log-parser-test.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(sample, 'utf8'),
  });

  // Dosya içeriğinin editöre aktarılmasını bekle.
  await expect(page.locator('#chatlogInput')).toHaveValue(sample);

  // Önizlemenin oluştuğunu doğrula.
  const output = page.locator('#output');
  await expect(output.locator('.generated')).toHaveCount(4);

  // HEX kodları önizlemede görünmemeli.
  await expect(output).not.toContainText('{#C2A2DA}');
  await expect(output).not.toContainText('{#FF0000}');
  await expect(output).not.toContainText('{#00FF00}');

  // Türkçe karakterler korunmalı.
  await expect(output).toContainText('ğ ü ş ı ö ç');

  // Gerçek renkleri kontrol et.
  const colors = await output.locator('span[style*="color"]').evaluateAll(
    (elements) => elements.map((element) => ({
      text: element.textContent,
      color: getComputedStyle(element).color,
    }))
  );

  for (const [text, color] of [
    ['Mor renk testi', 'rgb(194, 162, 218)'],
    ['Kırmızı renk testi', 'rgb(255, 0, 0)'],
    ['Yeşil renk testi', 'rgb(0, 255, 0)'],
  ]) {
    expect(colors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          text: expect.stringContaining(text),
          color,
        }),
      ])
    );
  }
});

test('TXT okuma hatasında mevcut sohbet metni korunur', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('cm:tour:v1:completed', 'true');

    // Dosya okuma işlemini hata verecek şekilde taklit et.
    window.FileReader = class {
      readAsText() {
        if (typeof this.onerror === 'function') {
          this.onerror(new Event('error'));
        }
      }
    };
  });

  await page.goto('/');
  await page.evaluate(() => {
    window.__txtErrorToastMessages = [];

    window.showToast = (message) => {
      window.__txtErrorToastMessages.push(message);
    };
  });

  const originalText = 'Ahmet Yılmaz diyor ki: Bu metin korunmalı.';

  await page.locator('#chatlogInput').fill(originalText);

  await page.locator('#chatlogFileInput').setInputFiles({
    name: 'hatali-dosya.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Test içeriği', 'utf8'),
  });

  // Okuma başarısız olduğunda önceki metin silinmemeli.
  await expect(page.locator('#chatlogInput')).toHaveValue(originalText);
  // TXT okuma hatasının bildirim sistemine iletildiğini doğrula.
  const toastMessages = await page.evaluate(() => {
    return window.__txtErrorToastMessages || [];
  });

  expect(toastMessages).toContain(
    'TXT dosyası okunurken bir hata oluştu. Lütfen dosyayı tekrar deneyin.'
  );
});