const { test, expect } = require('@playwright/test');

test('認証フローとガントチャート調査', async ({ page }) => {
  // コンソールログを監視
  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  try {
    console.log('ホームページにアクセス...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    console.log(`現在のURL: ${page.url()}`);
    await page.screenshot({ path: 'login-page.png', fullPage: true });

    // ログインフォームの詳細を調査
    const loginForm = await page.evaluate(() => {
      const forms = document.querySelectorAll('form');
      const inputs = document.querySelectorAll('input');
      const buttons = document.querySelectorAll('button');
      
      return {
        formsCount: forms.length,
        inputsInfo: Array.from(inputs).map(input => ({
          type: input.type,
          name: input.name,
          placeholder: input.placeholder,
          id: input.id
        })),
        buttonsInfo: Array.from(buttons).map(button => ({
          text: button.textContent?.trim(),
          type: button.type,
          className: button.className
        }))
      };
    });
    
    console.log('ログインフォーム情報:', JSON.stringify(loginForm, null, 2));

    // テスト用のログイン試行
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="メール"], input[placeholder*="Email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("ログイン"), button:has-text("Login")').first();

    if (await emailInput.isVisible()) {
      console.log('ログイン試行中...');
      await emailInput.fill('admin@example.com');
      await passwordInput.fill('admin');
      await submitButton.click();
      
      // ログイン後のリダイレクトを待つ
      await page.waitForLoadState('networkidle');
      console.log(`ログイン後のURL: ${page.url()}`);
      await page.screenshot({ path: 'after-login.png', fullPage: true });
      
      // プロジェクト一覧があるかチェック
      const projectElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const projectRelated = [];
        
        elements.forEach(el => {
          const text = el.textContent?.toLowerCase() || '';
          if (text.includes('プロジェクト') || text.includes('project')) {
            projectRelated.push({
              tagName: el.tagName,
              text: el.textContent?.trim().substring(0, 100),
              href: el.href || null
            });
          }
        });
        
        return projectRelated;
      });
      
      console.log('プロジェクト関連要素:', projectRelated);
      
      // プロジェクトページに移動
      console.log('プロジェクトページに移動...');
      await page.goto('http://localhost:3000/projects/1', { waitUntil: 'networkidle' });
      console.log(`プロジェクトページURL: ${page.url()}`);
      await page.screenshot({ path: 'project-page.png', fullPage: true });
      
      // ガントチャート要素を探す
      const ganttCheck = await page.evaluate(() => {
        // ガント関連のテキストやボタンを探す
        const allElements = document.querySelectorAll('*');
        const ganttElements = [];
        
        allElements.forEach(el => {
          const text = el.textContent?.toLowerCase() || '';
          if (text.includes('ガント') || text.includes('gantt')) {
            ganttElements.push({
              tagName: el.tagName,
              text: el.textContent?.trim(),
              className: typeof el.className === 'string' ? el.className : '',
              clickable: el.tagName === 'BUTTON' || el.tagName === 'A' || el.onclick !== null
            });
          }
        });
        
        return {
          ganttElements,
          ganttContainer: !!document.querySelector('[data-testid="gantt-container"]'),
          dhtmlxLoaded: typeof window.gantt !== 'undefined'
        };
      });
      
      console.log('ガントチャート要素確認:', JSON.stringify(ganttCheck, null, 2));
      
      // ガントチャートボタンやタブをクリック
      const ganttButton = page.locator('text=ガントチャート').first();
      if (await ganttButton.isVisible()) {
        console.log('ガントチャートボタンをクリック...');
        await ganttButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        
        await page.screenshot({ path: 'gantt-view.png', fullPage: true });
        
        // ガントチャートの最終状態確認
        const finalGanttState = await page.evaluate(() => {
          const container = document.querySelector('[data-testid="gantt-container"]');
          return {
            containerExists: !!container,
            containerVisible: container ? (container.offsetWidth > 0 && container.offsetHeight > 0) : false,
            containerHTML: container ? container.innerHTML.substring(0, 200) : 'N/A',
            dhtmlxGanttLoaded: typeof window.gantt !== 'undefined',
            ganttInitialized: window.gantt && window.gantt.getTaskCount ? window.gantt.getTaskCount() : 'N/A',
            dhtmlxElements: !!document.querySelector('.gantt_container, .gantt_grid, .gantt_chart')
          };
        });
        
        console.log('最終ガントチャート状態:', JSON.stringify(finalGanttState, null, 2));
      }
    }

    // 全コンソールログ出力
    console.log('\n=== 全コンソールログ ===');
    logs.forEach(log => console.log(log));

  } catch (error) {
    console.error('テスト実行エラー:', error);
    await page.screenshot({ path: 'auth-error.png', fullPage: true });
    
    console.log('\n=== エラー時のコンソールログ ===');
    logs.forEach(log => console.log(log));
    
    throw error;
  }
});