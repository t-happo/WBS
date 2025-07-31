const { test, expect } = require('@playwright/test');

test.describe('ガントチャート表示問題の調査', () => {
  test('ガントチャート初期化と表示確認', async ({ page }) => {
    // コンソールログを監視
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error' || msg.type() === 'warn') {
        logs.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    // ネットワークエラーを監視
    const networkErrors = [];
    page.on('response', response => {
      if (!response.ok()) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });

    try {
      // サイトにアクセス
      console.log('サイトにアクセス中...');
      await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
      
      // プロジェクトページに移動（ログインスキップ）
      console.log('プロジェクトページに移動中...');
      await page.goto('http://localhost:3000/projects/1', { waitUntil: 'networkidle' });
      
      // ガントチャートタブまたはリンクをクリック
      console.log('ガントチャートページに移動中...');
      const ganttLink = page.locator('text=ガントチャート').first();
      if (await ganttLink.isVisible()) {
        await ganttLink.click();
        await page.waitForTimeout(2000);
      }

      // 5秒待って初期化を確認
      console.log('ガントチャート初期化を待機中...');
      await page.waitForTimeout(5000);

      // ガントチャートコンテナの存在確認
      const ganttContainer = page.locator('[data-testid="gantt-container"]');
      console.log('ガントチャートコンテナの確認...');
      await expect(ganttContainer).toBeVisible();

      // DHTMLX Ganttライブラリの読み込み確認
      const ganttLibraryLoaded = await page.evaluate(() => {
        return typeof window.gantt !== 'undefined' && typeof window.gantt.init === 'function';
      });
      console.log('DHTMLX Ganttライブラリ読み込み状態:', ganttLibraryLoaded);

      // ガントチャートの要素確認
      const ganttElements = await page.evaluate(() => {
        const container = document.querySelector('[data-testid="gantt-container"]');
        if (!container) return { error: 'Container not found' };
        
        return {
          containerHTML: container.innerHTML.length,
          hasGanttContainer: !!container.querySelector('.gantt_container'),
          hasGanttGrid: !!container.querySelector('.gantt_grid'),
          hasGanttChart: !!container.querySelector('.gantt_chart'),
          containerStyles: window.getComputedStyle(container).display,
          containerSize: {
            width: container.offsetWidth,
            height: container.offsetHeight
          }
        };
      });
      console.log('ガントチャート要素の状態:', JSON.stringify(ganttElements, null, 2));

      // データ取得状況確認
      const dataStatus = await page.evaluate(() => {
        const ganttData = document.querySelector('[data-testid="gantt-container"]')?.getAttribute('data-gantt-loaded');
        return {
          ganttDataAttribute: ganttData,
          windowGanttExists: typeof window.gantt !== 'undefined',
          ganttInitialized: window.gantt && window.gantt.getTaskCount ? window.gantt.getTaskCount() : 'N/A'
        };
      });
      console.log('データ取得状況:', JSON.stringify(dataStatus, null, 2));

      // スクリーンショット撮影
      await page.screenshot({ path: 'gantt-debug.png', fullPage: true });
      console.log('スクリーンショットを保存しました: gantt-debug.png');

      // コンソールログの出力
      console.log('\n=== コンソールログ ===');
      logs.forEach(log => console.log(log));

      // ネットワークエラーの出力
      if (networkErrors.length > 0) {
        console.log('\n=== ネットワークエラー ===');
        networkErrors.forEach(error => console.log(error));
      }

    } catch (error) {
      console.error('テスト実行中にエラーが発生:', error);
      
      // エラー時もスクリーンショット撮影
      await page.screenshot({ path: 'gantt-error.png', fullPage: true });
      
      // コンソールログとネットワークエラーを出力
      console.log('\n=== エラー時のコンソールログ ===');
      logs.forEach(log => console.log(log));
      
      if (networkErrors.length > 0) {
        console.log('\n=== ネットワークエラー ===');
        networkErrors.forEach(error => console.log(error));
      }
      
      throw error;
    }
  });

  test('ページリフレッシュ後のガントチャート表示確認', async ({ page }) => {
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'error' || msg.type() === 'warn') {
        logs.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    try {
      // 最初にサイトにアクセス
      await page.goto('http://localhost:3000/projects/1', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);

      console.log('ページをリフレッシュします...');
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(5000);

      // ガントチャートの状態確認
      const ganttState = await page.evaluate(() => {
        const container = document.querySelector('[data-testid="gantt-container"]');
        return {
          containerExists: !!container,
          containerVisible: container ? container.offsetWidth > 0 && container.offsetHeight > 0 : false,
          ganttLibraryLoaded: typeof window.gantt !== 'undefined',
          ganttInitialized: window.gantt && window.gantt.getTaskCount ? window.gantt.getTaskCount() : 'N/A'
        };
      });

      console.log('リフレッシュ後のガントチャート状態:', JSON.stringify(ganttState, null, 2));
      
      await page.screenshot({ path: 'gantt-after-refresh.png', fullPage: true });
      
      console.log('\n=== リフレッシュ後のコンソールログ ===');
      logs.forEach(log => console.log(log));

    } catch (error) {
      console.error('リフレッシュテスト中にエラー:', error);
      throw error;
    }
  });
});