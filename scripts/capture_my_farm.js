const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1080 });

  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 1000));

  const buttons = await page.$$('button');
  for (const b of buttons) {
    const text = await page.evaluate(el => el.innerText, b);
    if (text && text.includes('Quick Demo')) {
      await b.click();
      break;
    }
  }

  await new Promise((r) => setTimeout(r, 3000));

  console.log('Navigating to /my-farm...');
  await page.goto('http://localhost:3000/my-farm', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise((r) => setTimeout(r, 3000));

  await page.screenshot({ 
    path: 'C:/Users/Pranav/.gemini/antigravity-ide/brain/496d648e-dc3d-43d6-87b7-c95d8a7424dc/my_farm_authenticated.png', 
    fullPage: false 
  });
  console.log('my_farm_authenticated.png captured successfully.');

  await browser.close();
})();
