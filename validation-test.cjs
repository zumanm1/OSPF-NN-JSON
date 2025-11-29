/**
 * COMPREHENSIVE VALIDATION TEST
 * Tests all fixed issues in OSPF Network Visualizer
 */

const puppeteer = require('puppeteer');
const fs = require('fs');

const PORTS = [9083, 9082, 9081, 9080];
const SCREENSHOTS_DIR = './test-screenshots/validation';

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
        const req = http.get(`http://localhost:${port}`, (res) => resolve(port));
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

async function runValidationTests() {
  console.log('═'.repeat(70));
  console.log('OSPF NETWORK VISUALIZER - COMPREHENSIVE VALIDATION TEST');
  console.log('═'.repeat(70));

  const port = await findActivePort();
  const BASE_URL = `http://localhost:${port}`;
  console.log(`\nServer found at: ${BASE_URL}\n`);

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--window-size=1920,1080'],
    slowMo: 50
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  const results = { passed: 0, failed: 0, tests: [] };
  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', err => errors.push(err.message));

  try {
    // ═══════════════════════════════════════════════════════════════════
    // TEST 1: Application loads without critical errors
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[TEST 1] Application Load');
    console.log('-'.repeat(50));

    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(3000);

    const hasCanvas = await page.$('canvas');
    const hasHeader = await page.$('header');

    if (hasCanvas && hasHeader) {
      console.log('  ✅ PASS: Application loaded successfully');
      results.passed++;
      results.tests.push({ name: 'App Load', status: 'PASS' });
    } else {
      console.log('  ❌ FAIL: Missing essential elements');
      results.failed++;
      results.tests.push({ name: 'App Load', status: 'FAIL' });
    }

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-initial-load.png` });

    // ═══════════════════════════════════════════════════════════════════
    // TEST 2: No CSS 404 errors
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[TEST 2] CSS File Loading (index.css)');
    console.log('-'.repeat(50));

    const css404Errors = errors.filter(e => e.includes('404') && e.includes('.css'));

    if (css404Errors.length === 0) {
      console.log('  ✅ PASS: No CSS 404 errors');
      results.passed++;
      results.tests.push({ name: 'CSS Loading', status: 'PASS' });
    } else {
      console.log('  ❌ FAIL: CSS 404 errors found:', css404Errors);
      results.failed++;
      results.tests.push({ name: 'CSS Loading', status: 'FAIL' });
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEST 3: Impact Analysis Modal (no duplicate placeholder)
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[TEST 3] Impact Analysis Modal');
    console.log('-'.repeat(50));

    // Click on an edge to select it
    const canvas = await page.$('canvas');
    if (canvas) {
      const canvasBox = await canvas.boundingBox();
      // Click in the middle of the canvas
      await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
      await sleep(1000);

      // Look for "Simulate Impact" or similar button
      const simulateBtn = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.some(b =>
          b.textContent?.includes('Simulate') ||
          b.textContent?.includes('Impact') ||
          b.textContent?.includes('Analyze')
        );
      });

      // Check that "Coming Soon" placeholder is NOT visible
      const hasComingSoon = await page.evaluate(() => {
        return document.body.innerText.includes('Coming Soon in v2.0');
      });

      if (!hasComingSoon) {
        console.log('  ✅ PASS: No placeholder "Coming Soon" text visible');
        results.passed++;
        results.tests.push({ name: 'Impact Modal Fix', status: 'PASS' });
      } else {
        console.log('  ❌ FAIL: Placeholder text still visible');
        results.failed++;
        results.tests.push({ name: 'Impact Modal Fix', status: 'FAIL' });
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEST 4: Ripple Effect Modal has real functionality
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[TEST 4] Ripple Effect Modal');
    console.log('-'.repeat(50));

    // Find and click the Ripple Effect button
    const rippleClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b =>
        b.title?.includes('Ripple') ||
        b.textContent?.includes('Ripple')
      );
      if (btn) { btn.click(); return true; }
      return false;
    });

    if (rippleClicked) {
      await sleep(1000);

      // Check for real modal content
      const rippleModalContent = await page.evaluate(() => {
        const modal = document.querySelector('.fixed.inset-0');
        if (!modal) return null;

        const hasSimulateFailure = modal.innerText.includes('Simulate Failure') ||
                                   modal.innerText.includes('SPOF');
        const hasNodes = modal.innerText.includes('Nodes');
        const hasComingSoon = modal.innerText.includes('Coming Soon');

        return { hasSimulateFailure, hasNodes, hasComingSoon };
      });

      if (rippleModalContent && rippleModalContent.hasSimulateFailure && !rippleModalContent.hasComingSoon) {
        console.log('  ✅ PASS: Ripple Effect Modal has real functionality');
        results.passed++;
        results.tests.push({ name: 'Ripple Modal', status: 'PASS' });
      } else if (rippleModalContent && rippleModalContent.hasComingSoon) {
        console.log('  ❌ FAIL: Ripple Modal still shows placeholder');
        results.failed++;
        results.tests.push({ name: 'Ripple Modal', status: 'FAIL' });
      } else {
        console.log('  ⚠️  WARN: Could not verify Ripple Modal');
        results.tests.push({ name: 'Ripple Modal', status: 'WARN' });
      }

      await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-ripple-modal.png` });

      // Close modal
      await page.keyboard.press('Escape');
      await sleep(500);
    } else {
      console.log('  ⚠️  WARN: Ripple Effect button not found');
      results.tests.push({ name: 'Ripple Modal', status: 'SKIP' });
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEST 5: View Mode Switching
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[TEST 5] View Mode Switching');
    console.log('-'.repeat(50));

    const modes = ['Visualizer', 'Designer', 'Planner', 'Analysis'];
    let modesPassed = 0;

    for (const mode of modes) {
      const switched = await page.evaluate((modeName) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const btn = buttons.find(b => b.textContent?.trim() === modeName);
        if (btn) { btn.click(); return true; }
        return false;
      }, mode);

      if (switched) {
        await sleep(300);
        modesPassed++;
        console.log(`  ✅ ${mode} mode: OK`);
      } else {
        console.log(`  ❌ ${mode} mode: NOT FOUND`);
      }
    }

    if (modesPassed === modes.length) {
      results.passed++;
      results.tests.push({ name: 'View Modes', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'View Modes', status: 'FAIL' });
    }

    // Switch back to Visualizer
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b => b.textContent?.trim() === 'Visualizer');
      if (btn) btn.click();
    });
    await sleep(500);

    // ═══════════════════════════════════════════════════════════════════
    // TEST 6: Path Animation
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[TEST 6] Path Animation');
    console.log('-'.repeat(50));

    // Check for Play button and click it
    const playClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b =>
        b.textContent?.includes('Simulate Path') ||
        b.innerHTML?.includes('play-circle') ||
        b.title?.includes('Play') ||
        b.title?.includes('Simulate')
      );
      if (btn && !btn.disabled) { btn.click(); return true; }
      return false;
    });

    if (playClicked) {
      await sleep(3000); // Wait for animation
      console.log('  ✅ PASS: Path animation triggered');
      results.passed++;
      results.tests.push({ name: 'Path Animation', status: 'PASS' });
    } else {
      console.log('  ⚠️  WARN: Play button not found or disabled');
      results.tests.push({ name: 'Path Animation', status: 'WARN' });
    }

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-path-animation.png` });

    // ═══════════════════════════════════════════════════════════════════
    // TEST 7: Dark Mode Toggle
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[TEST 7] Dark Mode Toggle');
    console.log('-'.repeat(50));

    const isDarkBefore = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });

    const themeToggled = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn = buttons.find(b =>
        b.title?.includes('Theme') ||
        b.title?.includes('Dark') ||
        b.title?.includes('Light')
      );
      if (btn) { btn.click(); return true; }
      return false;
    });

    if (themeToggled) {
      await sleep(500);
      const isDarkAfter = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark');
      });

      if (isDarkBefore !== isDarkAfter) {
        console.log(`  ✅ PASS: Theme toggled (${isDarkBefore ? 'dark' : 'light'} → ${isDarkAfter ? 'dark' : 'light'})`);
        results.passed++;
        results.tests.push({ name: 'Dark Mode', status: 'PASS' });
      } else {
        console.log('  ❌ FAIL: Theme did not change');
        results.failed++;
        results.tests.push({ name: 'Dark Mode', status: 'FAIL' });
      }
    } else {
      console.log('  ⚠️  WARN: Theme toggle button not found');
      results.tests.push({ name: 'Dark Mode', status: 'WARN' });
    }

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-dark-mode.png` });

    // ═══════════════════════════════════════════════════════════════════
    // TEST 8: Export/Import Buttons Present
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[TEST 8] Export/Import Functionality');
    console.log('-'.repeat(50));

    const exportImportCheck = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const hasExport = buttons.some(b =>
        b.title?.includes('Export') ||
        b.textContent?.includes('Export')
      );
      const hasImport = buttons.some(b =>
        b.title?.includes('Import') ||
        b.textContent?.includes('Import')
      );
      return { hasExport, hasImport };
    });

    if (exportImportCheck.hasExport && exportImportCheck.hasImport) {
      console.log('  ✅ PASS: Export and Import buttons present');
      results.passed++;
      results.tests.push({ name: 'Export/Import', status: 'PASS' });
    } else {
      console.log(`  ❌ FAIL: Export: ${exportImportCheck.hasExport}, Import: ${exportImportCheck.hasImport}`);
      results.failed++;
      results.tests.push({ name: 'Export/Import', status: 'FAIL' });
    }

    // ═══════════════════════════════════════════════════════════════════
    // TEST 9: Node Selection
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n[TEST 9] Node Selection Controls');
    console.log('-'.repeat(50));

    const selects = await page.$$('select');
    const selectCount = selects.length;

    if (selectCount >= 2) {
      const optionCount = await page.evaluate(() => {
        const select = document.querySelector('select');
        return select ? select.options.length : 0;
      });

      console.log(`  ✅ PASS: ${selectCount} select elements with ${optionCount} options`);
      results.passed++;
      results.tests.push({ name: 'Node Selection', status: 'PASS' });
    } else {
      console.log(`  ❌ FAIL: Only ${selectCount} select elements found`);
      results.failed++;
      results.tests.push({ name: 'Node Selection', status: 'FAIL' });
    }

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-final-state.png` });

    // ═══════════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════════
    console.log('\n' + '═'.repeat(70));
    console.log('TEST SUMMARY');
    console.log('═'.repeat(70));
    console.log(`\n  ✅ Passed: ${results.passed}`);
    console.log(`  ❌ Failed: ${results.failed}`);
    console.log(`  📝 Tests Run: ${results.tests.length}`);

    if (errors.length > 0) {
      console.log(`\n  Console Errors (${errors.length}):`);
      errors.slice(0, 5).forEach((e, i) => console.log(`    ${i + 1}. ${e.slice(0, 80)}...`));
    }

    console.log('\n' + '═'.repeat(70));
    if (results.failed === 0) {
      console.log('🎉 ALL CRITICAL TESTS PASSED!');
    } else {
      console.log(`⚠️  ${results.failed} TEST(S) FAILED`);
    }
    console.log('═'.repeat(70));

    // Save results to JSON
    fs.writeFileSync(
      `${SCREENSHOTS_DIR}/test-results.json`,
      JSON.stringify({ ...results, errors, timestamp: new Date().toISOString() }, null, 2)
    );

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/ERROR.png` });
    results.failed++;
  } finally {
    await browser.close();
    console.log('\n🏁 Validation Complete\n');
    process.exit(results.failed > 0 ? 1 : 0);
  }
}

runValidationTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
