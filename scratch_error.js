import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('request', request => {
    if (request.url().includes('avatar')) {
      console.log('REQUESTED:', request.url());
    }
  });
  page.on('response', response => {
    if (response.url().includes('avatar')) {
      console.log('RESPONSE:', response.url(), response.status());
    }
  });

  await page.goto('http://localhost:5173');
  await page.waitForTimeout(4000); 
  await browser.close();
})();
