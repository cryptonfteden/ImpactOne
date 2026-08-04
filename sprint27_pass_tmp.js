const { chromium } = require('playwright');

const NAV_ITEMS = ["Home", "Dashboard", "Global Intelligence", "AI Analysis", "Watchlist", "Portfolio", "Recommendations", "Daily Feed", "Themes", "Alerts", "My Profile", "Settings"];

const consoleMsgs = []; // {screen, type, text}
const pageErrors = [];

function log(screen, msg) {
  console.log(`[${screen}] ${msg}`);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      consoleMsgs.push({ screen: currentScreen, type: msg.type(), text: msg.text() });
    }
  });
  page.on('pageerror', (err) => {
    pageErrors.push({ screen: currentScreen, text: err.message });
  });

  let currentScreen = 'boot';
  await page.goto('http://localhost:5174', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  // Handle onboarding if present
  const bodyText = await page.textContent('body').catch(() => '');
  if (bodyText && bodyText.length < 200) {
    log('boot', 'Possible onboarding screen, body text: ' + bodyText.slice(0,200));
  }
  await page.screenshot({ path: 'C:/Users/ASUS/AppData/Local/Temp/claude/c--Users-ASUS-OneDrive-Documents-GitHub-ImpactOne/e25469a8-a3ad-4de4-8aa6-22fd4db33508/scratchpad/00_boot.png' });

  // Try to get through onboarding by clicking common buttons repeatedly
  for (let i = 0; i < 15; i++) {
    const sidebarExists = await page.locator('.sidebar').count();
    if (sidebarExists > 0) break;
    // look for buttons like "Get started", "Skip", "Continue", "Next"
    const btnTexts = ['Get started', 'Skip', 'Continue', 'Next', 'Finish', 'Done', "Let's go", 'Start'];
    let clicked = false;
    for (const t of btnTexts) {
      const btn = page.locator(`button:has-text("${t}")`).first();
      if (await btn.count() > 0) {
        try {
          await btn.click({ timeout: 2000 });
          clicked = true;
          log('onboarding', `Clicked button "${t}"`);
          await page.waitForTimeout(800);
          break;
        } catch (e) {}
      }
    }
    if (!clicked) {
      // try clicking any visible button as fallback (age input etc.)
      const anyBtn = page.locator('button').first();
      const cnt = await page.locator('button').count();
      log('onboarding', `No known button found, ${cnt} buttons on page. Trying first.`);
      if (cnt > 0) {
        try { await anyBtn.click({ timeout: 2000 }); await page.waitForTimeout(800); } catch(e) { break; }
      } else break;
    }
  }

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'C:/Users/ASUS/AppData/Local/Temp/claude/c--Users-ASUS-OneDrive-Documents-GitHub-ImpactOne/e25469a8-a3ad-4de4-8aa6-22fd4db33508/scratchpad/01_post_onboarding.png' });

  const sidebarExists = await page.locator('.sidebar').count();
  log('boot', `Sidebar present: ${sidebarExists > 0}`);

  const findings = {};

  for (const item of NAV_ITEMS) {
    currentScreen = item;
    findings[item] = { navigated: false, notes: [] };
    try {
      const link = page.locator(`.sidebar-link:has-text("${item}")`).first();
      if (await link.count() === 0) {
        findings[item].notes.push('Nav link not found');
        continue;
      }
      await link.click({ timeout: 5000 });
      findings[item].navigated = true;
      // capture DOM immediately (before data loads) for loading state check
      await page.waitForTimeout(50);
      const earlyHtml = await page.locator('.content, main, .screen').first().innerHTML().catch(() => '');
      const hasSpinnerEarly = /spinner|loading|skeleton|Loading\.\.\./i.test(earlyHtml || '');
      findings[item].hasLoadingIndicatorEarly = hasSpinnerEarly;

      await page.waitForTimeout(1500);
      const text = await page.locator('body').innerText().catch(() => '');
      findings[item].bodySnippet = text.slice(0, 400);

      // placeholder text checks
      const placeholderRe = /lorem ipsum|TODO|coming soon|placeholder text|\bTBD\b/i;
      if (placeholderRe.test(text)) {
        findings[item].notes.push('Possible placeholder text found: ' + (text.match(placeholderRe) || [''])[0]);
      }

      await page.screenshot({ path: `C:/Users/ASUS/AppData/Local/Temp/claude/c--Users-ASUS-OneDrive-Documents-GitHub-ImpactOne/e25469a8-a3ad-4de4-8aa6-22fd4db33508/scratchpad/screen_${item.replace(/\s+/g,'_')}.png`, fullPage: true }).catch(()=>{});
    } catch (e) {
      findings[item].notes.push('Navigation error: ' + e.message);
    }
  }

  // --- Portfolio: Reset virtual portfolio flow ---
  currentScreen = 'Portfolio-Reset';
  try {
    await page.locator('.sidebar-link:has-text("Portfolio")').first().click();
    await page.waitForTimeout(1000);
    const resetBtn = page.locator('button:has-text("Reset")').first();
    const resetCount = await page.locator('button:has-text("Reset")').count();
    log('Portfolio-Reset', `Found ${resetCount} button(s) matching "Reset"`);
    if (resetCount > 0) {
      await resetBtn.click({ timeout: 5000 });
      await page.waitForTimeout(500);
      // look for a confirm dialog/modal
      const modalCount = await page.locator('[role="dialog"], .modal, .confirm-dialog').count();
      const bodyTextAfter = await page.locator('body').innerText();
      log('Portfolio-Reset', `Modal-like elements after click: ${modalCount}`);
      findings['Portfolio-Reset'] = { modalCount, snippetAfterClick: bodyTextAfter.slice(0, 600) };
      await page.screenshot({ path: 'C:/Users/ASUS/AppData/Local/Temp/claude/c--Users-ASUS-OneDrive-Documents-GitHub-ImpactOne/e25469a8-a3ad-4de4-8aa6-22fd4db33508/scratchpad/portfolio_reset_step1.png' });

      // try to find explicit confirm button
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Confirm Reset")').first();
      if (await confirmBtn.count() > 0) {
        await confirmBtn.click({ timeout: 5000 });
        await page.waitForTimeout(1000);
        const afterConfirmText = await page.locator('body').innerText();
        findings['Portfolio-Reset'].afterConfirmSnippet = afterConfirmText.slice(0, 600);
        await page.screenshot({ path: 'C:/Users/ASUS/AppData/Local/Temp/claude/c--Users-ASUS-OneDrive-Documents-GitHub-ImpactOne/e25469a8-a3ad-4de4-8aa6-22fd4db33508/scratchpad/portfolio_reset_step2.png' });
      } else {
        findings['Portfolio-Reset'].note = 'No explicit confirm button found after first Reset click';
      }
    } else {
      findings['Portfolio-Reset'] = { note: 'No Reset button found on Portfolio screen (maybe legacy mode toggle needed)' };
    }
  } catch (e) {
    findings['Portfolio-Reset'] = { error: e.message };
  }

  // --- Watchlist add/remove ---
  currentScreen = 'Watchlist-Flow';
  try {
    await page.locator('.sidebar-link:has-text("Watchlist")').first().click();
    await page.waitForTimeout(1000);
    const bodyText = await page.locator('body').innerText();
    findings['Watchlist-Flow'] = { initialSnippet: bodyText.slice(0, 500) };

    // Try to find an add input
    const addInput = page.locator('input[type="text"], input[placeholder*="ticker" i], input[placeholder*="symbol" i]').first();
    if (await addInput.count() > 0) {
      await addInput.fill('AAPL');
      const addBtn = page.locator('button:has-text("Add")').first();
      if (await addBtn.count() > 0) {
        await addBtn.click({ timeout: 5000 }).catch(e => findings['Watchlist-Flow'].addClickError = e.message);
        await page.waitForTimeout(1200);
        const afterAdd = await page.locator('body').innerText();
        findings['Watchlist-Flow'].afterAddSnippet = afterAdd.slice(0, 500);
        await page.screenshot({ path: 'C:/Users/ASUS/AppData/Local/Temp/claude/c--Users-ASUS-OneDrive-Documents-GitHub-ImpactOne/e25469a8-a3ad-4de4-8aa6-22fd4db33508/scratchpad/watchlist_after_add.png' });

        // Try remove
        const removeBtn = page.locator('button:has-text("Remove")').first();
        if (await removeBtn.count() > 0) {
          await removeBtn.click({ timeout: 5000 }).catch(e => findings['Watchlist-Flow'].removeClickError = e.message);
          await page.waitForTimeout(500);
          const modalCount = await page.locator('[role="dialog"], .modal, .confirm-dialog').count();
          findings['Watchlist-Flow'].removeModalCount = modalCount;
          await page.waitForTimeout(1000);
          const afterRemove = await page.locator('body').innerText();
          findings['Watchlist-Flow'].afterRemoveSnippet = afterRemove.slice(0, 500);
        } else {
          findings['Watchlist-Flow'].note = 'No Remove button found';
        }
      } else {
        findings['Watchlist-Flow'].note = 'No Add button found';
      }
    } else {
      findings['Watchlist-Flow'].note = 'No add-ticker input found';
    }
  } catch (e) {
    findings['Watchlist-Flow'] = { error: e.message };
  }

  // --- Alerts screen detail ---
  currentScreen = 'Alerts-Detail';
  try {
    await page.locator('.sidebar-link:has-text("Alerts")').first().click();
    await page.waitForTimeout(1500);
    const bodyText = await page.locator('body').innerText();
    findings['Alerts-Detail'] = { snippet: bodyText.slice(0, 800) };
  } catch (e) {
    findings['Alerts-Detail'] = { error: e.message };
  }

  // --- Settings / My Profile placeholder scan (already captured generally above, but re-check deeper) ---

  await browser.close();

  console.log('\n\n=== FINDINGS ===');
  console.log(JSON.stringify(findings, null, 2));
  console.log('\n\n=== CONSOLE MESSAGES ===');
  console.log(JSON.stringify(consoleMsgs, null, 2));
  console.log('\n\n=== PAGE ERRORS ===');
  console.log(JSON.stringify(pageErrors, null, 2));
})();
