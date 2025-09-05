const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const backupDir = path.join(__dirname, '../backup');
const date = new Date().toISOString().split('T')[0];
const backupPath = path.join(backupDir, date);

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const command = `"C:\\Program Files\\MongoDB\\Tools\\100\\bin\\mongodump.exe" --uri="${process.env.MONGO_URI}" --out="${backupPath}"`;

console.log('🔄 Tworzenie backupu...');
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Błąd backupu:', error);
    return;
  }
  console.log('✅ Backup utworzony:', date);
  
  // Rotacja - usuń backupy starsze niż 30 dni
  const now = Date.now();
  const days30 = 30 * 24 * 60 * 60 * 1000;
  
  fs.readdir(backupDir, (err, files) => {
    if (err) return;
    
    files.forEach(file => {
      const filePath = path.join(backupDir, file);
      fs.stat(filePath, (err, stat) => {
        if (!err && now - stat.mtimeMs > days30) {
          fs.rmSync(filePath, { recursive: true, force: true });
          console.log('🗑️ Usunięto stary backup:', file);
        }
      });
    });
  });
});

module.exports = { performBackup: () => {} };