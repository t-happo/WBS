const { test, expect } = require('@playwright/test');

test('完全なガントチャートテスト', async ({ page }) => {
  // コンソールログを監視
  const logs = [];
  page.on('console', msg => {
    if (msg.type() !== 'verbose') { // verboseログを除外
      logs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  // ネットワークエラーを監視
  const networkErrors = [];
  page.on('response', response => {
    if (!response.ok() && response.status() !== 304) { // 304 Not Modifiedは正常
      networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('1. ログインページにアクセス...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'test-1-login.png', fullPage: true });

    console.log('2. ログイン実行...');
    // 正しい認証情報を使用
    const testCredentials = [
      { username: 'admin', password: 'admin123' }
    ];

    let loginSuccessful = false;
    for (const cred of testCredentials) {
      try {
        await page.fill('#login_username', cred.username);
        await page.fill('#login_password', cred.password);
        await page.click('button[type="submit"]');
        
        // ログイン結果を待つ
        await page.waitForTimeout(2000);
        
        const currentUrl = page.url();
        console.log(`認証情報 ${cred.username}/${cred.password} 試行結果: ${currentUrl}`);
        
        if (!currentUrl.includes('/login')) {
          console.log(`ログイン成功: ${cred.username}/${cred.password}`);
          loginSuccessful = true;
          break;
        }
      } catch (e) {
        console.log(`認証情報 ${cred.username}/${cred.password} でエラー:`, e.message);
      }
    }

    if (!loginSuccessful) {
      console.log('全ての認証情報でログインに失敗。ログインをスキップして直接テスト...');
      // バックエンドが動いていない可能性があるため、フロントエンドのみでテスト
      await page.goto('http://localhost:3000/projects/1', { waitUntil: 'networkidle' });
    }

    await page.screenshot({ path: 'test-2-after-login.png', fullPage: true });

    console.log('3. プロジェクト詳細ページの確認...');
    const currentUrl = page.url();
    console.log(`現在のURL: ${currentUrl}`);

    // ページの基本構造を確認
    const pageStructure = await page.evaluate(() => {
      return {
        title: document.title,
        hasReactRoot: !!document.querySelector('[data-reactroot], #root'),
        mainContent: document.body.textContent?.substring(0, 200),
        hasAntdElements: !!document.querySelector('.ant-btn, .ant-card, .ant-tabs'),
        errorElements: !!document.querySelector('.ant-result-error, .error, [class*="error"]')
      };
    });
    
    console.log('ページ構造:', JSON.stringify(pageStructure, null, 2));

    console.log('4. ガントチャート要素の検索...');
    // ガントチャート関連の要素を探す
    const ganttSearch = await page.evaluate(() => {
      const allText = document.body.textContent?.toLowerCase() || '';
      const hasGanttText = allText.includes('ガント') || allText.includes('gantt');
      
      // タブやボタンを探す
      const clickableElements = document.querySelectorAll('button, a, .ant-tabs-tab, [role="tab"]');
      const ganttClickable = [];
      
      clickableElements.forEach(el => {
        const text = el.textContent?.toLowerCase() || '';
        if (text.includes('ガント') || text.includes('gantt')) {
          ganttClickable.push({
            tagName: el.tagName,
            text: el.textContent?.trim(),
            className: el.className || '',
            clickable: true
          });
        }
      });
      
      return {
        hasGanttText,
        ganttClickableElements: ganttClickable,
        ganttContainer: !!document.querySelector('[data-testid="gantt-container"]'),
        allTabs: Array.from(document.querySelectorAll('.ant-tabs-tab')).map(tab => tab.textContent?.trim())
      };
    });
    
    console.log('ガントチャート検索結果:', JSON.stringify(ganttSearch, null, 2));

    // ガントチャートタブやボタンをクリック
    if (ganttSearch.ganttClickableElements.length > 0) {
      console.log('5. ガントチャート要素をクリック...');
      const ganttElement = page.locator('text=ガントチャート').first();
      
      if (await ganttElement.isVisible()) {
        await ganttElement.click();
        console.log('ガントチャート要素をクリックしました');
      } else {
        // タブの場合
        const ganttTab = page.locator('.ant-tabs-tab:has-text("ガントチャート")').first();
        if (await ganttTab.isVisible()) {
          await ganttTab.click();
          console.log('ガントチャートタブをクリックしました');
        }
      }
      
      // クリック後の状態を待つ
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-3-gantt-clicked.png', fullPage: true });
    }

    console.log('6. ガントチャートの初期化状態確認...');
    // 5秒間ガントチャートの初期化を監視
    for (let i = 0; i < 10; i++) {
      const ganttState = await page.evaluate(() => {
        const container = document.querySelector('[data-testid="gantt-container"]');
        
        return {
          step: window.performance.now(),
          containerExists: !!container,
          containerVisible: container ? (container.offsetWidth > 0 && container.offsetHeight > 0) : false,
          containerContent: container ? container.innerHTML.length : 0,
          dhtmlxLoaded: typeof window.gantt !== 'undefined',
          dhtmlxReady: window.gantt ? (typeof window.gantt.init === 'function') : false,
          ganttInitialized: window.gantt && window.gantt.getTaskCount ? `tasks: ${window.gantt.getTaskCount()}` : 'not initialized',
          dhtmlxDOMElements: !!document.querySelector('.gantt_container'),
          cssLoaded: !!document.querySelector('link[href*="dhtmlxgantt.css"]'),
          jsLoaded: !!document.querySelector('script[src*="dhtmlxgantt.js"]')
        };
      });
      
      console.log(`ガントチャート状態 ${i + 1}/10:`, JSON.stringify(ganttState, null, 2));
      
      if (ganttState.dhtmlxDOMElements && ganttState.ganttInitialized !== 'not initialized') {
        console.log('ガントチャートが正常に初期化されました！');
        break;
      }
      
      await page.waitForTimeout(500);
    }

    console.log('7. 最終スクリーンショット撮影...');
    await page.screenshot({ path: 'test-4-final-state.png', fullPage: true });

    // 最終的なコンソールログ出力
    console.log('\n=== 重要なコンソールログ ===');
    const importantLogs = logs.filter(log => 
      log.includes('Gantt') || 
      log.includes('ガント') || 
      log.includes('DHTMLX') || 
      log.includes('error') || 
      log.includes('failed') ||
      log.includes('initialized')
    );
    importantLogs.forEach(log => console.log(log));

    if (networkErrors.length > 0) {
      console.log('\n=== ネットワークエラー ===');
      networkErrors.forEach(error => console.log(error));
    }

    console.log('\n=== 全コンソールログ（最後の20件） ===');
    logs.slice(-20).forEach(log => console.log(log));

  } catch (error) {
    console.error('テスト実行エラー:', error);
    await page.screenshot({ path: 'test-error.png', fullPage: true });
    
    console.log('\n=== エラー時の全ログ ===');
    logs.forEach(log => console.log(log));
    
    if (networkErrors.length > 0) {
      console.log('\n=== ネットワークエラー ===');
      networkErrors.forEach(error => console.log(error));
    }
  }
});