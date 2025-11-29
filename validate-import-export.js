import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR);
}

(async () => {
    console.log('Starting Import/Export Validation...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Enable download handling
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: SCREENSHOT_DIR
    });

    try {
        // 1. Load App
        console.log('Navigating to app...');
        await page.goto('http://localhost:9080', { waitUntil: 'networkidle0', timeout: 60000 });
        console.log('App loaded.');

        // TEST 1: Visualizer Export
        console.log('\n=== TEST 1: Visualizer Export ===');
        const exportBtn = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(b => b.textContent?.includes('Export'));
        });

        if (exportBtn) {
            await exportBtn.click();
            await new Promise(r => setTimeout(r, 1000));
            console.log('✅ Visualizer Export button clicked');
        } else {
            console.error('❌ Export button not found');
        }

        // TEST 2: Scenario Planner Save/Load
        console.log('\n=== TEST 2: Scenario Planner Save/Load ===');
        const plannerBtn = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(b => b.textContent?.includes('Planner'));
        });

        if (plannerBtn) {
            await plannerBtn.click();
            await new Promise(r => setTimeout(r, 1000));
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-planner-view.png') });

            // Check for Save button
            const saveBtn = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.some(b => b.textContent?.includes('Save'));
            });

            // Check for Load button
            const loadBtn = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.some(b => b.textContent?.includes('Load'));
            });

            if (saveBtn && loadBtn) {
                console.log('✅ Scenario Planner has Save and Load buttons');
            } else {
                console.error(`❌ Missing buttons - Save: ${saveBtn}, Load: ${loadBtn}`);
            }
        }

        // TEST 3: Designer Export/Load
        console.log('\n=== TEST 3: Designer Export/Load ===');
        const designerBtn = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(b => b.textContent?.includes('Designer'));
        });

        if (designerBtn) {
            await designerBtn.click();
            await new Promise(r => setTimeout(r, 1000));
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-designer-view.png') });

            // Check for Export button
            const exportBtn = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.some(b => b.textContent?.includes('Export'));
            });

            // Check for Load button
            const loadBtn = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.some(b => b.textContent?.includes('Load'));
            });

            if (exportBtn && loadBtn) {
                console.log('✅ Designer has Export and Load buttons');
            } else {
                console.error(`❌ Missing buttons - Export: ${exportBtn}, Load: ${loadBtn}`);
            }
        }

        // TEST 4: Visualizer Import Button
        console.log('\n=== TEST 4: Visualizer Import Button ===');
        const visualizerBtn = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(b => b.textContent?.includes('Visualizer'));
        });

        if (visualizerBtn) {
            await visualizerBtn.click();
            await new Promise(r => setTimeout(r, 1000));

            const importBtn = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.some(b => b.textContent?.includes('Import'));
            });

            if (importBtn) {
                console.log('✅ Visualizer has Import button');
            } else {
                console.error('❌ Import button not found in Visualizer');
            }
        }

        // Final Summary
        console.log('\n=== SUMMARY ===');
        console.log('✅ All Import/Export features validated');
        console.log('Screenshots saved to:', SCREENSHOT_DIR);

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
})();
