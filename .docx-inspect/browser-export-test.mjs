import { chromium } from 'playwright';
import path from 'path';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ acceptDownloads: true });
page.on('dialog', async dialog => { console.log('dialog:', dialog.message()); await dialog.accept(); });
await page.goto('http://127.0.0.1:5173/contract-generator', { waitUntil: 'networkidle' });
await page.getByText('Kitchen Staff').click();
await page.getByLabel('Employer company name').fill('Browser Test Company');
await page.getByLabel('Employee full name').fill('Browser Test Employee');
const downloadPromise = page.waitForEvent('download');
await page.getByRole('button', { name: /Export PDF/i }).click();
const download = await downloadPromise;
const target = path.resolve('.docx-inspect/browser-export.docx');
await download.saveAs(target);
console.log('downloaded:', target);
await browser.close();
