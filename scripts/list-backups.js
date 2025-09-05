const fs = require('fs');
const path = require('path');

const backupDir = path.join(__dirname, '../backup');

console.log('📋 Lista backupów:');
console.log('=================');

if (!fs.existsSync(backupDir)) {
  console.log('❌ Brak folderu backup');
  return;
}

const backups = fs.readdirSync(backupDir).sort().reverse();

if (backups.length === 0) {
  console.log('❌ Brak backupów');
  return;
}

backups.forEach(backup => {
  const backupPath = path.join(backupDir, backup);
  const stats = fs.statSync(backupPath);
  const size = formatBytes(getFolderSize(backupPath));
  
  console.log(`📁 ${backup} | ${size} | ${stats.mtime.toLocaleString()}`);
});

function getFolderSize(folderPath) {
  let totalSize = 0;
  const files = fs.readdirSync(folderPath);
  
  files.forEach(file => {
    const filePath = path.join(folderPath, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
  });
  
  return totalSize;
}

function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}