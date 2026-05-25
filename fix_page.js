const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/projects/[id]/page.tsx', 'utf8');
content = content.replace(/t\.status === "Done"/g, 't.status === "DONE"');
content = content.replace(/t\.status === "In Progress"/g, 't.status === "WIP"');
fs.writeFileSync('src/app/dashboard/projects/[id]/page.tsx', content);
console.log('Patched');
