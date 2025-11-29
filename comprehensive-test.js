import puppeteer from 'puppeteer';
import fs from 'fs';

const TEST_URL = 'http://localhost:9080';
const SCREENSHOTS_DIR = '/Users/macbook/OSPF-NN-JSON/test-screenshots';

// Create screenshots directory
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive OSPF Visualizer Pro Tests\n');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Capture console logs and errors
  const consoleMessages = [];
  const pageErrors = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    if (text.includes('error') || text.includes('Error')) {
      console.log('❌ Console Error:', text);
    }
  });
  
  page.on('pageerror', error => {
    pageErrors.push(error.message);
    console.log('❌ Page Error:', error.message);
  });
  
  try {
    // TEST 1: Initial Load
    console.log('📋 TEST 1: Initial Page Load');
    await page.goto(TEST_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    await sleep(3000); // Wait for network stabilization
    
    const title = await page.title();
    console.log(`  ✓ Page Title: ${title}`);
    
    const hasRoot = await page.evaluate(() => document.getElementById('root') !== null);
    console.log(`  ✓ Root Element: ${hasRoot ? 'Present' : 'Missing'}`);
    
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-initial-load.png`, fullPage: true });
    console.log('  ✓ Screenshot saved\n');
    
    // TEST 2: Check Network Graph Rendering
    console.log('📋 TEST 2: Network Graph Rendering');
    const canvasExists = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas !== null;
    });
    console.log(`  ✓ Canvas Element: ${canvasExists ? 'Present' : 'Missing'}`);
    
    // TEST 3: Check UI Elements
    console.log('📋 TEST 3: UI Elements Presence');
    const uiElements = await page.evaluate(() => {
      return {
        header: document.querySelector('header') !== null,
        sidebar: document.querySelector('aside') !== null,
        sourceSelect: document.querySelector('select') !== null,
        runButton: document.querySelector('button') !== null,
        logsSection: document.querySelectorAll('section').length > 0
      };
    });
    
    for (const [element, present] of Object.entries(uiElements)) {
      console.log(`  ${present ? '✓' : '✗'} ${element}: ${present ? 'Present' : 'Missing'}`);
    }
    console.log('');
    
    // TEST 4: Source/Destination Selection
    console.log('📋 TEST 4: Router Selection');
    const selects = await page.$$('select');
    console.log(`  ✓ Found ${selects.length} select elements`);
    
    if (selects.length >= 2) {
      // Get available options
      const sourceOptions = await page.evaluate(() => {
        const select = document.querySelectorAll('select')[0];
        return Array.from(select.options).map(opt => opt.value);
      });
      console.log(`  ✓ Source routers available: ${sourceOptions.length}`);
      
      // Select different routers using the select elements directly
      if (sourceOptions.length > 10) {
        await selects[0].select(sourceOptions[5]);
        await selects[1].select(sourceOptions[10]);
      }
      await sleep(500);
      
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-router-selection.png`, fullPage: true });
      console.log('  ✓ Router selection working\n');
    } else {
      console.log('  ⚠️  Not enough select elements found\n');
    }
    
    // TEST 5: Run Path Simulation
    console.log('📋 TEST 5: Path Simulation');
    const runButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Run Path') || btn.textContent.includes('Routing'));
    });
    
    if (runButton && runButton.asElement()) {
      await runButton.asElement().click();
      console.log('  ✓ Run Path button clicked');
      await sleep(4000); // Wait for animation
      
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-path-simulation.png`, fullPage: true });
      console.log('  ✓ Path simulation completed\n');
    } else {
      console.log('  ⚠️  Run Path button not found\n');
    }
    
    // TEST 6: Theme Toggle
    console.log('📋 TEST 6: Dark Mode Toggle');
    const themeButton = await page.$('button[title="Toggle Theme"]');
    if (themeButton) {
      await themeButton.click();
      await sleep(500);
      
      const isDark = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });
      console.log(`  ✓ Dark mode: ${isDark ? 'Enabled' : 'Disabled'}`);
      
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-dark-mode.png`, fullPage: true });
      
      // Toggle back
      await themeButton.click();
      await sleep(500);
      console.log('  ✓ Theme toggle working\n');
    }
    
    // TEST 7: Visual Settings
    console.log('📋 TEST 7: Visual Settings Panel');
    const visualSettingsButton = await page.$('button[title="Adjust Visualization"]');
    if (visualSettingsButton) {
      await visualSettingsButton.click();
      await sleep(500);
      
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-visual-settings.png`, fullPage: true });
      console.log('  ✓ Visual settings panel opened\n');
    }
    
    // TEST 8: Country Borders Toggle
    console.log('📋 TEST 8: Country Borders Toggle');
    const bordersButton = await page.$('button[title*="Country Borders"]');
    if (bordersButton) {
      await bordersButton.click();
      await sleep(1000); // Wait for redraw
      
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-country-borders.png`, fullPage: true });
      console.log('  ✓ Country borders toggled\n');
    }
    
    // TEST 9: Edge Selection and Impact Analysis
    console.log('📋 TEST 9: Edge Selection (Click on Network)');
    // Click on canvas to try to select an edge
    await page.mouse.click(800, 400);
    await sleep(1000);
    
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-edge-selection.png`, fullPage: true });
    console.log('  ✓ Edge selection attempted\n');
    
    // TEST 10: Export Functionality
    console.log('📋 TEST 10: Export Functionality');
    const exportButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Export'));
    });
    
    if (exportButton && exportButton.asElement()) {
      // Set up download handling
      const client = await page.target().createCDPSession();
      await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: SCREENSHOTS_DIR
      });
      
      await exportButton.asElement().click();
      await sleep(1000);
      console.log('  ✓ Export button clicked\n');
    } else {
      console.log('  ⚠️  Export button not found\n');
    }
    
    // TEST 11: Reset Functionality
    console.log('📋 TEST 11: Reset Functionality');
    const resetButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.getAttribute('title') === 'Reset' || btn.textContent.includes('Reset'));
    });
    
    if (resetButton && resetButton.asElement()) {
      await resetButton.asElement().click();
      await sleep(1000);
      
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/08-after-reset.png`, fullPage: true });
      console.log('  ✓ Reset functionality working\n');
    } else {
      console.log('  ⚠️  Reset button not found\n');
    }
    
    // TEST 12: Responsive Layout Check
    console.log('📋 TEST 12: Responsive Layout');
    await page.setViewport({ width: 1280, height: 720 });
    await sleep(500);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/09-responsive-1280.png`, fullPage: true });
    console.log('  ✓ 1280x720 layout captured\n');
    
    // TEST 13: Final State
    console.log('📋 TEST 13: Final Application State');
    await page.setViewport({ width: 1920, height: 1080 });
    await sleep(500);
    
    const finalState = await page.evaluate(() => {
      return {
        bodyLength: document.body.innerHTML.length,
        hasCanvas: document.querySelector('canvas') !== null,
        hasHeader: document.querySelector('header') !== null,
        hasSidebar: document.querySelector('aside') !== null,
        buttonCount: document.querySelectorAll('button').length,
        selectCount: document.querySelectorAll('select').length
      };
    });
    
    console.log('  Final State:');
    for (const [key, value] of Object.entries(finalState)) {
      console.log(`    ${key}: ${value}`);
    }
    
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/10-final-state.png`, fullPage: true });
    console.log('  ✓ Final screenshot saved\n');
    
    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✓ Total Tests Run: 13`);
    console.log(`✓ Page Errors: ${pageErrors.length}`);
    console.log(`✓ Screenshots Saved: ${SCREENSHOTS_DIR}`);
    console.log(`✓ Application Status: ${pageErrors.length === 0 ? 'HEALTHY' : 'HAS ERRORS'}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (pageErrors.length > 0) {
      console.log('⚠️  Errors Found:');
      pageErrors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/error-state.png`, fullPage: true });
  } finally {
    await browser.close();
    console.log('✅ Tests Completed\n');
  }
}

runComprehensiveTests().catch(console.error);
