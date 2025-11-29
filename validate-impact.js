
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const SCREENSHOT_DIR = path.join(process.cwd(), 'test-screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR);
}

(async () => {
    console.log('Starting Impact Analysis Validation...');
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // Capture browser console logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.setViewport({ width: 1280, height: 800 });

    try {
        // 1. Load App
        console.log('Navigating to app...');
        await page.goto('http://localhost:9080', { waitUntil: 'networkidle0', timeout: 60000 });
        await page.waitForSelector('canvas');
        console.log('App loaded.');

        // 2. Open Topology Planner
        console.log('Locating Topology Planner...');

        // Find the section by text
        const plannerSection = await page.evaluateHandle(() => {
            const h3s = Array.from(document.querySelectorAll('h3'));
            const header = h3s.find(el => el.textContent.includes('Topology Planner'));
            return header ? header.closest('section') : null;
        });

        if (plannerSection) {
            console.log('Found Topology Planner section.');

            // Find selects within this section
            const selects = await plannerSection.$$('select');
            if (selects.length >= 2) {
                // Select Source
                await selects[0].select('zaf-r1');
                console.log('Selected Source: zaf-r1');

                // Select Destination
                await selects[1].select('lso-r1');
                console.log('Selected Destination: lso-r1');

                // Verify values
                const val1 = await page.evaluate(el => el.value, selects[0]);
                const val2 = await page.evaluate(el => el.value, selects[1]);
                console.log(`Select Values: ${val1}, ${val2}`);

                // Set Costs to 1 to ensure impact
                const inputs = await plannerSection.$$('input[type="number"]');
                if (inputs.length >= 2) {
                    await inputs[0].click();
                    await page.keyboard.press('Backspace');
                    await page.keyboard.type('1');
                    await inputs[1].click();
                    await page.keyboard.press('Backspace');
                    await page.keyboard.type('1');
                }

                // Click "Analyze Impact"
                const analyzeBtn = await plannerSection.evaluateHandle(el => {
                    const buttons = Array.from(el.querySelectorAll('button'));
                    return buttons.find(b => b.textContent.includes('Analyze Impact'));
                });

                if (analyzeBtn) {
                    // Wait for button to be enabled
                    await page.waitForFunction(
                        btn => !btn.disabled,
                        { timeout: 2000 },
                        analyzeBtn
                    ).catch(() => console.log('Button did not become enabled within timeout'));

                    const isDisabled = await page.evaluate(el => el.disabled, analyzeBtn);
                    console.log(`Analyze Button Disabled: ${isDisabled}`);

                    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-ready-to-click.png') });

                    await analyzeBtn.click();
                    console.log('Clicked Analyze Impact.');

                    // Wait for Modal - using a more generic selector or the specific class found in code
                    // Code has: <div className="absolute inset-0 ...">
                    await page.waitForSelector('div.absolute.inset-0.z-50', { visible: true, timeout: 30000 });
                    await new Promise(r => setTimeout(r, 1500)); // Wait for render

                    // Switch to "All Flows" view
                    const allFlowsBtn = await page.evaluateHandle(() => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        return buttons.find(b => b.textContent.includes('All Flows'));
                    });

                    if (allFlowsBtn) {
                        await allFlowsBtn.click();
                        await new Promise(r => setTimeout(r, 1000)); // Wait for re-render
                        console.log('Switched to All Flows view');
                    } else {
                        console.log('Could not find "All Flows" button');
                    }

                    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-impact-analysis-modal.png') });
                    console.log('Screenshot saved: 05-impact-analysis-modal.png');

                    // Validation 1: Badges
                    const badges = await page.evaluate(() => {
                        const spans = Array.from(document.querySelectorAll('span'));
                        return spans.map(s => s.textContent).filter(t => t === 'MIGRATION' || t === 'REROUTE');
                    });
                    console.log('Found Badges:', badges);

                    // Validation 2: Percentage
                    const percentages = await page.evaluate(() => {
                        const spans = Array.from(document.querySelectorAll('span'));
                        // Look for text like "+13%" or "-5%"
                        return spans.map(s => s.textContent).filter(t => /[+-]?\d+%/.test(t));
                    });
                    console.log('Found Percentages:', percentages.slice(0, 5)); // Show first 5

                    // Validation 3: Hops
                    const hops = await page.evaluate(() => {
                        const spans = Array.from(document.querySelectorAll('span'));
                        return spans.map(s => s.textContent).filter(t => /\(\d+ hops\)/.test(t));
                    });
                    console.log('Found Hop Counts:', hops.slice(0, 5));

                    if (badges.length > 0 || percentages.length > 0) {
                        console.log('✅ SUCCESS: Impact Analysis features verified.');
                    } else {
                        console.log('⚠️ WARNING: No specific impact features found (could be no impact).');
                    }
                } else {
                    console.error('Analyze Impact button not found.');
                }
            } else {
                console.error('Selects not found in Planner section.');
            }
        } else {
            console.error('Topology Planner section not found.');
        }

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await browser.close();
    }
})();
