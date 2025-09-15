const fs = require('fs');
const path = require('path');

// Copy the SQLite database file as backup
const sourceDb = path.join(__dirname, 'prisma', 'dev.db');
const backupDb = path.join(__dirname, 'database_backup.db');

try {
  // Check if source database exists
  if (fs.existsSync(sourceDb)) {
    // Copy the database file
    fs.copyFileSync(sourceDb, backupDb);
    console.log('Database backup created successfully: database_backup.db');
  } else {
    console.error('Source database not found:', sourceDb);
  }
} catch (error) {
  console.error('Error creating backup:', error.message);
}