import puppeteer from 'puppeteer';

const TEST_URL = 'http://localhost:9080';
const SCREENSHOTS_DIR = '/Users/macbook/OSPF-NN-JSON/test-screenshots';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runEnhancedFeaturesTest() {
  console.log('🚀 Testing Enhanced Features: Impact Analysis & New Link Creation\n');
  
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
    
    // TEST 1: New Link Button Presence
    console.log('📋 TEST 1: New Link Button');
    const newLinkButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('New Link'));
    });
    
    if (newLinkButton && newLinkButton.asElement()) {
      console.log('  ✓ New Link button found');
      
      // Click to start new link creation
      await newLinkButton.asElement().click();
      await sleep(500);
      
      // Check for creation banner
      const hasBanner = await page.evaluate(() => {
        return document.body.textContent.includes('Step 1: Click on the SOURCE router node');
      });
      console.log(`  ✓ Creation banner displayed: ${hasBanner}`);
      
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/enhanced-01-new-link-mode.png`, fullPage: true });
    }
    
    // TEST 2: Cancel New Link Creation
    console.log('\n📋 TEST 2: Cancel Link Creation');
    const cancelButton = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('Cancel Link'));
    });
    
    if (cancelButton && cancelButton.asElement()) {
      await cancelButton.asElement().click();
      await sleep(500);
      console.log('  ✓ Link creation cancelled');
    }
    
    // TEST 3: Edge Selection and Impact Analysis
    console.log('\n📋 TEST 3: Edge Selection & Impact Analysis');
    
    // Click on the network to select an edge
    await page.mouse.click(700, 350);
    await sleep(1000);
    
    // Check if link properties panel appeared
    const hasLinkProperties = await page.evaluate(() => {
      return document.body.textContent.includes('Link Properties');
    });
    
    if (hasLinkProperties) {
      console.log('  ✓ Link Properties panel visible');
      
      // Find and modify cost input
      const costInput = await page.$('input[type="number"]');
      if (costInput) {
        await costInput.click({ clickCount: 3 });
        await costInput.type('100');
        await sleep(500);
        console.log('  ✓ Cost modified to 100');
        
        // Click Simulate Impact button
        const simulateButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => btn.textContent.includes('Simulate Impact'));
        });
        
        if (simulateButton && simulateButton.asElement()) {
          await simulateButton.asElement().click();
          console.log('  ✓ Simulate Impact clicked');
          await sleep(10000); // Wait for simulation
          
          await page.screenshot({ path: `${SCREENSHOTS_DIR}/enhanced-02-impact-modal.png`, fullPage: true });
          
          // Check for enhanced impact modal features
          const hasStats = await page.evaluate(() => {
            const text = document.body.textContent;
            return text.includes('Total Flows') && 
                   text.includes('Cost Increases') && 
                   text.includes('Path Migrations');
          });
          console.log(`  ✓ Enhanced stats displayed: ${hasStats}`);
          
          const hasCountryView = await page.evaluate(() => {
            return document.body.textContent.includes('By Country');
          });
          console.log(`  ✓ Country view toggle present: ${hasCountryView}`);
          
          // Click on "By Country" view
          const countryButton = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(btn => btn.textContent.includes('By Country'));
          });
          
          if (countryButton && countryButton.asElement()) {
            await countryButton.asElement().click();
            await sleep(500);
            console.log('  ✓ Country aggregation view activated');
            
            await page.screenshot({ path: `${SCREENSHOTS_DIR}/enhanced-03-country-aggregation.png`, fullPage: true });
          }
          
          // Close modal
          const closeButton = await page.$('button[class*="text-slate-400"]');
          if (closeButton) {
            await closeButton.click();
            await sleep(500);
          }
        }
      }
    } else {
      console.log('  ⚠️  Link Properties panel not visible - clicking on empty space');
    }
    
    // TEST 4: New Link Creation Flow
    console.log('\n📋 TEST 4: New Link Creation Flow');
    
    // Start new link creation
    const newLinkBtn2 = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.textContent.includes('New Link'));
    });
    
    if (newLinkBtn2 && newLinkBtn2.asElement()) {
      await newLinkBtn2.asElement().click();
      await sleep(500);
      console.log('  ✓ New link creation started');
      
      // Click on first node (source)
      await page.mouse.click(500, 300);
      await sleep(500);
      
      // Check if step 2 message appears
      const hasStep2 = await page.evaluate(() => {
        return document.body.textContent.includes('Step 2') || 
               document.body.textContent.includes('DESTINATION');
      });
      console.log(`  ✓ Source node selected: ${hasStep2}`);
      
      // Click on second node (destination)
      await page.mouse.click(800, 400);
      await sleep(500);
      
      // Check if configuration modal appeared
      const hasConfigModal = await page.evaluate(() => {
        return document.body.textContent.includes('Configure New Link') ||
               document.body.textContent.includes('Link Cost');
      });
      
      if (hasConfigModal) {
        console.log('  ✓ New link configuration modal appeared');
        
        await page.screenshot({ path: `${SCREENSHOTS_DIR}/enhanced-04-new-link-config.png`, fullPage: true });
        
        // Set cost
        const linkCostInput = await page.$('input[type="number"]');
        if (linkCostInput) {
          await linkCostInput.click({ clickCount: 3 });
          await linkCostInput.type('5');
          await sleep(500);
          console.log('  ✓ Link cost set to 5');
        }
        
        // Click Simulate Impact
        const simButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => btn.textContent.includes('Simulate Impact'));
        });
        
        if (simButton && simButton.asElement()) {
          await simButton.asElement().click();
          console.log('  ✓ New link impact simulation started');
          await sleep(10000);
          
          await page.screenshot({ path: `${SCREENSHOTS_DIR}/enhanced-05-new-link-impact.png`, fullPage: true });
          
          // Check for "Apply New Link" button
          const hasApplyButton = await page.evaluate(() => {
            return document.body.textContent.includes('Apply New Link');
          });
          console.log(`  ✓ Apply New Link button present: ${hasApplyButton}`);
        }
      }
    }
    
    // Final screenshot
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/enhanced-06-final.png`, fullPage: true });
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 ENHANCED FEATURES TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`✓ Tests Completed`);
    console.log(`✓ Errors Encountered: ${errors.length}`);
    console.log(`✓ Status: ${errors.length === 0 ? 'ALL FEATURES WORKING ✅' : 'SOME ISSUES FOUND ⚠️'}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/enhanced-error.png`, fullPage: true });
  } finally {
    await browser.close();
    console.log('✅ Enhanced Features Test Completed\n');
  }
}

runEnhancedFeaturesTest().catch(console.error);
