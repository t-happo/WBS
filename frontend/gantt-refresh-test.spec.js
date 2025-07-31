const { test, expect } = require('@playwright/test');

test('ガントチャート リフレッシュテスト', async ({ page }) => {
  // コンソールログを監視
  const logs = [];
  page.on('console', msg => {
    if (msg.type() !== 'verbose') {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  console.log('=== 1. 初回ログインとガントチャート表示 ===');
  await page.goto('http://localhost:3000/login');
  
  await page.fill('#login_username', 'admin');
  await page.fill('#login_password', 'admin123');
  await page.click('button[type="submit"]');
  
  await page.waitForLoadState('networkidle');
  
  // プロジェクト詳細ページに移動
  const detailButton = page.locator('button:has-text("詳細")').first();
  await detailButton.click();
  await page.waitForLoadState('networkidle');
  
  // ガントチャートタブをクリック
  const ganttTab = page.locator('text=ガントチャート').first();
  await ganttTab.click();
  await page.waitForTimeout(3000);
  
  console.log('初回ガントチャート状態:');
  const initialState = await page.evaluate(() => {
    return {
      containerExists: !!document.querySelector('[data-testid="gantt-container"]'),
      containerVisible: document.querySelector('[data-testid="gantt-container"]')?.offsetWidth > 0,
      dhtmlxLoaded: typeof window.gantt !== 'undefined',
      dhtmlxReady: window.gantt && typeof window.gantt.init === 'function',
      scriptsLoaded: Array.from(document.querySelectorAll('script')).filter(s => s.src.includes('dhtmlx')).length,
      cssLoaded: Array.from(document.querySelectorAll('link')).filter(l => l.href.includes('dhtmlx')).length
    };
  });
  console.log(JSON.stringify(initialState, null, 2));
  await page.screenshot({ path: 'refresh-1-initial.png', fullPage: true });

  console.log('\n=== 2. ページリフレッシュ ===');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  console.log(`リフレッシュ後のURL: ${page.url()}`);
  await page.screenshot({ path: 'refresh-2-after-reload.png', fullPage: true });
  
  if (page.url().includes('/login')) {
    console.log('❌ リフレッシュ後にログアウトされました');
    
    // 再ログイン
    await page.fill('#login_username', 'admin');
    await page.fill('#login_password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    
    // プロジェクト詳細ページに戻る
    const detailButton2 = page.locator('button:has-text("詳細")').first();
    await detailButton2.click();
    await page.waitForLoadState('networkidle');
  }
  
  // ガントチャートタブを再度クリック
  const ganttTab2 = page.locator('text=ガントチャート').first();
  if (await ganttTab2.isVisible()) {
    await ganttTab2.click();
    await page.waitForTimeout(3000);
  }
  
  console.log('\nリフレッシュ後ガントチャート状態:');
  const refreshState = await page.evaluate(() => {
    return {
      containerExists: !!document.querySelector('[data-testid="gantt-container"]'),
      containerVisible: document.querySelector('[data-testid="gantt-container"]')?.offsetWidth > 0,
      dhtmlxLoaded: typeof window.gantt !== 'undefined',
      dhtmlxReady: window.gantt && typeof window.gantt.init === 'function',
      ganttInitialized: (() => {
        try {
          return window.gantt && window.gantt.getTaskCount ? window.gantt.getTaskCount() : 0;
        } catch (e) {
          return 'error: ' + e.message;
        }
      })(),
      ganttDOM: !!document.querySelector('.gantt_container'),
      scriptsLoaded: Array.from(document.querySelectorAll('script')).filter(s => s.src.includes('dhtmlx')).length,
      cssLoaded: Array.from(document.querySelectorAll('link')).filter(l => l.href.includes('dhtmlx')).length
    };
  });
  console.log(JSON.stringify(refreshState, null, 2));
  await page.screenshot({ path: 'refresh-3-after-refresh.png', fullPage: true });

  console.log('\n=== 3. 比較結果 ===');
  const comparison = {
    初回コンテナ存在: initialState.containerExists,
    リフレッシュ後コンテナ存在: refreshState.containerExists,
    初回DHtmlx読み込み: initialState.dhtmlxLoaded,
    リフレッシュ後DHtmlx読み込み: refreshState.dhtmlxLoaded,
    初回スクリプト数: initialState.scriptsLoaded,
    リフレッシュ後スクリプト数: refreshState.scriptsLoaded,
    初回CSS数: initialState.cssLoaded,
    リフレッシュ後CSS数: refreshState.cssLoaded
  };
  console.log('比較:', JSON.stringify(comparison, null, 2));

  if (refreshState.containerExists && refreshState.dhtmlxLoaded && refreshState.ganttDOM) {
    console.log('✅ リフレッシュ後もガントチャートが正常に表示されています！');
  } else if (refreshState.containerExists && !refreshState.dhtmlxLoaded) {
    console.log('⚠️  ガントチャートコンテナは存在するが、DHtmlxライブラリが読み込まれていません');
  } else {
    console.log('❌ リフレッシュ後にガントチャートの表示に問題があります');
  }

  console.log('\n=== 4. 重要なコンソールログ ===');
  const importantLogs = logs.filter(log => 
    log.includes('Gantt') || 
    log.includes('ガント') || 
    log.includes('DHTMLX') || 
    log.includes('initialized') ||
    log.includes('Loading') ||
    log.includes('loading') ||
    log.includes('error') ||
    log.includes('failed')
  );
  importantLogs.forEach(log => console.log(log));

  if (importantLogs.length === 0) {
    console.log('重要なログが見つかりませんでした。最新のログを確認:');
    logs.slice(-10).forEach(log => console.log(log));
  }
});