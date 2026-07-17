import { test, expect } from '@playwright/test';

test('add habit and check in', async ({ page }) => {
  await page.goto('/');
  // seed: wait for app to load
  await page.waitForSelector('#add-habit, #add-first');
  if (await page.locator('#add-first').count()) {
    await page.locator('#add-first').click();
  } else {
    await page.locator('#add-habit').click();
  }
  await page.fill('#f-name', 'Drink water');
  await page.locator('#f-save').click();
  await expect(page.locator('.habit-row')).toContainText('Drink water');
  await page.locator('.check-btn').first().click();
  await expect(page.locator('.check-btn.done').first()).toBeVisible();
});
