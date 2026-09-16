const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx') && f !== 'Login.tsx');

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Find const columns = [
  //   {
  //     title: '...',
  // we want to inject fixed: 'left' into the first object if it's not already there.
  content = content.replace(/(const columns(?:\s*:\s*any(?:\[\])?)?\s*=\s*\[\s*\{)(?!\s*fixed:\s*'left')/g, (match) => {
      changed = true;
      return match + "\n      fixed: 'left',";
  });

  // Find Action column and add fixed: 'right'
  // Look for something like:
  // {
  //   title: 'Hành động',
  //   key: 'action',
  content = content.replace(/(\{\s*title:\s*'Hành động'[^}]*?)(?!\s*fixed:\s*'right')/g, (match, p1) => {
      // Check if it already has fixed: 'right'
      if (!match.includes("fixed: 'right'")) {
         changed = true;
         // insert fixed: 'right' after the title or key
         return p1.replace(/(title:\s*'Hành động',?)/, "$1\n      fixed: 'right',");
      }
      return match;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
