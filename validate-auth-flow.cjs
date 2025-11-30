/**
 * COMPREHENSIVE AUTHENTICATION VALIDATION TEST
 * Tests the complete authentication flow from login to app access
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
    console.log('║     COMPREHENSIVE AUTHENTICATION FLOW VALIDATION TEST          ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');

    let browser;
    let passed = 0;
    let failed = 0;
    const issues = [];

    try {
        // Test 1: Backend Health Check
        console.log('🔍 Test 1: Backend Health Check...');
        try {
            const healthResponse = await fetch(`${CONFIG.BACKEND_URL}/api/health`);
            if (healthResponse.ok) {
                console.log('   ✅ Backend is healthy');
                passed++;
            } else {
                console.log('   ❌ Backend health check failed');
                issues.push('Backend not responding correctly');
                failed++;
            }
        } catch (error) {
            console.log('   ❌ Backend not accessible:', error.message);
            issues.push('Backend server not running on port 9081');
            failed++;
            return { passed, failed, issues };
        }

        // Test 2: Direct API Login Test
        console.log('');
        console.log('🔍 Test 2: Direct API Login Test...');
        let apiToken = null;
        try {
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
                apiToken = loginData.token;
                passed++;
            } else {
                console.log('   ❌ API login failed:', loginData.message || 'Unknown error');
                issues.push(`API login failed: ${loginData.message}`);
                failed++;
            }
        } catch (error) {
            console.log('   ❌ API login error:', error.message);
            issues.push(`API login error: ${error.message}`);
            failed++;
        }

        // Test 3: Launch Browser and Check Initial State
        console.log('');
        console.log('🔍 Test 3: Browser Launch and Initial Page Load...');

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        // Capture all console logs
        const consoleLogs = [];
        page.on('console', msg => {
            const text = msg.text();
            consoleLogs.push({ type: msg.type(), text });
            if (msg.type() === 'error') {
                console.log(`   [Browser Error] ${text}`);
            }
        });

        // Clear localStorage before starting
        await page.evaluateOnNewDocument(() => {
            localStorage.clear();
        });

        try {
            await page.goto(CONFIG.FRONTEND_URL, { waitUntil: 'networkidle2', timeout: CONFIG.TIMEOUT });
            console.log('   ✅ Frontend loaded');
            passed++;
        } catch (error) {
            console.log('   ❌ Frontend not accessible:', error.message);
            issues.push('Frontend not running on port 9080');
            failed++;
            return { passed, failed, issues };
        }

        // Wait for React to render
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Test 4: Verify Login Page is Shown (NOT the main app)
        console.log('');
        console.log('🔍 Test 4: Verify Login Page is Displayed...');

        const pageContent = await page.evaluate(() => {
            return {
                bodyText: document.body.innerText,
                title: document.title,
                hasLoginForm: !!document.querySelector('form'),
                hasUsernameInput: !!document.querySelector('input[type="text"]'),
                hasPasswordInput: !!document.querySelector('input[type="password"]'),
                hasSubmitButton: !!document.querySelector('button[type="submit"]'),
                // Check for actual main app UI elements (not just text)
                hasPathSimulationSection: !!document.querySelector('[class*="PATH"]') || document.body.innerText.includes('PATH SIMULATION'),
                hasNetworkCanvas: !!document.querySelector('canvas'),
                hasTopologyControls: !!document.querySelector('button[title="Reset View"]') || !!document.querySelector('button[title="Zoom In"]'),
                hasUserInfoHeader: !!document.querySelector('[title="Logout"]'),
                url: window.location.href
            };
        });

        console.log('   📄 Page State:');
        console.log(`   - URL: ${pageContent.url}`);
        console.log(`   - Has Login Form: ${pageContent.hasLoginForm}`);
        console.log(`   - Has Username Input: ${pageContent.hasUsernameInput}`);
        console.log(`   - Has Password Input: ${pageContent.hasPasswordInput}`);
        console.log(`   - Has Submit Button: ${pageContent.hasSubmitButton}`);
        console.log(`   - Has Network Canvas: ${pageContent.hasNetworkCanvas}`);
        console.log(`   - Has Topology Controls: ${pageContent.hasTopologyControls}`);
        console.log(`   - Has User Info Header: ${pageContent.hasUserInfoHeader}`);

        const appElementsPresent = pageContent.hasNetworkCanvas || pageContent.hasTopologyControls || pageContent.hasUserInfoHeader;

        if (pageContent.hasLoginForm && !appElementsPresent) {
            console.log('   ✅ Login page correctly displayed (app not accessible without auth)');
            passed++;
        } else if (appElementsPresent) {
            console.log('   ❌ CRITICAL: Main app is accessible WITHOUT authentication!');
            issues.push('Authentication bypass detected - app loads without login');
            failed++;
            await page.screenshot({ path: 'auth-bypass-detected.png' });
            console.log('   📸 Screenshot saved: auth-bypass-detected.png');
        } else {
            console.log('   ⚠️ Unexpected page state');
            issues.push('Unexpected page state - neither login nor main app detected');
            failed++;
        }

        // Test 5: Perform Login via UI
        console.log('');
        console.log('🔍 Test 5: Perform UI Login...');

        if (pageContent.hasLoginForm) {
            try {
                const usernameInput = await page.$('input[type="text"], input#identifier');
                const passwordInput = await page.$('input[type="password"]');
                const submitButton = await page.$('button[type="submit"]');

                if (usernameInput && passwordInput && submitButton) {
                    // Clear and type credentials
                    await usernameInput.click({ clickCount: 3 });
                    await usernameInput.type(CONFIG.ADMIN_USERNAME);

                    await passwordInput.click({ clickCount: 3 });
                    await passwordInput.type(CONFIG.ADMIN_PASSWORD);

                    await page.screenshot({ path: 'before-login.png' });
                    console.log('   📸 Screenshot: before-login.png');

                    // Click login
                    await Promise.all([
                        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => { }),
                        submitButton.click()
                    ]);

                    // Wait for state update
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    await page.screenshot({ path: 'after-login.png' });
                    console.log('   📸 Screenshot: after-login.png');

                    // Check if login was successful
                    const postLoginState = await page.evaluate(() => {
                        return {
                            bodyText: document.body.innerText,
                            hasVisualizerButton: document.body.innerText.includes('Visualizer'),
                            hasUserInfo: document.body.innerText.includes('netviz_admin'),
                            hasLogoutButton: !!document.querySelector('button[title="Logout"]'),
                            url: window.location.href
                        };
                    });

                    console.log('   📄 Post-Login State:');
                    console.log(`   - URL: ${postLoginState.url}`);
                    console.log(`   - Shows Main App: ${postLoginState.hasVisualizerButton}`);
                    console.log(`   - Shows User Info: ${postLoginState.hasUserInfo}`);
                    console.log(`   - Has Logout Button: ${postLoginState.hasLogoutButton}`);

                    if (postLoginState.hasVisualizerButton || postLoginState.hasUserInfo) {
                        console.log('   ✅ UI Login successful - App loaded');
                        passed++;
                    } else {
                        console.log('   ❌ UI Login failed - App not loaded');
                        issues.push('UI login did not redirect to main app');
                        failed++;
                    }
                } else {
                    console.log('   ❌ Login form elements not found');
                    issues.push('Login form elements missing');
                    failed++;
                }
            } catch (error) {
                console.log('   ❌ Login process error:', error.message);
                issues.push(`Login process error: ${error.message}`);
                failed++;
            }
        } else {
            console.log('   ⚠️ Skipping login test - no login form found');
        }

        // Test 6: Verify Token Storage
        console.log('');
        console.log('🔍 Test 6: Verify Authentication Token Storage...');

        const storageData = await page.evaluate(() => {
            const items = {};
            for (let i = 0; i < window.localStorage.length; i++) {
                const key = window.localStorage.key(i);
                items[key] = window.localStorage.getItem(key);
            }
            return {
                localStorage: items,
                authToken: window.localStorage.getItem('authToken')
            };
        });

        console.log('   📦 LocalStorage Keys:', Object.keys(storageData.localStorage).join(', ') || '(empty)');

        if (storageData.authToken) {
            console.log('   ✅ Auth token stored in localStorage');
            console.log(`   - Token: ${storageData.authToken.substring(0, 30)}...`);
            passed++;
        } else {
            console.log('   ❌ Auth token NOT found in localStorage');
            issues.push('Authentication token not persisted to localStorage');
            failed++;
        }

        // Test 7: Check Console Logs for Auth-Related Messages
        console.log('');
        console.log('🔍 Test 7: Analyze Console Logs...');

        const authLogs = consoleLogs.filter(log =>
            log.text.includes('AuthContext') ||
            log.text.includes('Login') ||
            log.text.includes('token')
        );

        if (authLogs.length > 0) {
            console.log('   📋 Authentication-related console logs:');
            authLogs.forEach(log => {
                console.log(`   - [${log.type}] ${log.text}`);
            });
        } else {
            console.log('   ⚠️ No authentication-related console logs found');
        }

    } catch (error) {
        console.error('');
        console.error('❌ Test execution error:', error.message);
        console.error(error.stack);
        issues.push(`Test execution error: ${error.message}`);
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

    if (issues.length > 0) {
        console.log('🐛 CRITICAL ISSUES FOUND:');
        issues.forEach((issue, index) => {
            console.log(`   ${index + 1}. ${issue}`);
        });
        console.log('');
    }

    if (failed === 0) {
        console.log('🎉 ALL TESTS PASSED! Authentication system is working correctly.');
    } else {
        console.log('⚠️ TESTS FAILED. Authentication system has critical issues.');
    }

    return { passed, failed, issues };
}

// Run tests
runTests().then(({ passed, failed, issues }) => {
    process.exit(failed > 0 ? 1 : 0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
