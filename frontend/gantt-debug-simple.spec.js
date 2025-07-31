const { test, expect } = require('@playwright/test');

test('シンプルなガントチャートテスト', async ({ page }) => {
  console.log('1. ログイン試行...');
  await page.goto('http://localhost:3000/login');
  
  // ログイン試行
  await page.fill('#login_username', 'admin');
  await page.fill('#login_password', 'admin123');
  await page.click('button[type="submit"]');
  
  // 少し待つ
  await page.waitForTimeout(3000);
  
  const currentUrl = page.url();
  console.log(`ログイン後のURL: ${currentUrl}`);
  
  if (currentUrl.includes('/login')) {
    console.log('❌ ログインに失敗しました');
    await page.screenshot({ path: 'login-failed.png', fullPage: true });
    
    // ログインフォームを再確認
    const formInfo = await page.evaluate(() => {
      const form = document.querySelector('form');
      const inputs = Array.from(document.querySelectorAll('input'));
      return {
        formExists: !!form,
        inputs: inputs.map(input => ({
          type: input.type,
          name: input.name,
          id: input.id,
          value: input.value,
          placeholder: input.placeholder
        }))
      };
    });
    console.log('フォーム情報:', JSON.stringify(formInfo, null, 2));
    return;
  }
  
  console.log('✅ ログイン成功！');
  await page.screenshot({ path: 'login-success.png', fullPage: true });
  
  console.log('2. プロジェクト詳細ページに移動...');
  // 直接プロジェクト詳細ページにアクセス
  await page.goto('http://localhost:3000/projects/1');
  await page.waitForTimeout(2000);
  
  const projectUrl = page.url();
  console.log(`プロジェクト詳細URL: ${projectUrl}`);
  await page.screenshot({ path: 'project-detail.png', fullPage: true });
  
  if (projectUrl.includes('/login')) {
    console.log('❌ プロジェクト詳細ページアクセスに失敗（認証エラー）');
    return;
  }
  
  console.log('3. ガントチャート要素を検索...');
  const ganttCheck = await page.evaluate(() => {
    const bodyText = document.body.textContent || '';
    const hasGanttText = bodyText.toLowerCase().includes('ガント') || bodyText.toLowerCase().includes('gantt');
    
    // ガントチャート関連のクリック可能要素を探す
    const clickableElements = Array.from(document.querySelectorAll('button, a, [role="tab"], .ant-tabs-tab'));
    const ganttClickable = clickableElements.filter(el => {
      const text = el.textContent?.toLowerCase() || '';
      return text.includes('ガント') || text.includes('gantt');
    });
    
    return {
      hasGanttText,
      ganttClickableCount: ganttClickable.length,
      ganttClickableTexts: ganttClickable.map(el => el.textContent?.trim()),
      tabsFound: Array.from(document.querySelectorAll('.ant-tabs-tab')).map(tab => tab.textContent?.trim()),
      containerExists: !!document.querySelector('[data-testid="gantt-container"]')
    };
  });
  
  console.log('ガント検索結果:', JSON.stringify(ganttCheck, null, 2));
  
  if (ganttCheck.ganttClickableCount > 0) {
    console.log('4. ガント要素をクリック...');
    const ganttElement = page.locator('text=ガントチャート').first();
    if (await ganttElement.isVisible()) {
      await ganttElement.click();
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'gantt-clicked.png', fullPage: true });
      
      console.log('5. ガントチャート状態確認...');
      const ganttState = await page.evaluate(() => {
        return {
          containerExists: !!document.querySelector('[data-testid="gantt-container"]'),
          dhtmlxLoaded: typeof window.gantt !== 'undefined',
          dhtmlxReady: window.gantt && typeof window.gantt.init === 'function',
          ganttDOM: !!document.querySelector('.gantt_container'),
          scripts: Array.from(document.querySelectorAll('script')).map(s => s.src).filter(src => src.includes('dhtmlx')),
          css: Array.from(document.querySelectorAll('link')).map(l => l.href).filter(href => href.includes('dhtmlx'))
        };
      });
      
      console.log('ガント状態:', JSON.stringify(ganttState, null, 2));
      
      if (ganttState.containerExists && ganttState.dhtmlxLoaded) {
        console.log('✅ ガントチャートが正常に読み込まれました！');
      } else {
        console.log('❌ ガントチャートの初期化に問題があります');
      }
    }
  } else {
    console.log('❌ ガントチャート要素が見つかりません');
  }
});