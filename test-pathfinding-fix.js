/**
 * PUPPETEER END-TO-END TEST
 * Testing pathfinding bug fix for imported topologies
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const TEST_CONFIG = {
  url: 'http://localhost:9080',
  username: 'testuser',
  password: 'Test123!@#',
  topologyFile: './zzzi--input-files/netviz-pro-topology-2025-11-30T18_44_02.838Z.json',
  testCases: [
    { source: 'gbr-ldn-wst-pe09', dest: 'deu-ber-bes-pe10', expectedPath: true },
    { source: 'gbr-ldn-wst-p07', dest: 'deu-ber-bes-pe10', expectedPath: true },
    { source: 'zwe-hra-pop-p02', dest: 'zwe-bul-pop-p03', expectedPath: true }
  ]
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('\n='.repeat(80));
  console.log('🧪 PATHFINDING BUG FIX - PUPPETEER VALIDATION TEST');
  console.log('='.repeat(80));
  console.log(`Test Date: ${new Date().toISOString()}`);
  console.log('='.repeat(80) + '\n');

  let browser;
  let testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    tests: []
  };

  try {
    // Launch browser
    console.log('📦 Launching browser...');
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // TEST 1: Login
    console.log('\n📝 TEST 1: Login Authentication');
    console.log('-'.repeat(80));
    await page.goto(TEST_CONFIG.url, { waitUntil: 'networkidle0' });
    
    const hasLoginPage = await page.$('input[type="email"]');
    if (hasLoginPage) {
      console.log('✓ Login page detected');
      await page.type('input[type="email"]', TEST_CONFIG.username);
      await page.type('input[type="password"]', TEST_CONFIG.password);
      await page.click('button[type="submit"]');
      await sleep(3000);
    } else {
      console.log('✓ Already logged in');
    }
    
    const isAuthenticated = await page.evaluate(() => {
      return !!localStorage.getItem('token');
    });
    
    if (isAuthenticated) {
      console.log('✅ TEST 1 PASSED: User authenticated');
      testResults.passed++;
    } else {
      console.log('❌ TEST 1 FAILED: Authentication failed');
      testResults.failed++;
    }
    testResults.total++;
    testResults.tests.push({ test: 'Authentication', passed: isAuthenticated });

    // TEST 2: Import Topology
    console.log('\n📝 TEST 2: Import Topology File');
    console.log('-'.repeat(80));
    
    const topologyData = JSON.parse(fs.readFileSync(TEST_CONFIG.topologyFile, 'utf8'));
    console.log(`✓ Loaded topology: ${topologyData.nodes.length} nodes, ${topologyData.links.length} links`);
    
    const importResult = await page.evaluate((jsonData) => {
      return new Promise((resolve) => {
        const blob = new Blob([JSON.stringify(jsonData)], { type: 'application/json' });
        const file = new File([blob], 'test-topology.json', { type: 'application/json' });
        const fileInput = document.querySelector('input[type="file"][accept=".json"]');
        
        if (!fileInput) {
          resolve({ success: false, error: 'File input not found' });
          return;
        }
        
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        
        const event = new Event('change', { bubbles: true });
        fileInput.dispatchEvent(event);
        
        setTimeout(() => {
          resolve({ success: true });
        }, 2000);
      });
    }, topologyData);

    await sleep(2000);
    
    const importLogs = await page.evaluate(() => {
      const logContainer = document.querySelector('[class*="overflow-y-auto"]');
      if (!logContainer) return [];
      return Array.from(logContainer.querySelectorAll('div'))
        .map(div => div.textContent)
        .filter(t => t && t.includes('Imported:'));
    });
    
    const importSuccess = importLogs.some(log => log.includes('10 nodes, 18 links'));
    
    if (importSuccess) {
      console.log('✅ TEST 2 PASSED: Topology imported successfully');
      console.log(`   Log: ${importLogs[0]}`);
      testResults.passed++;
    } else {
      console.log('❌ TEST 2 FAILED: Topology import failed');
      testResults.failed++;
    }
    testResults.total++;
    testResults.tests.push({ test: 'Topology Import', passed: importSuccess });

    // TEST 3: Verify Nodes Loaded
    console.log('\n📝 TEST 3: Verify Imported Nodes');
    console.log('-'.repeat(80));
    
    const sourceOptions = await page.$$eval(
      'select option',
      options => options.map(o => o.value).filter(v => v && v !== 'Select source...')
    );
    
    const expectedNodes = ['gbr-ldn-wst-pe09', 'deu-ber-bes-pe10', 'usa-nyc-dc1-rr08'];
    const nodesPresent = expectedNodes.every(node => sourceOptions.includes(node));
    
    if (nodesPresent) {
      console.log('✅ TEST 3 PASSED: Imported nodes present in dropdowns');
      console.log(`   Found nodes: ${expectedNodes.join(', ')}`);
      testResults.passed++;
    } else {
      console.log('❌ TEST 3 FAILED: Expected nodes not found');
      console.log(`   Available: ${sourceOptions.join(', ')}`);
      testResults.failed++;
    }
    testResults.total++;
    testResults.tests.push({ test: 'Nodes Loaded', passed: nodesPresent });

    // TEST 4-6: Pathfinding Tests
    for (let i = 0; i < TEST_CONFIG.testCases.length; i++) {
      const testCase = TEST_CONFIG.testCases[i];
      const testNum = i + 4;
      
      console.log(`\n📝 TEST ${testNum}: Pathfinding (${testCase.source} → ${testCase.dest})`);
      console.log('-'.repeat(80));
      
      // Select source
      await page.select('select', testCase.source);
      await sleep(500);
      
      // Select destination (need to find the second select)
      const selects = await page.$$('select');
      if (selects.length >= 2) {
        await page.evaluate((dest) => {
          const selects = document.querySelectorAll('select');
          if (selects.length >= 2) {
            selects[1].value = dest;
            selects[1].dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, testCase.dest);
      }
      await sleep(500);
      
      // Click Run Path
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const runButton = buttons.find(b => b.textContent.includes('Run Path'));
        if (runButton && !runButton.disabled) {
          runButton.click();
        }
      });
      
      await sleep(3000);
      
      // Check logs
      const pathLogs = await page.evaluate(() => {
        const logContainer = document.querySelector('[class*="overflow-y-auto"]');
        if (!logContainer) return [];
        return Array.from(logContainer.querySelectorAll('div'))
          .map(div => div.textContent)
          .filter(t => t && (t.includes('Finding path:') || t.includes('No path found')));
      });
      
      const latestLog = pathLogs[0] || '';
      const hasNodeNames = latestLog.includes(testCase.source) && latestLog.includes(testCase.dest);
      const noPathError = latestLog.includes('No path found');
      
      console.log(`   Latest log: ${latestLog}`);
      console.log(`   Has correct node names: ${hasNodeNames ? '✓' : '✗'}`);
      console.log(`   Path found: ${!noPathError ? '✓' : '✗'}`);
      
      const testPassed = hasNodeNames && !noPathError;
      
      if (testPassed) {
        console.log(`✅ TEST ${testNum} PASSED: Path found with correct node names`);
        testResults.passed++;
      } else {
        console.log(`❌ TEST ${testNum} FAILED: ${noPathError ? 'No path found' : 'Incorrect node names'}`);
        testResults.failed++;
      }
      testResults.total++;
      testResults.tests.push({ 
        test: `Pathfinding ${testCase.source} → ${testCase.dest}`,
        passed: testPassed 
      });
      
      await sleep(1000);
    }

    // Screenshot
    console.log('\n📸 Taking screenshot...');
    await page.screenshot({ path: 'test-result-screenshot.png', fullPage: true });
    console.log('✓ Screenshot saved: test-result-screenshot.png');

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.message);
    testResults.failed++;
    testResults.total++;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Print Results
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  console.log('\nDetailed Results:');
  testResults.tests.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.test}: ${t.passed ? '✅ PASS' : '❌ FAIL'}`);
  });
  console.log('='.repeat(80));
  
  if (testResults.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Bug fix validated successfully! 🎉\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Please review the results above.\n');
    process.exit(1);
  }
}

// Run the test
runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

