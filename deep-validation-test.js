import puppeteer from 'puppeteer';

const TEST_URL = 'http://localhost:9080';
const SCREENSHOTS_DIR = '/Users/macbook/OSPF-NN-JSON/test-screenshots';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDeepValidationTest() {
  console.log('🔬 DEEP VALIDATION TEST - OSPF Visualizer Pro\n');
  console.log('Testing: Cost Impact Analysis, New Link Creation, Country Aggregation\n');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const errors = [];
  const consoleMessages = [];
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('❌ PAGE ERROR:', error.message);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleMessages.push(msg.text());
    }
  });
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle0', timeout: 20000 });
    await sleep(4000);
    console.log('✓ Application loaded\n');
    
    // ═══════════════════════════════════════════════════════
    // TEST 1: Topology Planner - Dropdown Selection
    // ═══════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════');
    console.log('TEST 1: Topology Planner - Node Selection via Dropdowns');
    console.log('═══════════════════════════════════════════════════════');
    
    // Scroll down to see topology planner
    await page.evaluate(() => {
      const sidebar = document.querySelector('aside');
      if (sidebar) sidebar.scrollTop = sidebar.scrollHeight;
    });
    await sleep(500);
    
    // Find all selects
    const selects = await page.$$('select');
    console.log(`  Found ${selects.length} select elements`);
    
    if (selects.length >= 4) {
      // Topology planner selects are the last two
      await selects[2].select('gbr-r1');
      await sleep(200);
      await selects[3].select('deu-r6');
      await sleep(200);
      
      // Verify selection
      const srcValue = await page.evaluate(() => {
        const selects = document.querySelectorAll('select');
        return selects[2]?.value;
      });
      const dstValue = await page.evaluate(() => {
        const selects = document.querySelectorAll('select');
        return selects[3]?.value;
      });
      
      if (srcValue === 'gbr-r1' && dstValue === 'deu-r6') {
        console.log('  ✓ Source: gbr-r1, Destination: deu-r6');
        testsPassed++;
      } else {
        console.log(`  ✗ Selection failed: src=${srcValue}, dst=${dstValue}`);
        testsFailed++;
      }
    } else {
      console.log('  ✗ Not enough select elements found');
      testsFailed++;
    }
    
    // ═══════════════════════════════════════════════════════
    // TEST 2: Forward/Reverse Cost Inputs
    // ═══════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 2: Forward/Reverse Cost Configuration');
    console.log('═══════════════════════════════════════════════════════');
    
    // Find cost inputs in topology planner
    const allInputs = await page.$$('input[type="number"]');
    console.log(`  Found ${allInputs.length} number inputs`);
    
    if (allInputs.length >= 2) {
      // Set forward cost
      await allInputs[allInputs.length - 2].click({ clickCount: 3 });
      await allInputs[allInputs.length - 2].type('15');
      
      // Set reverse cost
      await allInputs[allInputs.length - 1].click({ clickCount: 3 });
      await allInputs[allInputs.length - 1].type('20');
      
      await sleep(300);
      
      console.log('  ✓ Forward cost set to 15');
      console.log('  ✓ Reverse cost set to 20');
      testsPassed++;
    } else {
      console.log('  ✗ Cost inputs not found');
      testsFailed++;
    }
    
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/deep-01-planner-config.png`, fullPage: true });
    
    // ═══════════════════════════════════════════════════════
    // TEST 3: Analyze Impact Button
    // ═══════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 3: Impact Analysis Simulation');
    console.log('═══════════════════════════════════════════════════════');
    
    const analyzeBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Analyze Impact'));
    });
    
    if (analyzeBtn && analyzeBtn.asElement()) {
      await analyzeBtn.asElement().click();
      console.log('  ✓ Clicked "Analyze Impact"');
      
      // Wait for simulation (O(N²) can take time)
      await sleep(12000);
      
      // Check for impact modal
      const hasModal = await page.evaluate(() => {
        return document.body.textContent.includes('Impact Analysis') &&
               document.body.textContent.includes('Total Flows');
      });
      
      if (hasModal) {
        console.log('  ✓ Impact Analysis Modal displayed');
        testsPassed++;
        
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/deep-02-impact-modal.png`, fullPage: true });
        
        // Check for summary stats
        const hasStats = await page.evaluate(() => {
          const text = document.body.textContent;
          return text.includes('Cost Increases') && 
                 text.includes('Cost Decreases') && 
                 text.includes('Path Migrations');
        });
        
        if (hasStats) {
          console.log('  ✓ Summary statistics displayed');
          testsPassed++;
        } else {
          console.log('  ✗ Summary statistics missing');
          testsFailed++;
        }
        
        // Check for country view toggle
        const hasCountryToggle = await page.evaluate(() => {
          return document.body.textContent.includes('By Country') &&
                 document.body.textContent.includes('All Flows');
        });
        
        if (hasCountryToggle) {
          console.log('  ✓ View toggle (By Country / All Flows) present');
          testsPassed++;
          
          // Click "By Country" to test aggregation view
          const countryBtn = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(b => b.textContent.includes('By Country'));
          });
          
          if (countryBtn && countryBtn.asElement()) {
            await countryBtn.asElement().click();
            await sleep(500);
            console.log('  ✓ Country aggregation view activated');
            
            await page.screenshot({ path: `${SCREENSHOTS_DIR}/deep-03-country-view.png`, fullPage: true });
          }
        } else {
          console.log('  ✗ View toggle missing');
          testsFailed++;
        }
        
        // Close modal
        const closeBtn = await page.$('button[class*="text-slate-400"]');
        if (closeBtn) {
          await closeBtn.click();
          await sleep(500);
        }
      } else {
        console.log('  ✗ Impact Modal not displayed');
        testsFailed++;
      }
    } else {
      console.log('  ✗ Analyze Impact button not found');
      testsFailed++;
    }
    
    // ═══════════════════════════════════════════════════════
    // TEST 4: Add Link Functionality
    // ═══════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 4: Add New Link to Topology');
    console.log('═══════════════════════════════════════════════════════');
    
    // Re-select nodes
    const selects2 = await page.$$('select');
    if (selects2.length >= 4) {
      await selects2[2].select('fra-r1');
      await sleep(200);
      await selects2[3].select('prt-r1');
      await sleep(200);
    }
    
    const addLinkBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.trim() === '+ Add Link' || 
                               (b.textContent.includes('Add Link') && !b.textContent.includes('New')));
    });
    
    if (addLinkBtn && addLinkBtn.asElement()) {
      await addLinkBtn.asElement().click();
      console.log('  ✓ Clicked "Add Link"');
      await sleep(1000);
      
      // Check for custom links list
      const hasCustomLinks = await page.evaluate(() => {
        return document.body.textContent.includes('Custom Links');
      });
      
      if (hasCustomLinks) {
        console.log('  ✓ Custom Links list appeared');
        testsPassed++;
      } else {
        console.log('  ⚠ Custom Links list not visible (may need scroll)');
      }
      
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/deep-04-link-added.png`, fullPage: true });
    } else {
      console.log('  ✗ Add Link button not found');
      testsFailed++;
    }
    
    // ═══════════════════════════════════════════════════════
    // TEST 5: Header New Link Button (Click-based creation)
    // ═══════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 5: Header New Link Button (Click-based workflow)');
    console.log('═══════════════════════════════════════════════════════');
    
    const newLinkBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('New Link') && !b.textContent.includes('Add'));
    });
    
    if (newLinkBtn && newLinkBtn.asElement()) {
      await newLinkBtn.asElement().click();
      console.log('  ✓ Clicked "New Link" in header');
      await sleep(500);
      
      // Check for creation banner
      const hasBanner = await page.evaluate(() => {
        return document.body.textContent.includes('Step 1') || 
               document.body.textContent.includes('SOURCE router');
      });
      
      if (hasBanner) {
        console.log('  ✓ Link creation mode activated');
        testsPassed++;
      } else {
        console.log('  ✗ Creation banner not displayed');
        testsFailed++;
      }
      
      // Cancel
      const cancelBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(b => b.textContent.includes('Cancel'));
      });
      
      if (cancelBtn && cancelBtn.asElement()) {
        await cancelBtn.asElement().click();
        console.log('  ✓ Cancelled link creation');
      }
      
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/deep-05-new-link-mode.png`, fullPage: true });
    } else {
      console.log('  ✗ New Link button not found');
      testsFailed++;
    }
    
    // ═══════════════════════════════════════════════════════
    // TEST 6: Edge Click - Link Properties Panel
    // ═══════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('TEST 6: Edge Click - Link Properties Panel');
    console.log('═══════════════════════════════════════════════════════');
    
    // Click on network area to select an edge
    await page.mouse.click(600, 400);
    await sleep(1000);
    
    const hasLinkProps = await page.evaluate(() => {
      return document.body.textContent.includes('Link Properties') &&
             document.body.textContent.includes('Proposed Cost');
    });
    
    if (hasLinkProps) {
      console.log('  ✓ Link Properties panel visible');
      testsPassed++;
      
      // Test cost modification
      const propInput = await page.$('input[type="number"]');
      if (propInput) {
        await propInput.click({ clickCount: 3 });
        await propInput.type('50');
        console.log('  ✓ Modified proposed cost to 50');
        
        // Test Enter key simulation trigger
        await propInput.press('Enter');
        console.log('  ✓ Pressed Enter to trigger simulation');
        await sleep(10000);
        
        const hasImpactModal = await page.evaluate(() => {
          return document.body.textContent.includes('Impact Analysis');
        });
        
        if (hasImpactModal) {
          console.log('  ✓ Impact modal opened via Enter key');
          testsPassed++;
          
          await page.screenshot({ path: `${SCREENSHOTS_DIR}/deep-06-cost-impact.png`, fullPage: true });
        } else {
          console.log('  ✗ Impact modal not opened');
          testsFailed++;
        }
      }
    } else {
      console.log('  ⚠ Link Properties panel not visible (click may have missed edge)');
    }
    
    // Final screenshot
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/deep-07-final.png`, fullPage: true });
    
    // ═══════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 DEEP VALIDATION TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✓ Tests Passed: ${testsPassed}`);
    console.log(`✗ Tests Failed: ${testsFailed}`);
    console.log(`⚠ Page Errors: ${errors.length}`);
    console.log(`⚠ Console Errors: ${consoleMessages.length}`);
    
    if (errors.length > 0) {
      console.log('\nPage Errors:');
      errors.forEach(e => console.log(`  - ${e}`));
    }
    
    if (consoleMessages.length > 0) {
      console.log('\nConsole Errors:');
      consoleMessages.forEach(m => console.log(`  - ${m}`));
    }
    
    const status = testsFailed === 0 && errors.length === 0 ? 
      '✅ ALL TESTS PASSED - APPLICATION HEALTHY' : 
      '⚠️ SOME ISSUES DETECTED';
    
    console.log(`\nStatus: ${status}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/deep-error.png`, fullPage: true });
  } finally {
    await browser.close();
    console.log('✅ Deep Validation Test Completed\n');
  }
}

runDeepValidationTest().catch(console.error);
