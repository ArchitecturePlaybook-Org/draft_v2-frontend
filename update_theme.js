const fs = require('fs');
const path = require('path');

function processDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (let f of fs.readdirSync(dir)) {
    let p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      processDir(p);
    } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
      let c = fs.readFileSync(p, 'utf8');
      
      // Replace bg-white with dark-mode responsive classes
      let nc = c.replace(/\bbg-white\b/g, 'bg-white dark:bg-surface-800 dark:border-surface-700');
      
      // Other high-tech aesthetic touches:
      // text-primary -> dark:text-foreground (actually text-primary works well but just in case)
      // replace bg-blue-50 with dark mode compatible alphas
      nc = nc.replace(/\bbg-blue-50\b/g, 'bg-blue-50 dark:bg-blue-900/20');
      nc = nc.replace(/\bborder-blue-200\b/g, 'border-blue-200 dark:border-blue-800/30');
      
      nc = nc.replace(/\bbg-amber-50\b/g, 'bg-amber-50 dark:bg-amber-900/20');
      nc = nc.replace(/\bborder-amber-200\b/g, 'border-amber-200 dark:border-amber-800/30');
      
      nc = nc.replace(/\bbg-emerald-50\b/g, 'bg-emerald-50 dark:bg-emerald-900/20');
      nc = nc.replace(/\bborder-emerald-200\b/g, 'border-emerald-200 dark:border-emerald-800/30');

      nc = nc.replace(/\bbg-red-50\b/g, 'bg-red-50 dark:bg-red-900/20');
      nc = nc.replace(/\bborder-red-200\b/g, 'border-red-200 dark:border-red-800/30');

      // Light text that should dim in dark mode
      nc = nc.replace(/\btext-surface-500\b/g, 'text-surface-500 dark:text-surface-400');
      nc = nc.replace(/\btext-surface-600\b/g, 'text-surface-600 dark:text-surface-300');

      if (c !== nc) {
        fs.writeFileSync(p, nc, 'utf8');
        console.log('Updated ' + p);
      }
    }
  }
}

processDir(path.join(__dirname, 'src/components/projects'));
processDir(path.join(__dirname, 'src/app/dashboard'));
