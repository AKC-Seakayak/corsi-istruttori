// server.js - Backend completo per Kayak Instructor App
// Aggiungi questa riga dopo le importazioni
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// E modifica la riga del database da:
// const db = new sqlite3.Database('./kayak.db', ...)
// a:
const db = new sqlite3.Database(path.join(__dirname, 'kayak.db'), (err) => {
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const JWT_SECRET = 'kayak-instructor-secret-key-2024';
const PORT = 3000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(__dirname));

// Database setup
const db = new sqlite3.Database('./kayak.db', (err) => {
  if (err) {
    console.error('Database error:', err);
  } else {
    console.log('📁 Database: kayak.db');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    fullName TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Students table
  db.run(`CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    address TEXT,
    birthDate DATETIME NOT NULL,
    medicalCert INTEGER DEFAULT 0,
    blsdCert INTEGER DEFAULT 0,
    otherCerts TEXT DEFAULT '',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedBy TEXT NOT NULL,
    FOREIGN KEY (updatedBy) REFERENCES users(id)
  )`);

  // Evaluations table
  db.run(`CREATE TABLE IF NOT EXISTS evaluations (
    id TEXT PRIMARY KEY,
    studentId TEXT NOT NULL,
    skillName TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    notes TEXT DEFAULT '',
    lastUpdated DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedBy TEXT NOT NULL,
    FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (updatedBy) REFERENCES users(id),
    UNIQUE(studentId, skillName)
  )`);

  // Create default admin user
  const adminId = 'admin_001';
  db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, user) => {
    if (!err && !user) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.run(`INSERT INTO users (id, username, password, fullName) 
              VALUES (?, ?, ?, ?)`, 
              [adminId, 'admin', hashedPassword, 'Amministratore']);
      console.log('👤 Admin user created: admin');
      console.log('🔐 Password: admin123');
    }
  });

  console.log('✅ Database initialized');
}

// Helper functions
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, fullName: user.fullName },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function authenticate(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ============= API ROUTES =============

// Auth routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const isValid = bcrypt.compareSync(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = generateToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    
    res.json({
      user: { id: user.id, username: user.username, fullName: user.fullName },
      token
    });
  });
});

app.post('/api/auth/change-password', authenticate, (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;
  
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const isValid = bcrypt.compareSync(oldPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.run('UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', 
           [hashedPassword, userId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Password change failed' });
      }
      res.json({ message: 'Password updated successfully' });
    });
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Student routes
app.get('/api/students', authenticate, (req, res) => {
  const { search } = req.query;
  let query = `SELECT s.*, u.fullName as updatedByName 
               FROM students s 
               LEFT JOIN users u ON s.updatedBy = u.id`;
  let params = [];
  
  if (search) {
    query += ` WHERE s.firstName LIKE ? OR s.lastName LIKE ?`;
    params = [`%${search}%`, `%${search}%`];
  }
  
  query += ` ORDER BY s.lastName ASC`;
  
  db.all(query, params, (err, students) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch students' });
    }
    res.json(students);
  });
});

app.get('/api/students/:id', authenticate, (req, res) => {
  const { id } = req.params;
  
  db.get(`SELECT s.*, u.fullName as updatedByName 
          FROM students s 
          LEFT JOIN users u ON s.updatedBy = u.id 
          WHERE s.id = ?`, [id], (err, student) => {
    if (err || !student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
  });
});

app.post('/api/students', authenticate, (req, res) => {
  const { firstName, lastName, address, birthDate, medicalCert, blsdCert, otherCerts } = req.body;
  const id = `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  db.run(`INSERT INTO students (id, firstName, lastName, address, birthDate, medicalCert, blsdCert, otherCerts, updatedBy)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, firstName, lastName, address, birthDate, medicalCert ? 1 : 0, blsdCert ? 1 : 0, otherCerts || '', req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create student' });
      }
      res.status(201).json({ id, ...req.body });
    });
});

