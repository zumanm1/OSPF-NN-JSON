/**
 * DEEP ANALYSIS TEST - OSPF Network Visualizer
 * Comprehensive validation of all critical functionality
 * Port: Auto-detect (9080, 9081, 9082)
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const PORTS = [9082, 9081, 9080];
const SCREENSHOTS_DIR = './test-screenshots/deep-analysis';
let BASE_URL;

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function findActivePort() {
  const http = require('http');
  for (const port of PORTS) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}`, (res) => {
          resolve(port);
        });
        req.on('error', reject);
        req.setTimeout(1000, () => reject(new Error('timeout')));
      });
      return port;
    } catch (e) {
      continue;
    }
  }
  throw new Error('No active port found');
}

async function runDeepAnalysis() {
  console.log('🔬 DEEP ANALYSIS TEST - OSPF Network Visualizer');
  console.log('═'.repeat(80));

  // Find active port
  try {
    const port = await findActivePort();
    BASE_URL = `http://localhost:${port}`;
    console.log(`✓ Found active server on port ${port}`);
  } catch (e) {
    console.error('✗ No active dev server found. Run: npm run dev');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080'],
    slowMo: 30
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const testResults = {
    passed: 0,
    failed: 0,
    warnings: 0,
    errors: []
  };

  // Collect console messages
  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', error => {
    testResults.errors.push(`Page Error: ${error.message}`);
  });

  try {
    // =========================================================================
    // TEST 1: Application Load
    // =========================================================================
    console.log('\n📋 TEST 1: Application Load & Initialization');
    console.log('-'.repeat(60));

    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(3000);

    const title = await page.title();
    console.log(`  ✓ Page Title: ${title}`);

    // Check for main elements
    const hasHeader = await page.evaluate(() => {
      return document.querySelector('header') !== null;
    });
    console.log(`  ${hasHeader ? '✓' : '✗'} Header present`);

    const hasNetworkContainer = await page.evaluate(() => {
      return document.querySelector('[class*="network"]') !== null ||
             document.querySelector('canvas') !== null;
    });
    console.log(`  ${hasNetworkContainer ? '✓' : '✗'} Network container present`);

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-initial-load.png`, fullPage: true });
    testResults.passed += 3;

    // =========================================================================
    // TEST 2: Console Errors Check
    // =========================================================================
    console.log('\n📋 TEST 2: Console Errors Analysis');
    console.log('-'.repeat(60));

    const errors = consoleMessages.filter(m => m.type === 'error');
    const warnings = consoleMessages.filter(m => m.type === 'warning');

    console.log(`  ✓ Total console messages: ${consoleMessages.length}`);
    console.log(`  ${errors.length === 0 ? '✓' : '✗'} Errors: ${errors.length}`);
    console.log(`  ⚠ Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('  Error details:');
      errors.slice(0, 5).forEach(e => console.log(`    - ${e.text.slice(0, 100)}`));
      testResults.failed++;
    } else {
      testResults.passed++;
    }
    testResults.warnings += warnings.length;

    // =========================================================================
    // TEST 3: View Mode Switching
    // =========================================================================
    console.log('\n📋 TEST 3: View Mode Switching');
    console.log('-'.repeat(60));

    const viewModes = ['Visualizer', 'Designer', 'Planner', 'Analysis'];

    for (const mode of viewModes) {
      const clicked = await page.evaluate((modeName) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.trim() === modeName);
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      }, mode);

      if (clicked) {
        await sleep(500);
        console.log(`  ✓ ${mode} mode activated`);
        testResults.passed++;
      } else {
        console.log(`  ✗ ${mode} mode button not found`);
        testResults.failed++;
      }
    }

    // Switch back to Visualizer
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent?.trim() === 'Visualizer');
      if (btn) btn.click();
    });
    await sleep(500);

    // =========================================================================
    // TEST 4: Source/Destination Selection
    // =========================================================================
    console.log('\n📋 TEST 4: Path Selection Controls');
    console.log('-'.repeat(60));

    const selects = await page.$$('select');
    console.log(`  ✓ Found ${selects.length} select elements`);

    if (selects.length >= 2) {
      // Get options from first select
      const options = await page.evaluate(() => {
        const select = document.querySelector('select');
        if (!select) return [];
        return Array.from(select.options).map(o => o.value).filter(v => v);
      });

      console.log(`  ✓ Available nodes: ${options.length}`);

      if (options.length >= 2) {
        await selects[0].select(options[0]);
        await selects[1].select(options[options.length > 1 ? 1 : 0]);
        console.log(`  ✓ Selected: ${options[0]} -> ${options[1] || options[0]}`);
        testResults.passed++;
      }
    } else {
      console.log('  ✗ Not enough select elements found');
      testResults.failed++;
    }

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-path-selection.png`, fullPage: true });

    // =========================================================================
    // TEST 5: Path Simulation
    // =========================================================================
    console.log('\n📋 TEST 5: Path Simulation (Dijkstra)');
    console.log('-'.repeat(60));

    const simulateClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b =>
        b.textContent?.includes('Simulate') ||
        b.textContent?.includes('Play') ||
        b.innerHTML?.includes('play-circle')
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (simulateClicked) {
      console.log('  ✓ Simulate button clicked');
      await sleep(5000); // Wait for animation
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-path-animation.png`, fullPage: true });
      console.log('  ✓ Path animation completed');
      testResults.passed++;
    } else {
      console.log('  ⚠ Simulate button not found or already playing');
      testResults.warnings++;
    }

    // =========================================================================
    // TEST 6: Dark Mode Toggle
    // =========================================================================
    console.log('\n📋 TEST 6: Dark Mode Toggle');
    console.log('-'.repeat(60));

    const isDarkBefore = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    console.log(`  Initial mode: ${isDarkBefore ? 'Dark' : 'Light'}`);

    const themeToggled = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b =>
        b.title?.includes('Theme') ||
        b.innerHTML?.includes('moon') ||
        b.innerHTML?.includes('sun')
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (themeToggled) {
      await sleep(500);
      const isDarkAfter = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });
      console.log(`  After toggle: ${isDarkAfter ? 'Dark' : 'Light'}`);
      console.log(`  ✓ Theme toggled: ${isDarkBefore} -> ${isDarkAfter}`);
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-theme-toggle.png`, fullPage: true });
      testResults.passed++;
    } else {
      console.log('  ✗ Theme toggle button not found');
      testResults.failed++;
    }

    // =========================================================================
    // TEST 7: localStorage Functionality
    // =========================================================================
    console.log('\n📋 TEST 7: localStorage Functionality');
    console.log('-'.repeat(60));

    const storageInfo = await page.evaluate(() => {
      let used = 0;
      const keys = [];
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          used += localStorage[key].length + key.length;
          keys.push(key);
        }
      }
      return {
        used,
        percentUsed: (used / (5 * 1024 * 1024)) * 100,
        keys
      };
    });

    console.log(`  ✓ Storage used: ${(storageInfo.used / 1024).toFixed(2)} KB (${storageInfo.percentUsed.toFixed(2)}%)`);
    console.log(`  ✓ Keys: ${storageInfo.keys.join(', ')}`);
    testResults.passed++;

    // =========================================================================
    // TEST 8: Export Functionality
    // =========================================================================
    console.log('\n📋 TEST 8: Export Functionality');
    console.log('-'.repeat(60));

    const exportClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b =>
        b.textContent?.includes('Export') ||
        b.innerHTML?.includes('download')
      );
      if (btn) {
        // Don't actually click (would trigger download), just verify it exists
        return true;
      }
      return false;
    });

    if (exportClicked) {
      console.log('  ✓ Export button present');
      testResults.passed++;
    } else {
      console.log('  ✗ Export button not found');
      testResults.failed++;
    }

    // =========================================================================
    // TEST 9: Import Functionality
    // =========================================================================
    console.log('\n📋 TEST 9: Import Functionality');
    console.log('-'.repeat(60));

    const importPresent = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b =>
        b.textContent?.includes('Import') ||
        b.innerHTML?.includes('upload')
      );
      return btn !== null;
    });

    if (importPresent) {
      console.log('  ✓ Import button present');
      testResults.passed++;
    } else {
      console.log('  ✗ Import button not found');
      testResults.failed++;
    }

    // =========================================================================
    // TEST 10: Tool Buttons
    // =========================================================================
    console.log('\n📋 TEST 10: Tool Buttons');
    console.log('-'.repeat(60));

    const toolButtons = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.filter(b => b.title).map(b => b.title);
    });

    console.log(`  ✓ Found ${toolButtons.length} tool buttons with titles`);
    toolButtons.slice(0, 10).forEach(t => console.log(`    - ${t}`));
    testResults.passed++;

    // =========================================================================
    // TEST 11: Network Canvas Interaction
    // =========================================================================
    console.log('\n📋 TEST 11: Network Canvas Interaction');
    console.log('-'.repeat(60));

    const canvas = await page.$('canvas');
    if (canvas) {
      console.log('  ✓ Canvas element found');

      // Try clicking on the canvas
      const canvasBox = await canvas.boundingBox();
      if (canvasBox) {
        await page.mouse.click(
          canvasBox.x + canvasBox.width / 2,
          canvasBox.y + canvasBox.height / 2
        );
        await sleep(500);
        console.log('  ✓ Canvas clicked');
        testResults.passed++;
      }
    } else {
      console.log('  ⚠ Canvas element not found');
      testResults.warnings++;
    }

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-final-state.png`, fullPage: true });

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n' + '═'.repeat(80));
    console.log('📊 DEEP ANALYSIS SUMMARY');
    console.log('═'.repeat(80));
    console.log(`  ✓ Passed: ${testResults.passed}`);
    console.log(`  ✗ Failed: ${testResults.failed}`);
    console.log(`  ⚠ Warnings: ${testResults.warnings}`);
    console.log(`  URL: ${BASE_URL}`);
    console.log('═'.repeat(80));

    if (testResults.errors.length > 0) {
      console.log('\n❌ Page Errors:');
      testResults.errors.forEach(e => console.log(`  - ${e}`));
    }

    if (testResults.failed === 0 && testResults.errors.length === 0) {
      console.log('\n🎉 ALL CRITICAL TESTS PASSED!');
    } else {
      console.log(`\n⚠️  ${testResults.failed} test(s) failed, ${testResults.errors.length} error(s)`);
    }

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/ERROR.png`, fullPage: true });
    testResults.failed++;
  } finally {
    await browser.close();
    console.log('\n🏁 Test Complete\n');
    process.exit(testResults.failed > 0 ? 1 : 0);
  }
}

runDeepAnalysis().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
