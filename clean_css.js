const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else if (name.endsWith('.tsx') || name.endsWith('.ts')) {
      files.push(name);
    }
  }
  return files;
}

const files = getFiles('src');
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  // Replace bg-white dark:bg-surface-800 with bg-surface-100
  content = content.replace(/bg-white dark:bg-surface-800/g, 'bg-surface-100');
  
  // Replace dark:border-surface-700 with border-surface-200
  content = content.replace(/dark:border-surface-700/g, 'border-surface-200');
  
  // Remove dark:border-surface-700/50
  content = content.replace(/dark:border-surface-700\/50/g, 'border-surface-200');
  
  // Remove other common dark: classes that might be obsolete
  content = content.replace(/dark:bg-surface-900/g, 'bg-background');
  content = content.replace(/dark:text-surface-400/g, 'text-surface-400');
  content = content.replace(/dark:text-surface-300/g, 'text-surface-300');
  content = content.replace(/dark:text-surface-100/g, 'text-foreground');
  
  // Remove single bg-white if it's acting as a container
  content = content.replace(/bg-white /g, 'bg-surface-100 ');
  content = content.replace(/\"bg-white\"/g, '\"bg-surface-100\"');

  // Specific fixes for login page
  if (file.includes(path.join('login', 'page.tsx')) || file.includes('login/page.tsx')) {
    content = content.replace(/bg-surface-100 font-sans/g, 'bg-background font-sans'); // min-h-screen container
    content = content.replace(/bg-surface-100 rounded-2xl shadow-2xl/g, 'bg-surface-50 rounded-2xl shadow-none border border-surface-200'); // modal
    content = content.replace(/bg-surface-100 px-4 text-surface-600\/40/g, 'bg-background px-4 text-surface-400'); // dividers
    content = content.replace(/text-primary\/40/g, 'text-surface-400'); // Some faint texts
    content = content.replace(/text-surface-600/g, 'text-text-secondary');
  }

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changedFiles++;
  }
});

console.log('Modified files:', changedFiles);
