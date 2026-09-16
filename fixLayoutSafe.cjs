const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx') && f !== 'Login.tsx' && f !== 'Dashboard.tsx');

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Replace Title
  const oldContent = content;
  content = content.replace(/(<Title level=\{[2345]\}[^>]*?>)(.*?)(<\/Title>)/g, (match, p1, p2, p3) => {
      // If it's the main header of the page
      if (p2.includes('Quản lý') || p2.includes('Điều khoản') || p2.includes('Cấu hình') || p2.includes('Nhật ký') || p2.includes('Quản Lý')) {
         // strip old style
         p1 = p1.replace(/style=\{\{.*?\}\}/g, '');
         // add new style
         return p1.replace('<Title', '<Title style={{ marginTop: 16, marginBottom: 16, paddingLeft: 16 }}') + p2 + p3;
      }
      return match;
  });

  // Replace Table
  // First remove any existing scroll prop
  content = content.replace(/scroll=\{\{.*?\}\}/g, '');
  // Then inject right after <Table
  content = content.replace(/<Table/g, "<Table scroll={{ y: 'calc(100vh - 200px)', x: 'max-content' }}");

  if (content !== oldContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
