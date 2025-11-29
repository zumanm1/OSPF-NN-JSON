
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR);
}

(async () => {
    console.log('Starting New Features Validation...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    try {
        // 1. Load App
        console.log('Navigating to app...');
        await page.goto('http://localhost:9080', { waitUntil: 'networkidle0', timeout: 60000 });
        console.log('App loaded.');

        // 2. Switch to Designer
        console.log('Switching to Designer...');
        const designerBtn = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(b => b.textContent.includes('Designer'));
        });

        if (designerBtn) {
            await designerBtn.click();
            await new Promise(r => setTimeout(r, 1000));
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-designer-view.png') });

            const designerHeader = await page.evaluate(() => {
                return document.body.innerText.includes('Topology Designer');
            });

            if (designerHeader) {
                console.log('✅ SUCCESS: Designer View loaded.');
            } else {
                console.error('❌ FAILURE: Designer View header not found.');
            }
        } else {
            console.error('❌ FAILURE: Designer button not found.');
        }

        // 3. Switch to Planner
        console.log('Switching to Planner...');
        const plannerBtn = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(b => b.textContent.includes('Planner'));
        });

        if (plannerBtn) {
            await plannerBtn.click();
            await new Promise(r => setTimeout(r, 1000));
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-planner-view.png') });

            const plannerHeader = await page.evaluate(() => {
                return document.body.innerText.includes('Scenario Planner');
            });

            if (plannerHeader) {
                console.log('✅ SUCCESS: Planner View loaded.');
            } else {
                console.error('❌ FAILURE: Planner View header not found.');
            }
        } else {
            console.error('❌ FAILURE: Planner button not found.');
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
})();
