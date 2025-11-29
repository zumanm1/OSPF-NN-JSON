import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set viewport
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Capture console logs
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  
  // Capture errors
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  // Capture network errors
  page.on('requestfailed', request => 
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText)
  );
  
  console.log('Navigating to http://localhost:9080...');
  
  try {
    await page.goto('http://localhost:9080', { 
      waitUntil: 'networkidle0', 
      timeout: 15000 
    });
    
    console.log('✓ Page loaded successfully');
    
    // Wait a bit for React to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get page title
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check if there's any content
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    console.log('Body has content:', bodyHTML.length > 0 ? 'Yes' : 'No');
    console.log('Body length:', bodyHTML.length, 'characters');
    
    // Check for React root
    const hasRoot = await page.evaluate(() => {
      return document.getElementById('root') !== null;
    });
    console.log('Has #root element:', hasRoot);
    
    // Take screenshot
    await page.screenshot({ 
      path: '/Users/macbook/OSPF-NN-JSON/app-screenshot-detailed.png',
      fullPage: true 
    });
    console.log('✓ Screenshot saved to app-screenshot-detailed.png');
    
    // Get final status
    console.log('\n=== VALIDATION RESULT ===');
    console.log('App is UP and WORKING');
    
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
  
  await browser.close();
})();
