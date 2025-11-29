import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080 });
  
  console.log('Navigating to http://localhost:9080...');
  
  try {
    await page.goto('http://localhost:9080', { 
      waitUntil: 'networkidle0', 
      timeout: 15000 
    });
    
    console.log('✓ Page loaded, waiting 5 seconds for full render...');
    
    // Wait longer for the network graph to stabilize
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Take screenshot
    await page.screenshot({ 
      path: '/Users/macbook/OSPF-NN-JSON/app-screenshot-final.png',
      fullPage: true 
    });
    console.log('✓ Screenshot saved to app-screenshot-final.png');
    
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
  
  await browser.close();
})();
