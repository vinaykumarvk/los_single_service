import { test, expect } from '@playwright/test';

/**
 * Example E2E Test
 * 
 * This serves as a template for E2E tests.
 * Replace with actual application workflow tests.
 */

test.describe('Application Health Check', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Basic check that page loaded
    expect(page.url()).toContain('localhost');
  });

  test('should have page title', async ({ page }) => {
    await page.goto('/');
    
    // Check if title exists (adjust based on your app)
    const title = await page.title();
    expect(title).toBeTruthy();
  });
});

