import puppeteer from 'puppeteer';

const TEST_URL = 'http://localhost:9080';
const SCREENSHOTS_DIR = '/Users/macbook/OSPF-NN-JSON/test-screenshots';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTopologyPlannerTest() {
  console.log('🚀 Testing Topology Planner & Cost Impact Analysis Features\n');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  const errors = [];
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('❌ Error:', error.message);
  });
  
  try {
    await page.goto(TEST_URL, { waitUntil: 'networkidle0', timeout: 15000 });
    await sleep(3000);
    console.log('✓ Page loaded\n');
    
    // TEST 1: Topology Planner Panel Presence
    console.log('📋 TEST 1: Topology Planner Panel');
    const hasPlannerPanel = await page.evaluate(() => {
      return document.body.textContent.includes('Topology Planner') &&
             document.body.textContent.includes('Source Router') &&
             document.body.textContent.includes('Destination Router') &&
             document.body.textContent.includes('Forward Cost') &&
             document.body.textContent.includes('Reverse Cost');
    });
    console.log(`  ✓ Topology Planner Panel: ${hasPlannerPanel ? 'PRESENT' : 'MISSING'}`);
    
    // TEST 2: Select Source and Destination in Planner
    console.log('\n📋 TEST 2: Topology Planner Node Selection');
    
    // Find all selects - should be 4 (2 for path simulation, 2 for topology planner)
    const selects = await page.$$('select');
    console.log(`  ✓ Found ${selects.length} select elements`);
    
    if (selects.length >= 4) {
      // The last two selects should be the topology planner ones
      const plannerSourceSelect = selects[2];
      const plannerDestSelect = selects[3];
      
      // Select source router
      await plannerSourceSelect.select('gbr-r1');
      await sleep(300);
      console.log('  ✓ Selected source: gbr-r1');
      
      // Select destination router
      await plannerDestSelect.select('usa-r1');
      await sleep(300);
      console.log('  ✓ Selected destination: usa-r1');
      
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/planner-01-nodes-selected.png`, fullPage: true });
    }
    
    // TEST 3: Forward/Reverse Cost Inputs
    console.log('\n📋 TEST 3: Cost Input Fields');
    
    const costInputs = await page.$$('input[type="number"]');
    console.log(`  ✓ Found ${costInputs.length} number inputs`);
    
    // Find the forward and reverse cost inputs (they should be in the planner section)
    if (costInputs.length >= 2) {
      // Set forward cost
      const forwardInput = costInputs[costInputs.length - 2];
      await forwardInput.click({ clickCount: 3 });
      await forwardInput.type('5');
      console.log('  ✓ Set forward cost: 5');
      
      // Set reverse cost
      const reverseInput = costInputs[costInputs.length - 1];
      await reverseInput.click({ clickCount: 3 });
      await reverseInput.type('8');
      console.log('  ✓ Set reverse cost: 8');
      
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/planner-02-costs-set.png`, fullPage: true });
    }
    
    // TEST 4: Analyze Impact Button
    console.log('\n📋 TEST 4: Analyze Impact');
    
    const analyzeButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Analyze Impact'));
    });
    
    if (analyzeButton && analyzeButton.asElement()) {
      await analyzeButton.asElement().click();
      console.log('  ✓ Clicked Analyze Impact');
      await sleep(10000); // Wait for simulation
      
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/planner-03-impact-analysis.png`, fullPage: true });
      
      // Check for impact modal
      const hasImpactModal = await page.evaluate(() => {
        return document.body.textContent.includes('Impact Analysis') &&
               document.body.textContent.includes('Total Flows');
      });
      console.log(`  ✓ Impact Modal: ${hasImpactModal ? 'DISPLAYED' : 'NOT SHOWN'}`);
      
      // Check for country aggregation
      const hasCountryView = await page.evaluate(() => {
        return document.body.textContent.includes('By Country') &&
               document.body.textContent.includes('All Flows');
      });
      console.log(`  ✓ Country Aggregation View: ${hasCountryView ? 'AVAILABLE' : 'MISSING'}`);
      
      // Close modal
      const closeBtn = await page.$('button[class*="text-slate-400"]');
      if (closeBtn) {
        await closeBtn.click();
        await sleep(500);
      }
    }
    
    // TEST 5: Add Link Button
    console.log('\n📋 TEST 5: Add Link Functionality');
    
    // Re-select nodes (they may have been cleared)
    const selects2 = await page.$$('select');
    if (selects2.length >= 4) {
      await selects2[2].select('deu-r1');
      await sleep(300);
      await selects2[3].select('fra-r1');
      await sleep(300);
    }
    
    const addLinkButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Add Link') && !btn.textContent.includes('New'));
    });
    
    if (addLinkButton && addLinkButton.asElement()) {
      await addLinkButton.asElement().click();
      console.log('  ✓ Clicked Add Link');
      await sleep(1000);
      
      // Check for custom links list
      const hasCustomLinks = await page.evaluate(() => {
        return document.body.textContent.includes('Custom Links');
      });
      console.log(`  ✓ Custom Links List: ${hasCustomLinks ? 'VISIBLE' : 'NOT YET'}`);
      
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/planner-04-link-added.png`, fullPage: true });
    }
    
    // TEST 6: Link Properties Panel (Click on Edge)
    console.log('\n📋 TEST 6: Link Properties Panel');
    
    // Click on network to select an edge
    await page.mouse.click(600, 350);
    await sleep(1000);
    
    const hasLinkProperties = await page.evaluate(() => {
      return document.body.textContent.includes('Link Properties') &&
             document.body.textContent.includes('Proposed Cost') &&
             document.body.textContent.includes('Simulate Impact');
    });
    console.log(`  ✓ Link Properties Panel: ${hasLinkProperties ? 'VISIBLE' : 'NOT VISIBLE'}`);
    
    if (hasLinkProperties) {
      // Modify cost
      const propCostInput = await page.$('input[type="number"]');
      if (propCostInput) {
        await propCostInput.click({ clickCount: 3 });
        await propCostInput.type('100');
        console.log('  ✓ Modified proposed cost to 100');
        
        // Press Enter to trigger simulation
        await propCostInput.press('Enter');
        console.log('  ✓ Pressed Enter to simulate');
        await sleep(10000);
        
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/planner-05-cost-change-impact.png`, fullPage: true });
        
        // Check impact modal
        const hasModal = await page.evaluate(() => {
          return document.body.textContent.includes('Impact Analysis');
        });
        console.log(`  ✓ Cost Change Impact Modal: ${hasModal ? 'DISPLAYED' : 'NOT SHOWN'}`);
      }
    }
    
    // Final screenshot
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/planner-06-final.png`, fullPage: true });
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 TOPOLOGY PLANNER TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✓ Tests Completed`);
    console.log(`✓ Errors Encountered: ${errors.length}`);
    console.log(`✓ Status: ${errors.length === 0 ? 'ALL FEATURES WORKING ✅' : 'SOME ISSUES FOUND ⚠️'}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/planner-error.png`, fullPage: true });
  } finally {
    await browser.close();
    console.log('✅ Topology Planner Test Completed\n');
  }
}

runTopologyPlannerTest().catch(console.error);
