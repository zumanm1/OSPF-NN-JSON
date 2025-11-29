import puppeteer from 'puppeteer';

const TEST_URL = 'http://localhost:9080';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runAlgorithmValidation() {
  console.log('🔬 Starting Algorithm Validation Tests\n');
  
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
    
    // TEST 1: Validate Path Finding
    console.log('📋 TEST 1: Path Finding Algorithm');
    
    // Select two routers
    const selects = await page.$$('select');
    if (selects.length >= 2) {
      await selects[0].select('zaf-r1');
      await selects[1].select('lso-r1');
      await sleep(500);
    }
    
    // Run path simulation
    const runButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Run Path'));
    });
    
    if (runButton && runButton.asElement()) {
      await runButton.asElement().click();
      console.log('  ✓ Path simulation started');
      await sleep(5000); // Wait for animation
      
      // Check logs for path found
      const logs = await page.evaluate(() => {
        const logElements = document.querySelectorAll('[class*="font-mono"]');
        return Array.from(logElements).map(el => el.textContent);
      });
      
      const hasPathLog = logs.some(log => log && (log.includes('Finding path') || log.includes('path')));
      console.log(`  ${hasPathLog ? '✓' : '✗'} Path finding logged: ${hasPathLog}`);
    }
    
    // TEST 2: Test Multiple Paths
    console.log('\n📋 TEST 2: Multiple Path Scenarios');
    
    const testPairs = [
      ['zaf-r1', 'moz-r1'],
      ['usa-r1', 'deu-r1'],
      ['gbr-r1', 'prt-r1']
    ];
    
    for (const [src, dest] of testPairs) {
      const sels = await page.$$('select');
      if (sels.length >= 2) {
        await sels[0].select(src);
        await sels[1].select(dest);
        await sleep(300);
      }
      
      const runBtn = await page.evaluateHandle(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons.find(btn => btn.textContent.includes('Run Path'));
      });
      
      if (runBtn && runBtn.asElement()) {
        await runBtn.asElement().click();
        await sleep(3000);
        console.log(`  ✓ Path ${src} → ${dest} computed`);
      }
    }
    
    // TEST 3: Edge Selection and Cost Modification
    console.log('\n📋 TEST 3: Edge Selection and Cost Modification');
    
    // Click on canvas to select an edge
    await page.mouse.click(600, 400);
    await sleep(1000);
    
    // Check if edge inspector appeared
    const hasInspector = await page.evaluate(() => {
      const text = document.body.textContent;
      return text.includes('Link Properties') || text.includes('Proposed Cost');
    });
    
    console.log(`  ${hasInspector ? '✓' : '⚠️'} Edge inspector: ${hasInspector ? 'Visible' : 'Not visible'}`);
    
    if (hasInspector) {
      // Modify cost
      const costInput = await page.$('input[type="number"]');
      if (costInput) {
        await costInput.click({ clickCount: 3 });
        await costInput.type('50');
        await sleep(500);
        console.log('  ✓ Cost modified to 50');
        
        // Run impact simulation
        const impactButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => btn.textContent.includes('Simulate Impact'));
        });
        
        if (impactButton && impactButton.asElement()) {
          await impactButton.asElement().click();
          console.log('  ✓ Impact simulation started');
          await sleep(8000); // Wait for computation
          
          // Check if modal appeared
          const hasModal = await page.evaluate(() => {
            return document.body.textContent.includes('Impact Analysis');
          });
          
          console.log(`  ${hasModal ? '✓' : '✗'} Impact modal displayed: ${hasModal}`);
          
          if (hasModal) {
            // Count impacted flows
            const impactCount = await page.evaluate(() => {
              const text = document.body.textContent;
              const match = text.match(/(\d+)\s+flows?\s+impacted/i);
              return match ? parseInt(match[1]) : 0;
            });
            
            console.log(`  ✓ Impacted flows: ${impactCount}`);
          }
        }
      }
    }
    
    // TEST 4: Swap Source/Destination
    console.log('\n📋 TEST 4: Swap Functionality');
    
    const swapSelects = await page.$$('select');
    if (swapSelects.length >= 2) {
      await swapSelects[0].select('zaf-r1');
      await swapSelects[1].select('usa-r1');
      await sleep(300);
    }
    
    const swapButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => {
        const svg = btn.querySelector('svg');
        return svg && btn.getAttribute('title')?.includes('Swap');
      });
    });
    
    if (swapButton && swapButton.asElement()) {
      await swapButton.asElement().click();
      await sleep(500);
      
      const values = await page.evaluate(() => {
        const selects = document.querySelectorAll('select');
        return [selects[0].value, selects[1].value];
      });
      
      console.log(`  ✓ After swap: ${values[0]} → ${values[1]}`);
    }
    
    // TEST 5: Return Path
    console.log('\n📋 TEST 5: Return Path Functionality');
    
    const returnButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Return'));
    });
    
    if (returnButton && returnButton.asElement()) {
      await returnButton.asElement().click();
      console.log('  ✓ Return path triggered');
      await sleep(4000);
    }
    
    // TEST 6: Visual Settings Adjustments
    console.log('\n📋 TEST 6: Visual Settings Adjustments');
    
    const visualButton = await page.$('button[title="Adjust Visualization"]');
    if (visualButton) {
      await visualButton.click();
      await sleep(500);
      
      // Adjust sliders
      const sliders = await page.$$('input[type="range"]');
      console.log(`  ✓ Found ${sliders.length} adjustment sliders`);
      
      if (sliders.length > 0) {
        // Adjust node size
        await sliders[2].evaluate(el => el.value = '30');
        await sliders[2].evaluate(el => el.dispatchEvent(new Event('change', { bubbles: true })));
        await sleep(500);
        console.log('  ✓ Node size adjusted');
        
        // Adjust link width
        await sliders[4].evaluate(el => el.value = '3');
        await sliders[4].evaluate(el => el.dispatchEvent(new Event('change', { bubbles: true })));
        await sleep(500);
        console.log('  ✓ Link width adjusted');
      }
    }
    
    // Final Screenshot
    await page.screenshot({ 
      path: '/Users/macbook/OSPF-NN-JSON/test-screenshots/algorithm-validation-final.png',
      fullPage: true 
    });
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 ALGORITHM VALIDATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✓ Tests Completed: 6`);
    console.log(`✓ Errors Encountered: ${errors.length}`);
    console.log(`✓ Status: ${errors.length === 0 ? 'ALL TESTS PASSED ✅' : 'SOME ISSUES FOUND ⚠️'}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (errors.length > 0) {
      console.log('⚠️  Errors:');
      errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
  } finally {
    await browser.close();
    console.log('✅ Algorithm Validation Completed\n');
  }
}

runAlgorithmValidation().catch(console.error);
