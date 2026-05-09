import { writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function main() {
  const docsDir = resolve(ROOT, 'docs');
  mkdirSync(docsDir, { recursive: true });

  let files = [];
  try {
    files = readdirSync(docsDir)
      .filter(f => f.startsWith('menopause-insomnia-') && f.endsWith('.html'))
      .sort()
      .reverse();
  } catch {}

  const links = files.slice(0, 60).map(f => {
    const dateStr = f.replace('menopause-insomnia-', '').replace('.html', '');
    let dateDisplay = dateStr;
    let weekday = '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      if (y && m && d) {
        dateDisplay = `${y}年${m}月${d}日`;
        const dt = new Date(y, m - 1, d);
        weekday = WEEKDAYS[dt.getDay()] || '';
      }
    } catch {}
    return `<li><a href="${escapeHtml(f)}">\u{1F4C5} ${escapeHtml(dateDisplay)}（週${escapeHtml(weekday)}）</a></li>`;
  }).join('\n');

  const total = files.length;

  const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Menopause Insomnia \u00b7 更年期失眠文獻日報</title>
<meta name="description" content="更年期失眠文獻日報，每日自動更新，由 PubMed + Zhipu AI 驅動"/>
<style>
  :root { --bg: #f6f1e8; --surface: #fffaf2; --line: #d8c5ab; --text: #2b2118; --muted: #766453; --accent: #8c4f2b; --accent-soft: #ead2bf; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: radial-gradient(circle at top, #fff6ea 0, var(--bg) 55%, #ead8c6 100%); color: var(--text); font-family: "Noto Sans TC", "PingFang TC", "Helvetica Neue", Arial, sans-serif; min-height: 100vh; }
  .container { position: relative; z-index: 1; max-width: 640px; margin: 0 auto; padding: 80px 24px; }
  .logo { font-size: 48px; text-align: center; margin-bottom: 16px; }
  h1 { text-align: center; font-size: 24px; color: var(--text); margin-bottom: 8px; }
  .subtitle { text-align: center; color: var(--accent); font-size: 14px; margin-bottom: 8px; }
  .description { text-align: center; color: var(--muted); font-size: 13px; margin-bottom: 48px; line-height: 1.6; }
  .count { text-align: center; color: var(--muted); font-size: 13px; margin-bottom: 32px; }
  ul { list-style: none; }
  li { margin-bottom: 8px; }
  a { color: var(--text); text-decoration: none; display: block; padding: 14px 20px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; transition: all 0.2s; font-size: 15px; }
  a:hover { background: var(--accent-soft); border-color: var(--accent); transform: translateX(4px); }
  .links-row { display: flex; gap: 12px; margin-top: 40px; justify-content: center; flex-wrap: wrap; }
  .link-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; background: var(--surface); border: 1px solid var(--line); border-radius: 12px; color: var(--text); text-decoration: none; font-size: 13px; font-weight: 600; transition: all 0.2s; }
  .link-btn:hover { background: var(--accent-soft); border-color: var(--accent); transform: translateY(-2px); }
  footer { margin-top: 56px; text-align: center; font-size: 12px; color: var(--muted); }
  footer a { display: inline; padding: 0; background: none; border: none; color: var(--muted); }
  footer a:hover { color: var(--accent); }
</style>
</head>
<body>
<div class="container">
  <div class="logo">\u{1F319}</div>
  <h1>Menopause Insomnia</h1>
  <p class="subtitle">更年期失眠文獻日報 \u00b7 每日自動更新</p>
  <p class="description">涵蓋更年期失眠、血管舒縮症狀與睡眠、荷爾蒙療法、CBT-I、<br/>營養與生活型態、神經內分泌機制等跨領域研究文獻</p>
  <p class="count">共 ${total} 期日報</p>
  <ul>${links}</ul>
  <div class="links-row">
    <a href="https://www.leepsyclinic.com/" class="link-btn" target="_blank" rel="noopener">\u{1F3E5} 李政洋身心診所</a>
    <a href="https://blog.leepsyclinic.com/" class="link-btn" target="_blank" rel="noopener">\u{1F4E8} 訂閱電子報</a>
    <a href="https://buymeacoffee.com/CYlee" class="link-btn" target="_blank" rel="noopener">\u{2615} Buy Me a Coffee</a>
  </div>
  <footer>
    <p>Powered by PubMed + Zhipu AI \u00b7 <a href="https://github.com/u8901006/menopause-insomnia">GitHub</a></p>
  </footer>
</div>
</body>
</html>`;

  writeFileSync(resolve(docsDir, 'index.html'), html, 'utf-8');
  console.error('[INFO] Index page generated');
}

main();
