const { test, expect } = require('@playwright/test');

test('プロジェクト詳細ページのガントチャートテスト', async ({ page }) => {
  // コンソールログを監視
  const logs = [];
  page.on('console', msg => {
    if (msg.type() !== 'verbose') {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });

  try {
    console.log('1. ログイン実行...');
    await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle' });
    
    await page.fill('#login_username', 'admin');
    await page.fill('#login_password', 'admin123');
    await page.click('button[type="submit"]');
    
    await page.waitForLoadState('networkidle');
    console.log(`ログイン後のURL: ${page.url()}`);
    await page.screenshot({ path: 'project-1-after-login.png', fullPage: true });

    console.log('2. プロジェクト詳細ページに移動...');
    // プロジェクト一覧から最初のプロジェクトの詳細をクリック
    const detailButton = page.locator('text=詳細').first();
    if (await detailButton.isVisible()) {
      await detailButton.click();
    } else {
      // 直接プロジェクト詳細ページにアクセス
      await page.goto('http://localhost:3000/projects/1', { waitUntil: 'networkidle' });
    }
    
    await page.waitForLoadState('networkidle');
    console.log(`プロジェクト詳細ページURL: ${page.url()}`);
    await page.screenshot({ path: 'project-2-detail-page.png', fullPage: true });

    console.log('3. ページ内容の確認...');
    const pageContent = await page.evaluate(() => {
      const content = document.body.textContent || '';
      return {
        hasGanttText: content.toLowerCase().includes('ガント') || content.toLowerCase().includes('gantt'),
        contentSample: content.substring(0, 500),
        tabElements: Array.from(document.querySelectorAll('.ant-tabs-tab')).map(tab => tab.textContent?.trim()),
        buttonElements: Array.from(document.querySelectorAll('button')).map(btn => btn.textContent?.trim()).filter(text => text && text.length > 0),
        linkElements: Array.from(document.querySelectorAll('a')).map(link => link.textContent?.trim()).filter(text => text && text.length > 0)
      };
    });
    
    console.log('ページ内容分析:', JSON.stringify(pageContent, null, 2));

    console.log('4. タブの確認とクリック...');
    // ガントチャート関連のタブを探す
    const ganttTab = page.locator('.ant-tabs-tab').filter({ hasText: /ガント|Gantt/i }).first();
    
    if (await ganttTab.isVisible()) {
      console.log('ガントチャートタブを発見、クリック中...');
      await ganttTab.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'project-3-gantt-tab-clicked.png', fullPage: true });
    } else {
      // タブが見つからない場合、他の可能性を調査
      console.log('ガントチャートタブが見つからない、他の要素を調査中...');
      
      // メニューやナビゲーション要素を探す
      const navElements = await page.evaluate(() => {
        const allElements = document.querySelectorAll('*');
        const ganttElements = [];
        
        allElements.forEach(el => {
          const text = el.textContent?.toLowerCase() || '';
          if ((text.includes('ガント') || text.includes('gantt')) && text.length < 100) {
            ganttElements.push({
              tagName: el.tagName,
              text: el.textContent?.trim(),
              className: el.className || '',
              id: el.id || '',
              clickable: ['BUTTON', 'A', 'DIV'].includes(el.tagName) && (el.onclick || el.className.includes('clickable') || el.className.includes('tab'))
            });
          }
        });
        
        return ganttElements;
      });
      
      console.log('ガント関連要素:', JSON.stringify(navElements, null, 2));
      
      // 見つかった要素をクリック試行
      if (navElements.length > 0) {
        const clickableElement = navElements.find(el => el.clickable);
        if (clickableElement) {
          console.log(`${clickableElement.text} をクリック試行...`);
          await page.locator(`text=${clickableElement.text}`).first().click();
          await page.waitForTimeout(2000);
          await page.screenshot({ path: 'project-4-gantt-element-clicked.png', fullPage: true });
        }
      }
    }

    console.log('5. ガントチャート初期化の監視...');
    // 10秒間ガントチャートの初期化を監視
    for (let i = 0; i < 20; i++) {
      const ganttState = await page.evaluate(() => {
        return {
          step: i,
          timestamp: Date.now(),
          containerExists: !!document.querySelector('[data-testid="gantt-container"]'),
          containerVisible: document.querySelector('[data-testid="gantt-container"]')?.offsetWidth > 0,
          dhtmlxLoaded: typeof window.gantt !== 'undefined',
          dhtmlxReady: window.gantt && typeof window.gantt.init === 'function',
          ganttInitialized: window.gantt && window.gantt.getTaskCount ? `${window.gantt.getTaskCount()} tasks` : 'not initialized',
          dhtmlxDOMElements: !!document.querySelector('.gantt_container'),
          scriptsLoaded: !!document.querySelector('script[src*="dhtmlxgantt"]'),
          cssLoaded: !!document.querySelector('link[href*="dhtmlxgantt"]'),
          containerHTML: document.querySelector('[data-testid="gantt-container"]')?.innerHTML?.length || 0,
          loadingElement: !!document.querySelector('.ant-spin, [class*="loading"], [class*="Loading"]'),
          errorElement: !!document.querySelector('.ant-result-error, [class*="error"], [class*="Error"]'),
          allScripts: Array.from(document.querySelectorAll('script')).map(s => s.src).filter(src => src.includes('dhtmlx'))
        };
      });
      
      console.log(`ガントチャート状態 ${i + 1}/20:`, JSON.stringify(ganttState, null, 2));
      
      // 初期化が完了した場合
      if (ganttState.dhtmlxDOMElements && ganttState.ganttInitialized.includes('tasks')) {
        console.log('✅ ガントチャートが正常に初期化されました！');
        break;
      }
      
      // エラーが検出された場合
      if (ganttState.errorElement) {
        console.log('❌ エラー要素が検出されました');
        break;
      }
      
      await page.waitForTimeout(500);
    }

    console.log('6. 最終スクリーンショット...');
    await page.screenshot({ path: 'project-5-final-state.png', fullPage: true });

    // ガントチャートが表示されている場合、詳細情報を取得
    const finalGanttState = await page.evaluate(() => {
      const container = document.querySelector('[data-testid="gantt-container"]');
      
      return {
        containerExists: !!container,
        containerDimensions: container ? {
          width: container.offsetWidth,
          height: container.offsetHeight,
          display: window.getComputedStyle(container).display
        } : null,
        ganttElements: {
          ganttContainer: !!document.querySelector('.gantt_container'),
          ganttGrid: !!document.querySelector('.gantt_grid'),
          ganttChart: !!document.querySelector('.gantt_chart'),
          ganttTasks: document.querySelectorAll('.gantt_task_line').length
        },
        dhtmlxVersion: window.gantt ? (window.gantt.version || 'unknown') : 'not loaded',
        taskCount: window.gantt && window.gantt.getTaskCount ? window.gantt.getTaskCount() : 0
      };
    });
    
    console.log('最終ガントチャート状態:', JSON.stringify(finalGanttState, null, 2));

    // 重要なログを出力
    console.log('\n=== 重要なコンソールログ ===');
    const importantLogs = logs.filter(log => 
      log.includes('Gantt') || 
      log.includes('ガント') || 
      log.includes('DHTMLX') || 
      log.includes('initialized') ||
      log.includes('error') ||
      log.includes('failed')
    );
    importantLogs.forEach(log => console.log(log));

    console.log('\n=== 最近のコンソールログ ===');
    logs.slice(-15).forEach(log => console.log(log));

  } catch (error) {
    console.error('テスト実行エラー:', error);
    await page.screenshot({ path: 'project-error.png', fullPage: true });
    
    console.log('\n=== エラー時のコンソールログ ===');
    logs.forEach(log => console.log(log));
    
    throw error;
  }
});