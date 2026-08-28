import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('https://pinboard-zeta.vercel.app');
  await page.waitForTimeout(4000); // Wait for load
  await page.screenshot({ path: 'vercel_screenshot.png' });
  await browser.close();
})();
