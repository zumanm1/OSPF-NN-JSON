
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR);
}

(async () => {
    console.log('Starting Persistence & Export Validation...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        // 1. Initial Load
        console.log('Navigating to app...');
        await page.goto('http://localhost:9080', { waitUntil: 'networkidle0' });
        await page.waitForSelector('canvas');
        console.log('App loaded.');

        // 2. Modify State (Change Gravity)
        console.log('Modifying Gravity...');
        const settingsBtn = await page.waitForSelector('button[title="Visual Settings"]');
        await settingsBtn.click();
        await new Promise(r => setTimeout(r, 500));

        // Find Gravity Input
        const gravityInput = await page.evaluateHandle(() => {
            const labels = Array.from(document.querySelectorAll('span'));
            const gravityLabel = labels.find(el => el.textContent === 'Gravity');
            return gravityLabel.parentElement.nextElementSibling;
        });

        if (gravityInput) {
            await page.evaluate((el) => {
                el.value = -45000; // Distinctive value
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }, gravityInput);
            console.log('Gravity changed to -45000');
        }

        // 3. Reload Page
        console.log('Reloading page...');
        await page.reload({ waitUntil: 'networkidle0' });
        await page.waitForSelector('canvas');
        console.log('Page reloaded.');

        // 4. Verify Persistence
        console.log('Verifying Persistence...');
        const settingsBtnAfterReload = await page.waitForSelector('button[title="Visual Settings"]');
        await settingsBtnAfterReload.click();
        await new Promise(r => setTimeout(r, 500));

        const persistedGravity = await page.evaluate(() => {
            const labels = Array.from(document.querySelectorAll('span'));
            const gravityLabel = labels.find(el => el.textContent === 'Gravity');
            return gravityLabel.parentElement.nextElementSibling.value;
        });

        console.log(`Persisted Gravity Value: ${persistedGravity}`);
        if (persistedGravity === '-45000') {
            console.log('✅ SUCCESS: Gravity persisted across reload.');
        } else {
            console.error(`❌ FAILURE: Gravity reset to ${persistedGravity}`);
        }

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-persistence-check.png') });

        // 5. Test Export Logic (Mocking the download)
        console.log('Testing Export Logic...');

        // Intercept download
        await page._client().send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: SCREENSHOT_DIR
        });

        const exportBtn = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(b => b.textContent.includes('Export'));
        });

        if (exportBtn) {
            await exportBtn.click();
            console.log('Export triggered.');
            // Wait for file to appear (simple check)
            await new Promise(r => setTimeout(r, 2000));

            const files = fs.readdirSync(SCREENSHOT_DIR);
            const exportFile = files.find(f => f.startsWith('network-topology-') && f.endsWith('.json'));

            if (exportFile) {
                console.log(`✅ SUCCESS: Export file created: ${exportFile}`);
                const content = fs.readFileSync(path.join(SCREENSHOT_DIR, exportFile), 'utf-8');
                const json = JSON.parse(content);
                console.log(`Exported Links Count: ${json.links.length}`);
                console.log(`Exported Metadata:`, json.metadata);
            } else {
                console.error('❌ FAILURE: No export file found.');
            }
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
})();
