const { test, expect } = require('@playwright/test');

test('ガントチャート詳細デバッグ', async ({ page }) => {
  // 全てのコンソールメッセージを監視
  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // エラーを監視
  const errors = [];
  page.on('pageerror', error => {
    errors.push(`Page Error: ${error.message}`);
  });

  console.log('=== ガントチャート詳細デバッグ ===');
  
  try {
    // ログイン
    await page.goto('http://localhost:3000/login');
    await page.fill('#login_username', 'admin');
    await page.fill('#login_password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // プロジェクト詳細に移動
    const detailButton = page.locator('button:has-text("詳細")').first();
    await detailButton.click();
    await page.waitForLoadState('networkidle');

    // ガントチャートタブをクリック
    const ganttTab = page.locator('text=ガントチャート').first();
    await ganttTab.click();
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'debug-gantt-clicked.png', fullPage: true });

    // 詳細な状態チェック
    const detailedState = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="gantt-container"]');
      
      return {
        // 基本状態
        containerExists: !!container,
        containerVisible: container ? (container.offsetWidth > 0 && container.offsetHeight > 0) : false,
        containerHTML: container ? container.innerHTML.substring(0, 500) : 'No container',
        containerStyles: container ? {
          display: window.getComputedStyle(container).display,
          width: window.getComputedStyle(container).width,
          height: window.getComputedStyle(container).height,
        } : null,
        
        // DHtmlx状態
        dhtmlxLoaded: typeof window.gantt !== 'undefined',
        dhtmlxMethods: window.gantt ? Object.keys(window.gantt).filter(key => typeof window.gantt[key] === 'function').slice(0, 10) : [],
        
        // ガント要素
        ganttElements: {
          ganttContainer: !!document.querySelector('.gantt_container'),
          ganttGrid: !!document.querySelector('.gantt_grid'),
          ganttChart: !!document.querySelector('.gantt_chart'),
          ganttLayout: !!document.querySelector('.gantt_layout'),
          ganttDataArea: !!document.querySelector('.gantt_data_area'),
        },
        
        // スクリプトとCSS
        dhtmlxScripts: Array.from(document.querySelectorAll('script')).filter(s => s.src.includes('dhtmlx')).map(s => ({ src: s.src, loaded: s.readyState !== 'loading' })),
        dhtmlxCSS: Array.from(document.querySelectorAll('link')).filter(l => l.href.includes('dhtmlx')).map(l => ({ href: l.href })),
        
        // DOM内容確認
        bodyContainsGantt: document.body.innerHTML.includes('gantt'),
        allDivs: document.querySelectorAll('div').length,
        
        // 初期化状態
        ganttInitialized: (() => {
          try {
            return window.gantt && window.gantt.$container ? 'has container' : 'no container';
          } catch (e) {
            return 'error: ' + e.message;
          }
        })()
      };
    });

    console.log('詳細デバッグ結果:');
    console.log(JSON.stringify(detailedState, null, 2));

    // 手動で初期化を試行
    console.log('\n=== 手動初期化試行 ===');
    const manualInit = await page.evaluate(() => {
      try {
        const container = document.querySelector('[data-testid="gantt-container"]');
        if (!container) return { error: 'Container not found' };
        
        if (!window.gantt) return { error: 'Gantt library not loaded' };
        
        // 手動でガントを初期化
        console.log('Attempting manual gantt initialization...');
        
        // コンテナをクリア
        container.innerHTML = '';
        
        // 基本設定
        window.gantt.config.date_format = '%Y-%m-%d %H:%i';
        window.gantt.config.xml_date = '%Y-%m-%d %H:%i';
        
        // 初期化
        window.gantt.init(container);
        
        // テストデータを追加
        const testData = {
          data: [
            { id: 1, text: 'テストタスク1', start_date: '2025-07-30 09:00', duration: 3 },
            { id: 2, text: 'テストタスク2', start_date: '2025-08-02 09:00', duration: 2 }
          ],
          links: []
        };
        
        window.gantt.parse(testData);
        
        return {
          success: true,
          containerAfterInit: !!document.querySelector('.gantt_container'),
          ganttGridAfterInit: !!document.querySelector('.gantt_grid'),
          tasksCount: window.gantt.getTaskCount ? window.gantt.getTaskCount() : 'Unknown'
        };
      } catch (error) {
        return { error: error.message, stack: error.stack };
      }
    });

    console.log('手動初期化結果:', JSON.stringify(manualInit, null, 2));
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'debug-manual-init.png', fullPage: true });

    // 最終状態確認
    const finalCheck = await page.evaluate(() => {
      return {
        ganttContainerExists: !!document.querySelector('.gantt_container'),
        ganttGridExists: !!document.querySelector('.gantt_grid'),
        ganttTasksVisible: document.querySelectorAll('.gantt_task_line').length,
        containerContent: document.querySelector('[data-testid="gantt-container"]')?.innerHTML?.length || 0
      };
    });

    console.log('\n=== 最終状態 ===');
    console.log(JSON.stringify(finalCheck, null, 2));

    if (finalCheck.ganttContainerExists && finalCheck.ganttGridExists) {
      console.log('🎉 手動初期化でガントチャートが表示されました！');
      console.log('→ 問題は自動初期化プロセスにあります');
    } else if (manualInit.success) {
      console.log('⚠️ 初期化は成功したが、DOM要素が見つかりません');
    } else {
      console.log('❌ 手動初期化も失敗しました');
      console.log('エラー:', manualInit.error);
    }

    // エラーログ出力
    if (errors.length > 0) {
      console.log('\n=== ページエラー ===');
      errors.forEach(error => console.log(error));
    }

    // 重要なコンソールログ出力
    console.log('\n=== 重要なコンソールログ ===');
    const importantLogs = logs.filter(log => 
      log.includes('gantt') || 
      log.includes('Gantt') || 
      log.includes('DHTMLX') || 
      log.includes('init') ||
      log.includes('error') ||
      log.includes('Error')
    );
    importantLogs.forEach(log => console.log(log));

  } catch (error) {
    console.error('デバッグテストエラー:', error);
    await page.screenshot({ path: 'debug-error.png', fullPage: true });
  }
});