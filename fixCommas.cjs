const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx') && f !== 'Login.tsx');

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  if (content.includes("fixed: 'right',,")) {
    content = content.replace(/fixed:\s*'right',,/g, "fixed: 'right',");
    changed = true;
  }
  
  if (content.includes("title: 'Hành động'\n")) {
    content = content.replace(/title:\s*'Hành động'\n/g, "title: 'Hành động',\n");
    changed = true;
  }

  // Same for Thao tác
  if (content.includes("title: 'Thao tác'\n")) {
    content = content.replace(/title:\s*'Thao tác'\n/g, "title: 'Thao tác',\n");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated commas in ${file}`);
  }
}
