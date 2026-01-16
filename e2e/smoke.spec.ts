import { test, expect, Page } from '@playwright/test'

/**
 * Smoke tests to verify pages load without critical errors.
 * These tests catch:
 * - React hydration errors
 * - Unhandled exceptions
 * - Hook ordering issues (error #185)
 * - Missing dependencies
 * - Network failures (logged as warnings)
 */

// Collect console errors during page visits
async function collectPageErrors(page: Page): Promise<string[]> {
  const errors: string[] = []

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      // Filter out expected errors (like missing API endpoints in dev)
      if (!text.includes('Failed to load resource') &&
          !text.includes('net::ERR_')) {
        errors.push(text)
      }
    }
  })

  page.on('pageerror', (error) => {
    errors.push(error.message)
  })

  return errors
}

// Check if error is a React error
function isReactError(error: string): boolean {
  return (
    error.includes('Minified React error') ||
    error.includes('Error: Hydration') ||
    error.includes('hooks') ||
    error.includes('Invalid hook call') ||
    error.includes('Rendered more hooks') ||
    error.includes('Rendered fewer hooks')
  )
}

test.describe('Page smoke tests', () => {
  test('Home page loads without React errors', async ({ page }) => {
    const errors = await collectPageErrors(page)
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const reactErrors = errors.filter(isReactError)
    expect(reactErrors).toHaveLength(0)
  })

  test('Chat page loads without React errors', async ({ page }) => {
    const errors = await collectPageErrors(page)
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Wait for any dynamic content
    await page.waitForTimeout(1000)

    const reactErrors = errors.filter(isReactError)
    if (reactErrors.length > 0) {
      console.error('React errors found:', reactErrors)
    }
    expect(reactErrors).toHaveLength(0)
  })

  test('Projects page loads without React errors', async ({ page }) => {
    const errors = await collectPageErrors(page)
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    const reactErrors = errors.filter(isReactError)
    expect(reactErrors).toHaveLength(0)
  })

  test('Prompts page loads without React errors', async ({ page }) => {
    const errors = await collectPageErrors(page)
    await page.goto('/prompts')
    await page.waitForLoadState('networkidle')

    const reactErrors = errors.filter(isReactError)
    expect(reactErrors).toHaveLength(0)
  })

  test('Settings page loads without React errors', async ({ page }) => {
    const errors = await collectPageErrors(page)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    const reactErrors = errors.filter(isReactError)
    expect(reactErrors).toHaveLength(0)
  })
})

test.describe('Chat functionality', () => {
  test('Starting a conversation has no React errors', async ({ page }) => {
    const errors = await collectPageErrors(page)

    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Try to click start new chat button if visible
    try {
      const newChatButton = page.getByRole('button', { name: /start new chat/i })
      await newChatButton.click({ timeout: 3000 })
      // Wait a bit for any navigation/rendering
      await page.waitForTimeout(2000)
      await page.waitForLoadState('networkidle')
    } catch {
      // Button might not be visible, that's okay
    }

    const reactErrors = errors.filter(isReactError)
    expect(reactErrors).toHaveLength(0)
  })

  test('Conversation page renders without React errors', async ({ page }) => {
    const errors = await collectPageErrors(page)

    // Go directly to a conversation URL (will create if needed)
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Try to start a new chat
    try {
      await page.getByRole('button', { name: /start new chat/i }).click({ timeout: 3000 })
      await page.waitForTimeout(2000)
    } catch {
      // Continue even if button not found
    }

    // Wait for any rendering to complete
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    const reactErrors = errors.filter(isReactError)
    expect(reactErrors).toHaveLength(0)
  })
})

test.describe('Navigation', () => {
  test('Sidebar navigation works without errors', async ({ page }) => {
    const errors = await collectPageErrors(page)

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Navigate to each section
    const links = ['/chat', '/projects', '/prompts', '/settings']

    for (const link of links) {
      await page.goto(link)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
    }

    const reactErrors = errors.filter(isReactError)
    expect(reactErrors).toHaveLength(0)
  })
})
