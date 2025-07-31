const { test, expect } = require('@playwright/test');

test('ガントチャート基本表示テスト', async ({ page }) => {
  // コンソールログを監視
  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  // ネットワークエラーを監視
  page.on('response', response => {
    if (!response.ok()) {
      console.log(`ネットワークエラー: ${response.status()} ${response.url()}`);
    }
  });

  try {
    console.log('ホームページにアクセス...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    
    // 現在のページタイトルとURL確認
    const title = await page.title();
    const url = page.url();
    console.log(`ページタイトル: ${title}`);
    console.log(`現在のURL: ${url}`);
    
    // ページの基本情報を取得
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        url: location.href,
        reactVersion: window.React?.version || 'N/A',
        hasReactQueryClient: !!window.ReactQuery || !!document.querySelector('[data-reactroot]'),
        errorElements: document.querySelector('.error, .alert-danger') ? 'エラー要素が存在' : 'エラー要素なし'
      };
    });
    console.log('ページ基本情報:', JSON.stringify(pageInfo, null, 2));

    // スクリーンショット撮影
    await page.screenshot({ path: 'homepage.png', fullPage: true });
    
    // 利用可能なリンクを確認
    const links = await page.evaluate(() => {
      const linkElements = document.querySelectorAll('a');
      return Array.from(linkElements).map(link => ({
        text: link.textContent?.trim(),
        href: link.href
      })).filter(link => link.text && link.text.length > 0);
    });
    console.log('利用可能なリンク:', links);

    // プロジェクト関連のリンクを探す
    const projectLink = links.find(link => 
      link.text.includes('プロジェクト') || 
      link.text.includes('Project') ||
      link.href.includes('project')
    );
    
    if (projectLink) {
      console.log(`プロジェクトリンクを発見: ${projectLink.text} -> ${projectLink.href}`);
      await page.click(`text=${projectLink.text}`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'project-page.png', fullPage: true });
    } else {
      // 直接プロジェクトページにアクセス試行
      console.log('直接プロジェクトページにアクセス試行...');
      await page.goto('http://localhost:3000/projects/1', { waitUntil: 'networkidle' });
      await page.screenshot({ path: 'project-direct.png', fullPage: true });
    }

    // ガントチャート関連の要素を探す
    const ganttElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const ganttRelated = [];
      
      elements.forEach((el, index) => {
        const text = el.textContent?.toLowerCase() || '';
        const className = el.className?.toLowerCase() || '';
        const id = el.id?.toLowerCase() || '';
        
        if (text.includes('ガント') || text.includes('gantt') || 
            className.includes('gantt') || id.includes('gantt')) {
          ganttRelated.push({
            tagName: el.tagName,
            text: el.textContent?.trim().substring(0, 50),
            className: el.className,
            id: el.id
          });
        }
      });
      
      return ganttRelated;
    });
    
    console.log('ガント関連要素:', ganttElements);

    // DHTMLX CDNリソースの確認
    const cdnResources = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src);
      const links = Array.from(document.querySelectorAll('link')).map(l => l.href);
      
      return {
        dhtmlxScripts: scripts.filter(src => src.includes('dhtmlx')),
        dhtmlxLinks: links.filter(href => href.includes('dhtmlx')),
        ganttObject: typeof window.gantt !== 'undefined' ? 'loaded' : 'not loaded'
      };
    });
    
    console.log('DHTMLX CDNリソース:', JSON.stringify(cdnResources, null, 2));

    // コンソールログ出力
    console.log('\n=== 全コンソールログ ===');
    logs.forEach(log => console.log(log));

  } catch (error) {
    console.error('テスト実行エラー:', error);
    await page.screenshot({ path: 'error-state.png', fullPage: true });
    
    console.log('\n=== エラー時のコンソールログ ===');
    logs.forEach(log => console.log(log));
    
    throw error;
  }
});