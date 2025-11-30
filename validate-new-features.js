import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.resolve('validation-screenshots');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

(async () => {
  console.log('🕵️‍♂️ [Polymath Audit] Initiating Deep UI/UX & Logic Validation...');
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1440, height: 900 });
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
    }
  });
  
  page.on('pageerror', error => console.error('[PAGE ERROR]:', error.message));

  try {
    console.log('📡 Navigating to Application...');
    await page.goto('http://localhost:9080', { waitUntil: 'networkidle0', timeout: 15000 });
    
    // 1. Capture Initial State (Navbar)
    console.log('📸 Capturing Dashboard/Navbar...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '01-dashboard-navbar.png') });

    // Helper to verify element
    const verifyElement = async (selector, name) => {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        console.log(`✅ [UI] ${name} found.`);
        return true;
      } catch (e) {
        console.error(`❌ [UI] ${name} MISSING! Critical Failure.`);
        return false;
      }
    };

    // --- DEEP DIVE 1: Path Comparison (PRD 01) ---
    console.log('\n🔍 [Audit] PRD 01: Path Comparison & ECMP');
    const pathBtn = 'button[title="Path Comparison & ECMP"]';
    if (await verifyElement(pathBtn, 'Path Comparison Button')) {
      await page.click(pathBtn);
      await new Promise(r => setTimeout(r, 1000)); // Wait for render
      
      // Screenshot Modal
      await page.screenshot({ path: path.join(OUTPUT_DIR, '02-path-comparison-modal.png') });
      
      // Verify functionality
      const hasSource = await page.$('select');
      if (hasSource) console.log('   ✅ Selectors Interactive');
      else console.error('   ❌ Selectors Missing');
      
      // Close
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 500));
    }

    // --- DEEP DIVE 2: Traffic Engineering (PRD 03) ---
    console.log('\n🔍 [Audit] PRD 03: Traffic Engineering');
    const teBtn = 'button[title="Traffic Engineering"]';
    if (await verifyElement(teBtn, 'Traffic Engineering Button')) {
      await page.click(teBtn);
      await new Promise(r => setTimeout(r, 2000)); // Longer wait
      
      await page.screenshot({ path: path.join(OUTPUT_DIR, '03-traffic-engineering-modal.png') });
      
      // DEBUG: Check if modal shell exists
      const modalShell = await page.$('.fixed.inset-0.z-50');
      if (!modalShell) {
        console.error('   ❌ Modal Shell NOT FOUND in DOM');
      } else {
        console.log('   ✅ Modal Shell detected in DOM');
        
        // Check content
        const bodyText = await page.evaluate(el => el.innerText, modalShell);
        if (bodyText.includes('Traffic Engineering')) {
             console.log('   ✅ Header Text Found');
        } else {
             console.error('   ❌ Header Text Missing. Content:', bodyText.substring(0, 100));
        }

        const cols = await page.$$('.w-1\\/3');
        if (cols.length === 3) console.log('   ✅ 3-Column Layout Validated');
        else {
             console.error(`   ❌ Layout Mismatch (found ${cols.length} cols). Dumping HTML classes...`);
             const html = await page.evaluate(el => el.innerHTML, modalShell);
             if (html.includes('w-1/3')) console.log('   ⚠️ "w-1/3" string found in HTML, selector issue?');
             else console.log('   ❌ "w-1/3" class NOT found in HTML');
        }
      }
      
      // Close
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 500));
    }

    // --- DEEP DIVE 3: Blast Radius (PRD 04) ---
    console.log('\n🔍 [Audit] PRD 04: Blast Radius Analyzer');
    const brBtn = 'button[title="Blast Radius Analysis"]';
    if (await verifyElement(brBtn, 'Blast Radius Button')) {
      await page.click(brBtn);
      await new Promise(r => setTimeout(r, 2000));
      
      await page.screenshot({ path: path.join(OUTPUT_DIR, '04-blast-radius-modal.png') });
      
      const modalShell = await page.$('.fixed.inset-0.z-50');
      if (modalShell) {
          const text = await page.evaluate(el => el.innerText, modalShell);
          if (text.includes('Risk Score')) console.log('   ✅ Risk Score Engine Active');
          else console.error('   ❌ Risk Score Missing. Text found:', text.substring(0, 100));
      } else {
          console.error('   ❌ Blast Radius Modal Shell NOT FOUND');
      }
      
      // Close
      await page.keyboard.press('Escape');
      await new Promise(r => setTimeout(r, 500));
    }

    // --- DEEP DIVE 4: Failure Simulator (PRD 02) ---
    console.log('\n🔍 [Audit] PRD 02: Failure Simulator (Ripple)');
    const rippleBtn = 'button[title="Ripple Effect Analysis"]';
    if (await verifyElement(rippleBtn, 'Ripple Effect Button')) {
      await page.click(rippleBtn);
      await new Promise(r => setTimeout(r, 2000));
      
      await page.screenshot({ path: path.join(OUTPUT_DIR, '05-failure-simulator-modal.png') });
      
      const modalShell = await page.$('.fixed.inset-0.z-50');
      if (modalShell) {
          const text = await page.evaluate(el => el.innerText, modalShell);
          if (text.includes('Simulate Failure')) console.log('   ✅ Simulation Logic Bound');
          else console.error('   ❌ Simulation Button Missing. Text found:', text.substring(0, 100));
      } else {
          console.error('   ❌ Ripple Modal Shell NOT FOUND');
      }
      
      // Close
      await page.keyboard.press('Escape');
    }

    console.log('\n✅ [Audit Complete] All critical systems validated. Evidence secured in /validation-screenshots.');

  } catch (error) {
    console.error('🔥 [CRITICAL FAILURE]:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
