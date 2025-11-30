/**
 * End-to-End Authentication Test with Puppeteer
 * Validates the complete login flow with admin credentials
 */

const puppeteer = require('puppeteer');

const CONFIG = {
  FRONTEND_URL: 'http://localhost:9080',
  BACKEND_URL: 'http://localhost:9081',
  ADMIN_USERNAME: 'netviz_admin',
  ADMIN_PASSWORD: 'V3ry$trongAdm1n!2025',
  TIMEOUT: 30000
};

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         OSPF Network Visualizer - E2E Auth Test                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  let browser;
  let passed = 0;
  let failed = 0;

  try {
    // Test 1: Backend Health Check
    console.log('🔍 Test 1: Backend Health Check...');
    const healthResponse = await fetch(`${CONFIG.BACKEND_URL}/api/health`);
    if (healthResponse.ok) {
      console.log('   ✅ Backend is healthy');
      passed++;
    } else {
      console.log('   ❌ Backend health check failed');
      failed++;
      return { passed, failed, error: 'Backend not running' };
    }

    // Test 2: API Login Test
    console.log('');
    console.log('🔍 Test 2: API Login with Admin Credentials...');
    const loginResponse = await fetch(`${CONFIG.BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: CONFIG.ADMIN_USERNAME,
        password: CONFIG.ADMIN_PASSWORD
      })
    });
    const loginData = await loginResponse.json();

    if (loginResponse.ok && loginData.token) {
      console.log('   ✅ API login successful');
      console.log(`   - User: ${loginData.user.username}`);
      console.log(`   - Role: ${loginData.user.role}`);
      console.log(`   - Token: ${loginData.token.substring(0, 30)}...`);
      passed++;
    } else {
      console.log('   ❌ API login failed:', loginData.message || 'Unknown error');
      failed++;
    }

    // Test 3: Browser Login Test
    console.log('');
    console.log('🔍 Test 3: Browser UI Login Test...');

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Capture browser console logs
    page.on('console', msg => {
      console.log(`   [Browser Log] ${msg.type()}: ${msg.text()}`);
    });

    // Navigate to frontend
    try {
      await page.goto(CONFIG.FRONTEND_URL, { waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT });
      console.log('   ✅ Frontend loaded');
      await page.evaluate(() => console.log('   [TEST DEBUG] Console logging check'));
      passed++;
    } catch (error) {
      console.log('   ❌ Frontend not accessible:', error.message);
      console.log('   ℹ️  Make sure to run: npm run dev');
      failed++;
      return { passed, failed };
    }

    // Wait for React to render
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Take screenshot to see current state
    await page.screenshot({ path: 'test-screenshot-loaded.png' });
    console.log('   📸 Screenshot: test-screenshot-loaded.png');

    // Check page content for debugging
    const bodyText = await page.evaluate(() => document.body.innerText);
    const hasBackendError = bodyText.includes('Backend Server Unavailable');

    if (hasBackendError) {
      console.log('   ⚠️ Frontend shows "Backend Server Unavailable"');
      console.log('   ℹ️ This is a CORS or network issue - frontend cannot reach backend');
      // Click retry if available
      const retryButton = await page.$('button:has-text("Retry")');
      if (retryButton) {
        await retryButton.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Test 4: Check Login Form Exists
    console.log('');
    console.log('🔍 Test 4: Login Form Presence...');

    const loginForm = await page.$('form');
    const usernameInput = await page.$('input[type="text"], input#identifier');
    const passwordInput = await page.$('input[type="password"]');
    const submitButton = await page.$('button[type="submit"]');

    if (loginForm && usernameInput && passwordInput && submitButton) {
      console.log('   ✅ Login form elements found');
      passed++;
    } else {
      console.log('   ❌ Login form elements missing');
      console.log(`   - Form: ${!!loginForm}`);
      console.log(`   - Username input: ${!!usernameInput}`);
      console.log(`   - Password input: ${!!passwordInput}`);
      console.log(`   - Submit button: ${!!submitButton}`);
      console.log(`   - Page shows: ${bodyText.substring(0, 200)}...`);
      failed++;
    }

    // Test 5: Perform Login via UI
    console.log('');
    console.log('🔍 Test 5: Perform UI Login...');

    if (usernameInput && passwordInput && submitButton) {
      // Clear and type credentials
      await usernameInput.click({ clickCount: 3 });
      await usernameInput.type(CONFIG.ADMIN_USERNAME);

      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type(CONFIG.ADMIN_PASSWORD);

      // Take screenshot before login
      await page.screenshot({ path: 'test-screenshot-before-login.png' });
      console.log('   📸 Screenshot saved: test-screenshot-before-login.png');

      // Click login and wait for navigation or response
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => { }),
        submitButton.click()
      ]);

      // Wait a bit for any state updates
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Take screenshot after login attempt
      await page.screenshot({ path: 'test-screenshot-after-login.png' });
      console.log('   📸 Screenshot saved: test-screenshot-after-login.png');

      // Check if login was successful by looking for user info or network graph
      const userInfo = await page.$('text/netviz_admin');
      const networkCanvas = await page.$('canvas, .vis-network');
      const logoutButton = await page.$('button[title="Logout"]');

      if (userInfo || networkCanvas || logoutButton) {
        console.log('   ✅ UI Login successful - App loaded');
        passed++;
      } else {
        // Check for error message
        const errorMessage = await page.$eval('.text-red-200, .text-red-800, [class*="error"]', el => el.textContent).catch(() => null);
        if (errorMessage) {
          console.log('   ❌ UI Login failed:', errorMessage);
        } else {
          console.log('   ⚠️ UI Login status unclear - check screenshots');
        }
        failed++;
      }
    }

    // Test 6: Protected Routes Check
    console.log('');
    console.log('🔍 Test 6: Authentication Token Stored...');

    // Test 6: Protected Routes Check
    console.log('');
    console.log('🔍 Test 6: Authentication Token Stored...');
    console.log('   📍 Current URL:', page.url());

    // Verify localStorage works
    const storageCheck = await page.evaluate(() => {
      try {
        window.localStorage.setItem('test_key', 'test_value');
        const val = window.localStorage.getItem('test_key');
        window.localStorage.removeItem('test_key');
        return { working: val === 'test_value', error: null };
      } catch (e) {
        return { working: false, error: e.toString() };
      }
    });
    console.log('   🛠️ LocalStorage Capability:', storageCheck);

    const storageData = await page.evaluate(() => {
      const items = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        items[key] = window.localStorage.getItem(key);
      }
      return {
        localStorage: items,
        sessionStorageLength: window.sessionStorage.length,
        cookies: document.cookie
      };
    });

    console.log('   📦 LocalStorage Content:', JSON.stringify(storageData.localStorage, null, 2));

    if (storageData.localStorage.authToken) {
      console.log('   ✅ Auth token stored in localStorage');
      console.log(`   - Token: ${storageData.localStorage.authToken.substring(0, 30)}...`);
      passed++;
    } else {
      console.log('   ⚠️ Auth token not found in localStorage');
      console.log('   - Available keys:', Object.keys(storageData.localStorage).join(', '));
      failed++;
    }

  } catch (error) {
    console.error('');
    console.error('❌ Test execution error:', error.message);
    failed++;
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Summary
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                       TEST SUMMARY                              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📊 Total:  ${passed + failed}`);
  console.log('');

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! Authentication system is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Please review the output above.');
  }

  return { passed, failed };
}

// Run tests
runTests().then(({ passed, failed }) => {
  process.exit(failed > 0 ? 1 : 0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
