const { test, expect } = require('@playwright/test');

test('ナビゲーション経由でガントチャートテスト', async ({ page }) => {
  console.log('1. ログイン実行...');
  await page.goto('http://localhost:3000/login');
  
  await page.fill('#login_username', 'admin');
  await page.fill('#login_password', 'admin123');
  await page.click('button[type="submit"]');
  
  await page.waitForLoadState('networkidle');
  console.log(`ログイン後のURL: ${page.url()}`);
  await page.screenshot({ path: 'nav-1-login-success.png', fullPage: true });
  
  console.log('2. プロジェクト一覧ページの分析...');
  const projectsPageAnalysis = await page.evaluate(() => {
    const content = document.body.textContent || '';
    const links = Array.from(document.querySelectorAll('a')).map(link => ({
      text: link.textContent?.trim(),
      href: link.href,
      className: link.className
    })).filter(link => link.text && link.text.length > 0);
    
    const buttons = Array.from(document.querySelectorAll('button')).map(btn => ({
      text: btn.textContent?.trim(),
      className: btn.className,
      onclick: !!btn.onclick
    })).filter(btn => btn.text && btn.text.length > 0);
    
    return {
      contentSample: content.substring(0, 300),
      linksCount: links.length,
      links: links.slice(0, 10), // 最初の10個
      buttonsCount: buttons.length,
      buttons: buttons.slice(0, 10), // 最初の10個
      hasDetailButtons: content.includes('詳細'),
      hasProjectNames: content.includes('プロジェクト')
    };
  });
  
  console.log('プロジェクト一覧分析:', JSON.stringify(projectsPageAnalysis, null, 2));
  
  console.log('3. 詳細ボタンまたはプロジェクトリンクをクリック...');
  
  // 「詳細」ボタンを探してクリック
  const detailButton = page.locator('button:has-text("詳細"), a:has-text("詳細")').first();
  if (await detailButton.isVisible()) {
    console.log('詳細ボタンを発見、クリック中...');
    await detailButton.click();
    await page.waitForLoadState('networkidle');
  } else {
    // プロジェクト名をクリック（テーブル内のリンクなど）
    const projectLink = page.locator('a').filter({ hasText: /プロジェクト|センター|システム/ }).first();
    if (await projectLink.isVisible()) {
      console.log('プロジェクトリンクを発見、クリック中...');
      await projectLink.click();
      await page.waitForLoadState('networkidle');
    } else {
      console.log('❌ 詳細ボタンまたはプロジェクトリンクが見つかりません');
      return;
    }
  }
  
  const detailUrl = page.url();
  console.log(`プロジェクト詳細URL: ${detailUrl}`);
  await page.screenshot({ path: 'nav-2-project-detail.png', fullPage: true });
  
  if (detailUrl.includes('/login')) {
    console.log('❌ プロジェクト詳細ページアクセスに失敗');
    return;
  }
  
  console.log('4. プロジェクト詳細ページの分析...');
  const detailPageAnalysis = await page.evaluate(() => {
    const content = document.body.textContent || '';
    
    // タブを探す
    const tabs = Array.from(document.querySelectorAll('.ant-tabs-tab, [role="tab"]')).map(tab => ({
      text: tab.textContent?.trim(),
      className: tab.className,
      active: tab.classList.contains('ant-tabs-tab-active') || tab.getAttribute('aria-selected') === 'true'
    }));
    
    // ガント関連要素を探す
    const ganttElements = Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.textContent?.toLowerCase() || '';
      return (text.includes('ガント') || text.includes('gantt')) && text.length < 50;
    }).map(el => ({
      tagName: el.tagName,
      text: el.textContent?.trim(),
      className: el.className,
      clickable: ['BUTTON', 'A', 'DIV'].includes(el.tagName)
    }));
    
    return {
      hasGanttText: content.toLowerCase().includes('ガント') || content.toLowerCase().includes('gantt'),
      tabsCount: tabs.length,
      tabs: tabs,
      ganttElementsCount: ganttElements.length,
      ganttElements: ganttElements,
      containerExists: !!document.querySelector('[data-testid="gantt-container"]'),
      hasTaskList: content.includes('タスク一覧') || content.includes('Task'),
      contentSample: content.substring(0, 400)
    };
  });
  
  console.log('詳細ページ分析:', JSON.stringify(detailPageAnalysis, null, 2));
  
  if (detailPageAnalysis.ganttElementsCount > 0) {
    console.log('5. ガント要素をクリック...');
    const ganttElement = page.locator('text=ガントチャート').first();
    if (await ganttElement.isVisible()) {
      await ganttElement.click();
      console.log('ガント要素をクリックしました');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'nav-3-gantt-clicked.png', fullPage: true });
      
      console.log('6. ガント初期化状態を監視...');
      // 5秒間監視
      for (let i = 0; i < 10; i++) {
        const ganttState = await page.evaluate((step) => {
          return {
            step: step,
            containerExists: !!document.querySelector('[data-testid="gantt-container"]'),
            containerVisible: document.querySelector('[data-testid="gantt-container"]')?.offsetWidth > 0,
            dhtmlxLoaded: typeof window.gantt !== 'undefined',
            dhtmlxReady: window.gantt && typeof window.gantt.init === 'function',
            ganttInitialized: window.gantt && window.gantt.getTaskCount ? window.gantt.getTaskCount() : 0,
            ganttDOM: !!document.querySelector('.gantt_container'),
            loadingSpinner: !!document.querySelector('.ant-spin'),
            scripts: Array.from(document.querySelectorAll('script')).filter(s => s.src.includes('dhtmlx')).length,
            css: Array.from(document.querySelectorAll('link')).filter(l => l.href.includes('dhtmlx')).length
          };
        }, i + 1);
        
        console.log(`ガント状態 ${i + 1}/10:`, JSON.stringify(ganttState, null, 2));
        
        if (ganttState.ganttDOM && ganttState.dhtmlxLoaded) {
          console.log('✅ ガントチャートが初期化されました！');
          break;
        }
        
        await page.waitForTimeout(500);
      }
      
      await page.screenshot({ path: 'nav-4-final-gantt.png', fullPage: true });
    }
  } else {
    console.log('❌ ガント要素が見つかりません');
    
    // タブがある場合は各タブをクリックしてみる
    if (detailPageAnalysis.tabsCount > 0) {
      console.log('5. 各タブを順次確認...');
      for (let i = 0; i < Math.min(detailPageAnalysis.tabsCount, 5); i++) {
        const tab = detailPageAnalysis.tabs[i];
        console.log(`タブ ${i + 1} をクリック: ${tab.text}`);
        
        const tabElement = page.locator('.ant-tabs-tab').nth(i);
        if (await tabElement.isVisible()) {
          await tabElement.click();
          await page.waitForTimeout(2000);
          
          const tabContent = await page.evaluate(() => {
            return {
              containerExists: !!document.querySelector('[data-testid="gantt-container"]'),
              dhtmlxLoaded: typeof window.gantt !== 'undefined',
              visibleContent: document.body.textContent?.substring(0, 200)
            };
          });
          
          console.log(`タブ ${i + 1} コンテンツ:`, JSON.stringify(tabContent, null, 2));
          
          if (tabContent.containerExists) {
            console.log(`✅ タブ ${i + 1} でガントチャートコンテナを発見！`);
            await page.screenshot({ path: `nav-5-tab-${i + 1}-gantt.png`, fullPage: true });
            break;
          }
        }
      }
    }
  }
});