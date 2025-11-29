/**
 * Puppeteer E2E Test: JSON Import/Export Validation
 * 
 * Tests:
 * 1. Valid topology import (nodes array)
 * 2. Invalid JSON import (missing nodes/files)
 * 3. PyATS file import (files array)
 * 4. Export validation
 * 5. Template file download
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const APP_URL = 'http://localhost:9080';
const SCREENSHOT_DIR = './validation-screenshots';

// Ensure screenshot directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runValidationTests() {
    console.log('🚀 Starting JSON Validation E2E Tests...\n');

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Listen for console messages
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('✅') || text.includes('❌') || text.includes('Validation')) {
            console.log(`  [Browser Console] ${text}`);
        }
    });

    // Listen for dialogs (alerts)
    const alerts = [];
    page.on('dialog', async dialog => {
        const message = dialog.message();
        alerts.push(message);
        console.log(`  [Alert] ${message.substring(0, 100)}...`);
        await dialog.accept();
    });

    try {
        // ========================================
        // TEST 1: Load Application
        // ========================================
        console.log('📋 TEST 1: Loading application...');
        await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 10000 });
        await sleep(2000);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/01-app-loaded.png` });
        console.log('✅ Application loaded successfully\n');

        // ========================================
        // TEST 2: Valid Topology Import
        // ========================================
        console.log('📋 TEST 2: Importing valid topology file...');
        const validFilePath = path.resolve('./zzzi--input-files/ospf-visualizer-2025-11-29.json');

        // Find and click import button
        const importButton = await page.$('input[type="file"][accept=".json"]');
        if (importButton) {
            await importButton.uploadFile(validFilePath);
            await sleep(2000);
            await page.screenshot({ path: `${SCREENSHOT_DIR}/02-valid-import.png` });

            // Check if validation passed (no error alert)
            const lastAlert = alerts[alerts.length - 1];
            if (lastAlert && lastAlert.includes('❌')) {
                console.log('❌ TEST 2 FAILED: Valid file was rejected');
            } else {
                console.log('✅ TEST 2 PASSED: Valid topology imported successfully\n');
            }
        } else {
            console.log('⚠️  Could not find import button\n');
        }

        // ========================================
        // TEST 3: Invalid JSON Import
        // ========================================
        console.log('📋 TEST 3: Importing invalid JSON (missing nodes/files)...');

        // Create temporary invalid file
        const invalidFilePath = path.resolve('./temp-invalid.json');
        fs.writeFileSync(invalidFilePath, JSON.stringify({
            invalid: "structure",
            no_nodes: true,
            no_files: true
        }, null, 2));

        const importButton2 = await page.$('input[type="file"][accept=".json"]');
        if (importButton2) {
            const alertCountBefore = alerts.length;
            await importButton2.uploadFile(invalidFilePath);
            await sleep(2000);
            await page.screenshot({ path: `${SCREENSHOT_DIR}/03-invalid-import.png` });

            // Should trigger error alert
            const newAlerts = alerts.slice(alertCountBefore);
            const hasErrorAlert = newAlerts.some(a => a.includes('❌') || a.includes('nodes') || a.includes('files'));

            if (hasErrorAlert) {
                console.log('✅ TEST 3 PASSED: Invalid file correctly rejected\n');
            } else {
                console.log('❌ TEST 3 FAILED: Invalid file was not rejected\n');
            }
        }

        // Clean up temp file
        if (fs.existsSync(invalidFilePath)) {
            fs.unlinkSync(invalidFilePath);
        }

        // ========================================
        // TEST 4: PyATS File Import
        // ========================================
        console.log('📋 TEST 4: Importing PyATS automation file...');
        const pyatsFilePath = path.resolve('./zzzi--input-files/automation_export_2025-11-27T21_14_36.690Z.json');

        if (fs.existsSync(pyatsFilePath)) {
            const importButton3 = await page.$('input[type="file"][accept=".json"]');
            if (importButton3) {
                const alertCountBefore = alerts.length;
                await importButton3.uploadFile(pyatsFilePath);
                await sleep(2000);
                await page.screenshot({ path: `${SCREENSHOT_DIR}/04-pyats-import.png` });

                // Should trigger PyATS detection alert
                const newAlerts = alerts.slice(alertCountBefore);
                const hasPyATSAlert = newAlerts.some(a => a.includes('PyATS') || a.includes('files'));

                if (hasPyATSAlert) {
                    console.log('✅ TEST 4 PASSED: PyATS file correctly detected and handled\n');
                } else {
                    console.log('⚠️  TEST 4: PyATS file handling unclear (check console)\n');
                }
            }
        } else {
            console.log('⚠️  PyATS file not found, skipping test\n');
        }

        // ========================================
        // TEST 5: Export Validation
        // ========================================
        console.log('📋 TEST 5: Testing export validation...');

        // Click export button
        const exportButton = await page.$('button[title="Export Topology"]');
        if (exportButton) {
            await exportButton.click();
            await sleep(2000);
            await page.screenshot({ path: `${SCREENSHOT_DIR}/05-export.png` });

            // Check console for validation success
            console.log('✅ TEST 5: Export triggered (check downloads folder for file)\n');
        } else {
            console.log('⚠️  Could not find export button\n');
        }

        // ========================================
        // TEST 6: Template Download
        // ========================================
        console.log('📋 TEST 6: Testing template download...');

        // Look for Template button
        const templateButton = await page.$('button[title="Download Template"]');
        if (templateButton) {
            await templateButton.click();
            await sleep(1000);
            await page.screenshot({ path: `${SCREENSHOT_DIR}/06-template-download.png` });
            console.log('✅ TEST 6: Template download triggered\n');
        } else {
            console.log('⚠️  Could not find template button\n');
        }

        // ========================================
        // Summary
        // ========================================
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Alerts Captured: ${alerts.length}`);
        console.log(`Screenshots Saved: ${SCREENSHOT_DIR}/`);
        console.log('\nAlert Messages:');
        alerts.forEach((alert, idx) => {
            console.log(`  ${idx + 1}. ${alert.substring(0, 80)}...`);
        });
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('❌ Test failed with error:', error);
        await page.screenshot({ path: `${SCREENSHOT_DIR}/error.png` });
    } finally {
        await browser.close();
        console.log('✅ Tests completed. Browser closed.');
    }
}

// Run tests
runValidationTests().catch(console.error);