app.put('/api/students/:id', authenticate, (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, address, birthDate, medicalCert, blsdCert, otherCerts } = req.body;
  
  db.run(`UPDATE students 
          SET firstName = ?, lastName = ?, address = ?, birthDate = ?, 
              medicalCert = ?, blsdCert = ?, otherCerts = ?, 
              updatedBy = ?, updatedAt = CURRENT_TIMESTAMP
          WHERE id = ?`,
          [firstName, lastName, address, birthDate, medicalCert ? 1 : 0, blsdCert ? 1 : 0, otherCerts || '', req.user.id, id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update student' });
      }
      res.json({ message: 'Student updated successfully' });
    });
});

app.delete('/api/students/:id', authenticate, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM students WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete student' });
    }
    res.json({ message: 'Student deleted successfully' });
  });
});

// Evaluation routes
app.get('/api/students/:id/evaluations', authenticate, (req, res) => {
  const { id } = req.params;
  
  db.all(`SELECT e.*, u.fullName as updatedByName 
          FROM evaluations e 
          LEFT JOIN users u ON e.updatedBy = u.id 
          WHERE e.studentId = ?`, [id], (err, evaluations) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch evaluations' });
    }
    res.json(evaluations);
  });
});

app.put('/api/students/:id/evaluations/:skillName', authenticate, (req, res) => {
  const { id, skillName } = req.params;
  const { score, notes } = req.body;
  const evalId = `eval_${id}_${skillName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  db.run(`INSERT INTO evaluations (id, studentId, skillName, score, notes, updatedBy, lastUpdated)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(studentId, skillName) DO UPDATE SET
          score = excluded.score,
          notes = excluded.notes,
          updatedBy = excluded.updatedBy,
          lastUpdated = CURRENT_TIMESTAMP`,
          [evalId, id, skillName, score, notes, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update evaluation' });
      }
      res.json({ message: 'Evaluation updated successfully' });
    });
});

app.post('/api/students/:id/evaluations/batch', authenticate, (req, res) => {
  const { id } = req.params;
  const { evaluations } = req.body;
  
  const stmt = db.prepare(`INSERT INTO evaluations (id, studentId, skillName, score, notes, updatedBy, lastUpdated)
                           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                           ON CONFLICT(studentId, skillName) DO UPDATE SET
                           score = excluded.score,
                           notes = excluded.notes,
                           updatedBy = excluded.updatedBy,
                           lastUpdated = CURRENT_TIMESTAMP`);
  
  let success = true;
  for (const eval_ of evaluations) {
    const evalId = `eval_${id}_${eval_.skillName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    stmt.run([evalId, id, eval_.skillName, eval_.score, eval_.notes, req.user.id], (err) => {
      if (err) success = false;
    });
  }
  
  stmt.finalize();
  
  if (success) {
    res.json({ message: 'Evaluations updated successfully' });
  } else {
    res.status(500).json({ error: 'Failed to update some evaluations' });
  }
});

// Sync endpoint
app.post('/api/sync', authenticate, (req, res) => {
  const { students, evaluations } = req.body;
  
  db.serialize(() => {
    const syncStudent = db.prepare(`INSERT OR REPLACE INTO students 
                                    (id, firstName, lastName, address, birthDate, medicalCert, blsdCert, otherCerts, updatedBy, updatedAt)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`);
    
    for (const student of students) {
      syncStudent.run([student.id, student.firstName, student.lastName, student.address, 
                      student.birthDate, student.medicalCert ? 1 : 0, student.blsdCert ? 1 : 0, 
                      student.otherCerts || '', req.user.id]);
    }
    syncStudent.finalize();
    
    const syncEval = db.prepare(`INSERT OR REPLACE INTO evaluations 
                                 (id, studentId, skillName, score, notes, updatedBy, lastUpdated)
                                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`);
    
    for (const eval_ of evaluations) {
      const evalId = `eval_${eval_.studentId}_${eval_.skillName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      syncEval.run([evalId, eval_.studentId, eval_.skillName, eval_.score, eval_.notes, req.user.id]);
    }
    syncEval.finalize();
    
    res.json({ message: 'Sync completed successfully' });
  });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Access from other devices: http://YOUR_IP:${PORT}\n`);
});
