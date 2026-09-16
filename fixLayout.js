const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx') && f !== 'Login.tsx');

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Fix Title styling (only for the main page Title which is usually the first one)
  const titleRegex = /(<Title [^>]*?)style=\{\{.*?\}\}([^>]*?>)/g;
  const match = content.match(titleRegex);
  if (match) {
    // Only replace if it contains margin or something related to top
    content = content.replace(/(<Title [^>]*?)(style=\{\{([^}]*?)\}\})([^>]*?>Quản lý.*?<\/Title>|<Title [^>]*?>Điều khoản.*?<\/Title>|<Title [^>]*?>Cấu hình chung.*?<\/Title>|<Title [^>]*?>Nhật ký.*?<\/Title>)/g, (fullMatch, p1, p2, p3, p4) => {
      changed = true;
      return `${p1}style={{ marginTop: 16, marginBottom: 16, paddingLeft: 16 }}${p4}`;
    });

    // Or if the title doesn't have a style prop at all
    content = content.replace(/(<Title [^>]*?)(>Quản lý.*?<\/Title>|>Điều khoản.*?<\/Title>|>Cấu hình chung.*?<\/Title>|>Nhật ký.*?<\/Title>)/g, (fullMatch, p1, p2) => {
      if (!p1.includes('style=')) {
         changed = true;
         return `${p1} style={{ marginTop: 16, marginBottom: 16, paddingLeft: 16 }}${p2}`;
      }
      return fullMatch;
    });
  }

  // Fix Table scrolling
  if (content.includes('<Table')) {
    // We want to add scroll={{ y: 'calc(100vh - 200px)', x: 'max-content' }} to <Table> if it doesn't have it, or update it if it does
    const tableRegex = /(<Table\b[^>]*?)(\/?>)/g;
    content = content.replace(tableRegex, (fullMatch, p1, p2) => {
       // if it already has scroll, replace it
       if (p1.includes('scroll=')) {
          changed = true;
          return p1.replace(/scroll=\{\{.*?\}\}/g, "scroll={{ y: 'calc(100vh - 200px)', x: 'max-content' }}") + p2;
       } else {
          changed = true;
          return p1 + " scroll={{ y: 'calc(100vh - 200px)', x: 'max-content' }}" + p2;
       }
    });
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
