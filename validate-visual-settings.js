
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR);
}

(async () => {
    console.log('Starting Visual Settings Validation...');
    const browser = await puppeteer.launch({
        headless: true, // Run headless for speed
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        // 1. Load the App
        console.log('Navigating to app...');
        await page.goto('http://localhost:9080', { waitUntil: 'networkidle0' });
        await page.waitForSelector('canvas'); // Wait for vis-network
        console.log('App loaded.');

        // 2. Open Visual Settings
        console.log('Opening Visual Settings...');
        const settingsBtn = await page.waitForSelector('button[title="Visual Settings"]');
        await settingsBtn.click();
        await new Promise(r => setTimeout(r, 1000)); // Wait for animation

        await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-settings-panel-open.png') });
        console.log('Screenshot saved: 01-settings-panel-open.png');

        // 3. Test Physics Slider (Gravity)
        console.log('Testing Gravity Slider...');
        // Find the gravity input (first range input in Physics section)
        // We look for the label "Gravity" and then the input following it
        const gravityInput = await page.evaluateHandle(() => {
            const labels = Array.from(document.querySelectorAll('span'));
            const gravityLabel = labels.find(el => el.textContent === 'Gravity');
            return gravityLabel.parentElement.nextElementSibling;
        });

        if (gravityInput) {
            // Change value
            await page.evaluate((el) => {
                el.value = -5000;
                el.dispatchEvent(new Event('change', { bubbles: true }));
            }, gravityInput);

            await new Promise(r => setTimeout(r, 2000)); // Wait for physics to settle
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-gravity-changed.png') });
            console.log('Screenshot saved: 02-gravity-changed.png');
        } else {
            console.error('Gravity input not found!');
        }

        // 4. Test Country Filter
        console.log('Testing Country Filter (Hiding USA)...');
        // Find the checkbox for USA
        const usaLabel = await page.evaluateHandle(() => {
            const labels = Array.from(document.querySelectorAll('label'));
            return labels.find(el => el.textContent.includes('USA'));
        });

        if (usaLabel) {
            await usaLabel.click();
            await new Promise(r => setTimeout(r, 1000)); // Wait for update
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-usa-hidden.png') });
            console.log('Screenshot saved: 03-usa-hidden.png');

            // Verify node count decreased (optional, but good for validation)
            // We can check if any node with 'USA' in title is hidden or removed
            // Since we use 'hidden: true' in vis-network, they might still be in dataset but hidden
        } else {
            console.error('USA filter label not found!');
        }

        console.log('Validation Complete.');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
})();
