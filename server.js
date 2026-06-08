#!/usr/bin/env node
/**
 * OIOS Studio — Production Express API & Static Server
 */

const express = require('express');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const crypto = require('crypto');

const app = express();
app.use(express.json({ limit: '50mb' }));

const port = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

const SALT = 'oios_studio_salt_12345';
const EXPECTED_PASSWORD = process.env.ACCESS_PASSWORD || 'oios2026';
const EXPECTED_TOKEN = crypto.createHash('sha256').update(EXPECTED_PASSWORD + SALT).digest('hex');

function getCookie(req, name) {
  if (!req.headers.cookie) return null;
  const value = `; ${req.headers.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function checkAuth(req, res, next) {
  // Block direct endpoints that don't match public, login, or studio prefix
  if (
    req.path.startsWith('/api/') && 
    !req.path.startsWith('/api/studio/') && 
    !req.path.startsWith('/api/public/') && 
    req.path !== '/api/login' && 
    req.path !== '/api/logout'
  ) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }

  // Allow login page, public APIs, favicon, and public landing/discovery paths without authentication
  const isPublicApi = req.path.startsWith('/api/public/');
  const isPublicAsset = req.path.startsWith('/css/') || req.path.startsWith('/js/public/') || req.path === '/favicon.ico';
  const isPublicPage = req.path === '/' || req.path === '/discovery' || req.path === '/login.html';
  const isLoginApi = req.path === '/api/login';

  if (isPublicApi || isPublicAsset || isPublicPage || isLoginApi) {
    return next();
  }
  
  const token = getCookie(req, 'session_token');
  if (token === EXPECTED_TOKEN) {
    return next();
  }
  
  // If not authenticated:
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized. Please login.' });
  }
  
  // Redirect to login page
  res.redirect('/login.html');
}

// Serve public static assets first (so they bypass checkAuth)
app.use(express.static(path.join(__dirname, 'public')));

// Apply checkAuth for everything below this line
app.use(checkAuth);

// API URL rewrite middleware: rewrites /api/studio/* to /api/* internally
app.use((req, res, next) => {
  if (req.url.startsWith('/api/studio/')) {
    req.url = req.url.replace('/api/studio/', '/api/');
  }
  next();
});

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === EXPECTED_PASSWORD) {
    res.setHeader('Set-Cookie', `session_token=${EXPECTED_TOKEN}; Path=/; HttpOnly; Max-Age=2592000; SameSite=Strict`);
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Incorrect password. Please try again.' });
  }
});

app.post('/api/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'session_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Strict');
  res.json({ success: true });
});

// --- PUBLIC API ENDPOINTS ---

// Helper to validate discovery token
function getDiscoveryCompanyId(req) {
  const token = getCookie(req, 'discovery_token');
  if (!token) return null;
  
  const companyId = req.body.companyId || req.query.companyId;
  if (!companyId) return null;
  
  const expectedToken = crypto.createHash('sha256').update(companyId + SALT).digest('hex');
  if (token === expectedToken) {
    return companyId;
  }
  return null;
}

// 1. Start client discovery session
app.post('/api/public/discovery/start', async (req, res) => {
  const { name, industry, description, website, contactName, contactEmail } = req.body;
  if (!name || !industry) {
    return res.status(400).json({ error: 'Company name and industry are required.' });
  }

  const companyId = 'comp_disc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const newCompany = {
    id: companyId,
    name,
    industry,
    status: 'active',
    stage: 'Discovery',
    createdAt: new Date().toISOString(),
    description: description || '',
    website: website || '',
    contactName: contactName || '',
    contactEmail: contactEmail || '',
    assessment: {
      businessGoals: '',
      coreProblems: '',
      operationalBottlenecks: '',
      techStack: ''
    },
    discoveryIntake: {
      answers: []
    }
  };

  if (usePostgres) {
    try {
      await pool.query(
        `INSERT INTO companies (id, name, industry, status, stage, "createdAt", description, website, "contactName", "contactEmail", assessment, "discoveryIntake")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          newCompany.id,
          newCompany.name,
          newCompany.industry,
          newCompany.status,
          newCompany.stage,
          newCompany.createdAt,
          newCompany.description,
          newCompany.website,
          newCompany.contactName,
          newCompany.contactEmail,
          JSON.stringify(newCompany.assessment),
          JSON.stringify(newCompany.discoveryIntake)
        ]
      );
      
      const discoveryToken = crypto.createHash('sha256').update(companyId + SALT).digest('hex');
      res.setHeader('Set-Cookie', `discovery_token=${discoveryToken}; Path=/; HttpOnly; Max-Age=86400; SameSite=Strict`);
      res.json({ success: true, companyId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    try {
      const dbData = readLocalDb();
      dbData.companies.push(newCompany);
      writeLocalDb(dbData);
      
      const discoveryToken = crypto.createHash('sha256').update(companyId + SALT).digest('hex');
      res.setHeader('Set-Cookie', `discovery_token=${discoveryToken}; Path=/; HttpOnly; Max-Age=86400; SameSite=Strict`);
      res.json({ success: true, companyId });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
});

// 2. Submit discovery answers
app.post('/api/public/discovery/submit', async (req, res) => {
  const companyId = getDiscoveryCompanyId(req);
  if (!companyId) {
    return res.status(403).json({ error: 'Unauthorized discovery session.' });
  }

  const { answers } = req.body;
  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ error: 'Answers array is required.' });
  }

  if (usePostgres) {
    try {
      const client = await pool.connect();
      await client.query('BEGIN');

      const discoveryIntake = { answers };
      await client.query(
        `UPDATE companies SET "discoveryIntake" = $1 WHERE id = $2`,
        [JSON.stringify(discoveryIntake), companyId]
      );

      for (const ans of answers) {
        const noteId = 'note_disc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        const timestamp = new Date().toISOString();
        await client.query(
          `INSERT INTO "discoveryNotes" (id, "companyId", title, content, date, category, source, "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            noteId,
            companyId,
            ans.questionTitle || 'Discovery Answer',
            ans.answerText || '',
            timestamp.split('T')[0],
            'intake',
            'client_discovery',
            timestamp
          ]
        );
      }

      await client.query('COMMIT');
      client.release();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    try {
      const dbData = readLocalDb();
      const compIdx = dbData.companies.findIndex(c => c.id === companyId);
      if (compIdx === -1) {
        return res.status(404).json({ error: 'Company not found.' });
      }

      dbData.companies[compIdx].discoveryIntake = { answers };

      const timestamp = new Date().toISOString();
      for (const ans of answers) {
        dbData.discoveryNotes.push({
          id: 'note_disc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          companyId,
          title: ans.questionTitle || 'Discovery Answer',
          content: ans.answerText || '',
          date: timestamp.split('T')[0],
          category: 'intake',
          source: 'client_discovery',
          createdAt: timestamp
        });
      }

      writeLocalDb(dbData);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
});

// 3. Public logging endpoint
app.post('/api/public/logs', async (req, res) => {
  const { level, message, stack, context } = req.body;
  if (!level || !message) {
    return res.status(400).json({ error: 'Level and message are required' });
  }
  try {
    await writeLog(level, message, stack || '', typeof context === 'object' ? JSON.stringify(context) : (context || ''));
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Status endpoint (identifies database connection mode)
app.get('/api/status', (req, res) => {
  res.json({ postgres: usePostgres });
});

// Initialize database connection
let pool = null;
const usePostgres = !!process.env.DATABASE_URL;

if (usePostgres) {
  console.log('Connecting to PostgreSQL database...');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
} else {
  console.log('No DATABASE_URL environment variable found. Falling back to local file-based database (db.json)...');
}

// Initialize database schema (PostgreSQL) or create local file (fallback)
async function initDatabase() {
  if (usePostgres) {
    try {
      const client = await pool.connect();
      
      // Create tables using camelCase columns in double quotes
      await client.query(`
        CREATE TABLE IF NOT EXISTS companies (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          industry TEXT NOT NULL,
          status TEXT NOT NULL,
          stage TEXT NOT NULL,
          "createdAt" TEXT,
          description TEXT,
          website TEXT,
          "contactName" TEXT,
          "contactEmail" TEXT,
          assessment JSONB,
          "discoveryIntake" JSONB
        );

        CREATE TABLE IF NOT EXISTS "discoveryNotes" (
          id TEXT PRIMARY KEY,
          "companyId" TEXT REFERENCES companies(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          content TEXT,
          date TEXT,
          category TEXT,
          source TEXT,
          "generatedNoteType" TEXT,
          "generatedFrom" TEXT,
          "createdAt" TEXT
        );

        CREATE TABLE IF NOT EXISTS insights (
          id TEXT PRIMARY KEY,
          "companyId" TEXT REFERENCES companies(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          "sourceNotes" JSONB,
          impact TEXT,
          category TEXT,
          "evidenceConfidence" INTEGER
        );

        CREATE TABLE IF NOT EXISTS "systemIdeas" (
          id TEXT PRIMARY KEY,
          "companyId" TEXT REFERENCES companies(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          "linkedInsights" JSONB,
          priority TEXT,
          feasibility TEXT,
          status TEXT
        );

        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          "companyId" TEXT REFERENCES companies(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          "linkedSystemIdeas" JSONB,
          status TEXT,
          "startDate" TEXT,
          "endDate" TEXT,
          progress INTEGER,
          milestones JSONB,
          "activityLog" JSONB
        );

        CREATE TABLE IF NOT EXISTS reports (
          id TEXT PRIMARY KEY,
          "companyId" TEXT REFERENCES companies(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          summary TEXT,
          content TEXT,
          "createdAt" TEXT,
          status TEXT
        );

        CREATE TABLE IF NOT EXISTS "nextActions" (
          id TEXT PRIMARY KEY,
          text TEXT NOT NULL,
          completed BOOLEAN NOT NULL DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS logs (
          id SERIAL PRIMARY KEY,
          timestamp TEXT NOT NULL,
          level TEXT NOT NULL,
          message TEXT NOT NULL,
          stack TEXT,
          context TEXT
        );
      `);
      
      client.release();
      console.log('PostgreSQL database schema initialized successfully.');
    } catch (err) {
      console.error('Failed to initialize PostgreSQL database:', err.message);
      process.exit(1);
    }
  } else {
    // Local file initialization
    if (!fs.existsSync(DB_FILE)) {
      const emptyDb = {
        companies: [],
        discoveryNotes: [],
        insights: [],
        systemIdeas: [],
        projects: [],
        reports: [],
        nextActions: [],
        logs: []
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(emptyDb, null, 2), 'utf8');
      console.log('Local db.json file initialized.');
    }
  }
}

// Helper: read local DB file
function readLocalDb() {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!data.logs) data.logs = [];
    return data;
  } catch (e) {
    return { companies: [], discoveryNotes: [], insights: [], systemIdeas: [], projects: [], reports: [], nextActions: [], logs: [] };
  }
}

// Helper: write local DB file
function writeLocalDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Helper: write log entry to DB
async function writeLog(level, message, stack = '', context = '') {
  const timestamp = new Date().toISOString();
  if (usePostgres) {
    try {
      await pool.query(
        `INSERT INTO logs (timestamp, level, message, stack, context) VALUES ($1, $2, $3, $4, $5)`,
        [timestamp, level, message, stack, context]
      );
    } catch (err) {
      console.error('Failed to write log to Postgres:', err.message);
    }
  } else {
    try {
      const dbData = readLocalDb();
      dbData.logs.push({
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp,
        level,
        message,
        stack,
        context
      });
      // Cap at 100 entries
      if (dbData.logs.length > 100) {
        dbData.logs = dbData.logs.slice(-100);
      }
      writeLocalDb(dbData);
    } catch (err) {
      console.error('Failed to write log to local file:', err.message);
    }
  }
}


// --- REST API ENDPOINTS ---

// 1. Get entire database state
app.get('/api/state', async (req, res) => {
  if (usePostgres) {
    try {
      const client = await pool.connect();
      
      const compRes = await client.query('SELECT * FROM companies');
      const noteRes = await client.query('SELECT * FROM "discoveryNotes"');
      const insRes = await client.query('SELECT * FROM insights');
      const ideaRes = await client.query('SELECT * FROM "systemIdeas"');
      const projRes = await client.query('SELECT * FROM projects');
      const repRes = await client.query('SELECT * FROM reports');
      const actRes = await client.query('SELECT * FROM "nextActions"');
      
      client.release();
      
      res.json({
        companies: compRes.rows,
        discoveryNotes: noteRes.rows,
        insights: insRes.rows,
        systemIdeas: ideaRes.rows,
        projects: projRes.rows,
        reports: repRes.rows,
        nextActions: actRes.rows
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.json(readLocalDb());
  }
});

// 2. Migrate / Overwrite entire state
app.post('/api/state/migrate', async (req, res) => {
  const data = req.body;
  if (usePostgres) {
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      
      // Wipe existing tables in reverse order of foreign keys
      await client.query('DELETE FROM "nextActions"');
      await client.query('DELETE FROM reports');
      await client.query('DELETE FROM projects');
      await client.query('DELETE FROM "systemIdeas"');
      await client.query('DELETE FROM insights');
      await client.query('DELETE FROM "discoveryNotes"');
      await client.query('DELETE FROM companies');

      // Insert companies
      if (data.companies && data.companies.length > 0) {
        for (const c of data.companies) {
          await client.query(
            `INSERT INTO companies (id, name, industry, status, stage, "createdAt", description, website, "contactName", "contactEmail", assessment, "discoveryIntake")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [c.id, c.name, c.industry, c.status, c.stage, c.createdAt, c.description, c.website, c.contactName, c.contactEmail, JSON.stringify(c.assessment), JSON.stringify(c.discoveryIntake)]
          );
        }
      }

      // Insert notes
      if (data.discoveryNotes && data.discoveryNotes.length > 0) {
        for (const n of data.discoveryNotes) {
          await client.query(
            `INSERT INTO "discoveryNotes" (id, "companyId", title, content, date, category, source, "generatedNoteType", "generatedFrom", "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [n.id, n.companyId, n.title, n.content, n.date, n.category, n.source, n.generatedNoteType, n.generatedFrom, n.createdAt]
          );
        }
      }

      // Insert insights
      if (data.insights && data.insights.length > 0) {
        for (const i of data.insights) {
          await client.query(
            `INSERT INTO insights (id, "companyId", title, description, "sourceNotes", impact, category, "evidenceConfidence")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [i.id, i.companyId, i.title, i.description, JSON.stringify(i.sourceNotes), i.impact, i.category, i.evidenceConfidence]
          );
        }
      }

      // Insert system ideas
      if (data.systemIdeas && data.systemIdeas.length > 0) {
        for (const s of data.systemIdeas) {
          await client.query(
            `INSERT INTO "systemIdeas" (id, "companyId", title, description, "linkedInsights", priority, feasibility, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [s.id, s.companyId, s.title, s.description, JSON.stringify(s.linkedInsights), s.priority, s.feasibility, s.status]
          );
        }
      }

      // Insert projects
      if (data.projects && data.projects.length > 0) {
        for (const p of data.projects) {
          await client.query(
            `INSERT INTO projects (id, "companyId", title, description, "linkedSystemIdeas", status, "startDate", "endDate", progress, milestones, "activityLog")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [p.id, p.companyId, p.title, p.description, JSON.stringify(p.linkedSystemIdeas), p.status, p.startDate, p.endDate, p.progress, JSON.stringify(p.milestones), JSON.stringify(p.activityLog)]
          );
        }
      }

      // Insert reports
      if (data.reports && data.reports.length > 0) {
        for (const r of data.reports) {
          await client.query(
            `INSERT INTO reports (id, "companyId", title, summary, content, "createdAt", status)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [r.id, r.companyId, r.title, r.summary, r.content, r.createdAt, r.status]
          );
        }
      }

      // Insert nextActions
      if (data.nextActions && data.nextActions.length > 0) {
        for (const a of data.nextActions) {
          await client.query(
            `INSERT INTO "nextActions" (id, text, completed)
             VALUES ($1, $2, $3)`,
            [a.id, a.text, a.completed]
          );
        }
      }

      await client.query('COMMIT');
      client.release();
      res.json({ success: true, message: 'Database state migrated successfully.' });
    } catch (err) {
      if (client) await client.query('ROLLBACK');
      if (client) client.release();
      res.status(500).json({ error: err.message });
    }
  } else {
    writeLocalDb(data);
    res.json({ success: true, message: 'Local database state migrated successfully.' });
  }
});

// 3. CRUD: Companies
app.post('/api/companies', async (req, res) => {
  const c = req.body;
  if (usePostgres) {
    try {
      await pool.query(
        `INSERT INTO companies (id, name, industry, status, stage, "createdAt", description, website, "contactName", "contactEmail", assessment, "discoveryIntake")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [c.id, c.name, c.industry, c.status, c.stage, c.createdAt, c.description, c.website, c.contactName, c.contactEmail, JSON.stringify(c.assessment), JSON.stringify(c.discoveryIntake)]
      );
      res.status(201).json(c);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    dbData.companies.push(c);
    writeLocalDb(dbData);
    res.status(201).json(c);
  }
});

app.put('/api/companies/:id', async (req, res) => {
  const { id } = req.params;
  const c = req.body;
  if (usePostgres) {
    try {
      await pool.query(
        `UPDATE companies 
         SET name=$1, industry=$2, status=$3, stage=$4, "createdAt"=$5, description=$6, website=$7, "contactName"=$8, "contactEmail"=$9, assessment=$10, "discoveryIntake"=$11
         WHERE id=$12`,
        [c.name, c.industry, c.status, c.stage, c.createdAt, c.description, c.website, c.contactName, c.contactEmail, JSON.stringify(c.assessment), JSON.stringify(c.discoveryIntake), id]
      );
      res.json(c);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    const idx = dbData.companies.findIndex(x => x.id === id);
    if (idx !== -1) {
      dbData.companies[idx] = { ...dbData.companies[idx], ...c };
      writeLocalDb(dbData);
      res.json(dbData.companies[idx]);
    } else {
      res.status(404).json({ error: 'Company not found' });
    }
  }
});

app.delete('/api/companies/:id', async (req, res) => {
  const { id } = req.params;
  if (usePostgres) {
    try {
      await pool.query('DELETE FROM companies WHERE id=$1', [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    dbData.companies = dbData.companies.filter(x => x.id !== id);
    dbData.discoveryNotes = dbData.discoveryNotes.filter(x => x.companyId !== id);
    dbData.insights = dbData.insights.filter(x => x.companyId !== id);
    dbData.systemIdeas = dbData.systemIdeas.filter(x => x.companyId !== id);
    dbData.projects = dbData.projects.filter(x => x.companyId !== id);
    dbData.reports = dbData.reports.filter(x => x.companyId !== id);
    writeLocalDb(dbData);
    res.json({ success: true });
  }
});

// 4. CRUD: Discovery Notes
app.post('/api/discoveryNotes', async (req, res) => {
  const n = req.body;
  if (usePostgres) {
    try {
      await pool.query(
        `INSERT INTO "discoveryNotes" (id, "companyId", title, content, date, category, source, "generatedNoteType", "generatedFrom", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [n.id, n.companyId, n.title, n.content, n.date, n.category, n.source, n.generatedNoteType, n.generatedFrom, n.createdAt]
      );
      res.status(201).json(n);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    dbData.discoveryNotes.push(n);
    writeLocalDb(dbData);
    res.status(201).json(n);
  }
});

app.put('/api/discoveryNotes/:id', async (req, res) => {
  const { id } = req.params;
  const n = req.body;
  if (usePostgres) {
    try {
      await pool.query(
        `UPDATE "discoveryNotes" 
         SET "companyId"=$1, title=$2, content=$3, date=$4, category=$5, source=$6, "generatedNoteType"=$7, "generatedFrom"=$8, "createdAt"=$9
         WHERE id=$10`,
        [n.companyId, n.title, n.content, n.date, n.category, n.source, n.generatedNoteType, n.generatedFrom, n.createdAt, id]
      );
      res.json(n);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    const idx = dbData.discoveryNotes.findIndex(x => x.id === id);
    if (idx !== -1) {
      dbData.discoveryNotes[idx] = { ...dbData.discoveryNotes[idx], ...n };
      writeLocalDb(dbData);
      res.json(dbData.discoveryNotes[idx]);
    } else {
      res.status(404).json({ error: 'Note not found' });
    }
  }
});

app.delete('/api/discoveryNotes/:id', async (req, res) => {
  const { id } = req.params;
  if (usePostgres) {
    try {
      await pool.query('DELETE FROM "discoveryNotes" WHERE id=$1', [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    dbData.discoveryNotes = dbData.discoveryNotes.filter(x => x.id !== id);
    writeLocalDb(dbData);
    res.json({ success: true });
  }
});

// 5. CRUD: Insights
app.post('/api/insights', async (req, res) => {
  const i = req.body;
  if (usePostgres) {
    try {
      await pool.query(
        `INSERT INTO insights (id, "companyId", title, description, "sourceNotes", impact, category, "evidenceConfidence")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [i.id, i.companyId, i.title, i.description, JSON.stringify(i.sourceNotes), i.impact, i.category, i.evidenceConfidence]
      );
      res.status(201).json(i);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    dbData.insights.push(i);
    writeLocalDb(dbData);
    res.status(201).json(i);
  }
});

app.put('/api/insights/:id', async (req, res) => {
  const { id } = req.params;
  const i = req.body;
  if (usePostgres) {
    try {
      await pool.query(
        `UPDATE insights 
         SET "companyId"=$1, title=$2, description=$3, "sourceNotes"=$4, impact=$5, category=$6, "evidenceConfidence"=$7
         WHERE id=$8`,
        [i.companyId, i.title, i.description, JSON.stringify(i.sourceNotes), i.impact, i.category, i.evidenceConfidence, id]
      );
      res.json(i);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    const idx = dbData.insights.findIndex(x => x.id === id);
    if (idx !== -1) {
      dbData.insights[idx] = { ...dbData.insights[idx], ...i };
      writeLocalDb(dbData);
      res.json(dbData.insights[idx]);
    } else {
      res.status(404).json({ error: 'Insight not found' });
    }
  }
});

app.delete('/api/insights/:id', async (req, res) => {
  const { id } = req.params;
  if (usePostgres) {
    try {
      await pool.query('DELETE FROM insights WHERE id=$1', [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    dbData.insights = dbData.insights.filter(x => x.id !== id);
    writeLocalDb(dbData);
    res.json({ success: true });
  }
});

// 6. CRUD: System Ideas
app.post('/api/systemIdeas', async (req, res) => {
  const s = req.body;
  if (usePostgres) {
    try {
      await pool.query(
        `INSERT INTO "systemIdeas" (id, "companyId", title, description, "linkedInsights", priority, feasibility, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [s.id, s.companyId, s.title, s.description, JSON.stringify(s.linkedInsights), s.priority, s.feasibility, s.status]
      );
      res.status(201).json(s);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    dbData.systemIdeas.push(s);
    writeLocalDb(dbData);
    res.status(201).json(s);
  }
});

app.put('/api/systemIdeas/:id', async (req, res) => {
  const { id } = req.params;
  const s = req.body;
  if (usePostgres) {
    try {
      await pool.query(
        `UPDATE "systemIdeas" 
         SET "companyId"=$1, title=$2, description=$3, "linkedInsights"=$4, priority=$5, feasibility=$6, status=$7
         WHERE id=$8`,
        [s.companyId, s.title, s.description, JSON.stringify(s.linkedInsights), s.priority, s.feasibility, s.status, id]
      );
      res.json(s);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    const idx = dbData.systemIdeas.findIndex(x => x.id === id);
    if (idx !== -1) {
      dbData.systemIdeas[idx] = { ...dbData.systemIdeas[idx], ...s };
      writeLocalDb(dbData);
      res.json(dbData.systemIdeas[idx]);
    } else {
      res.status(404).json({ error: 'System Idea not found' });
    }
  }
});

app.delete('/api/systemIdeas/:id', async (req, res) => {
  const { id } = req.params;
  if (usePostgres) {
    try {
      await pool.query('DELETE FROM "systemIdeas" WHERE id=$1', [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    dbData.systemIdeas = dbData.systemIdeas.filter(x => x.id !== id);
    writeLocalDb(dbData);
    res.json({ success: true });
  }
});

// 7. CRUD: Projects
app.post('/api/projects', async (req, res) => {
  const p = req.body;
  if (usePostgres) {
    try {
      await pool.query(
        `INSERT INTO projects (id, "companyId", title, description, "linkedSystemIdeas", status, "startDate", "endDate", progress, milestones, "activityLog")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [p.id, p.companyId, p.title, p.description, JSON.stringify(p.linkedSystemIdeas), p.status, p.startDate, p.endDate, p.progress, JSON.stringify(p.milestones), JSON.stringify(p.activityLog)]
      );
      res.status(201).json(p);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    dbData.projects.push(p);
    writeLocalDb(dbData);
    res.status(201).json(p);
  }
});

app.put('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  const p = req.body;
  if (usePostgres) {
    try {
      await pool.query(
        `UPDATE projects 
         SET "companyId"=$1, title=$2, description=$3, "linkedSystemIdeas"=$4, status=$5, "startDate"=$6, "endDate"=$7, progress=$8, milestones=$9, "activityLog"=$10
         WHERE id=$11`,
        [p.companyId, p.title, p.description, JSON.stringify(p.linkedSystemIdeas), p.status, p.startDate, p.endDate, p.progress, JSON.stringify(p.milestones), JSON.stringify(p.activityLog), id]
      );
      res.json(p);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    const idx = dbData.projects.findIndex(x => x.id === id);
    if (idx !== -1) {
      dbData.projects[idx] = { ...dbData.projects[idx], ...p };
      writeLocalDb(dbData);
      res.json(dbData.projects[idx]);
    } else {
      res.status(404).json({ error: 'Project not found' });
    }
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  if (usePostgres) {
    try {
      await pool.query('DELETE FROM projects WHERE id=$1', [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    dbData.projects = dbData.projects.filter(x => x.id !== id);
    writeLocalDb(dbData);
    res.json({ success: true });
  }
});

// 8. CRUD: Reports
app.post('/api/reports', async (req, res) => {
  const r = req.body;
  if (usePostgres) {
    try {
      await pool.query(
        `INSERT INTO reports (id, "companyId", title, summary, content, "createdAt", status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [r.id, r.companyId, r.title, r.summary, r.content, r.createdAt, r.status]
      );
      res.status(201).json(r);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    dbData.reports.push(r);
    writeLocalDb(dbData);
    res.status(201).json(r);
  }
});

app.put('/api/reports/:id', async (req, res) => {
  const { id } = req.params;
  const r = req.body;
  if (usePostgres) {
    try {
      await pool.query(
        `UPDATE reports 
         SET "companyId"=$1, title=$2, summary=$3, content=$4, "createdAt"=$5, status=$6
         WHERE id=$7`,
        [r.companyId, r.title, r.summary, r.content, r.createdAt, r.status, id]
      );
      res.json(r);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    const idx = dbData.reports.findIndex(x => x.id === id);
    if (idx !== -1) {
      dbData.reports[idx] = { ...dbData.reports[idx], ...r };
      writeLocalDb(dbData);
      res.json(dbData.reports[idx]);
    } else {
      res.status(404).json({ error: 'Report not found' });
    }
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  const { id } = req.params;
  if (usePostgres) {
    try {
      await pool.query('DELETE FROM reports WHERE id=$1', [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    dbData.reports = dbData.reports.filter(x => x.id !== id);
    writeLocalDb(dbData);
    res.json({ success: true });
  }
});

// 9. CRUD: Next Actions
app.post('/api/nextActions', async (req, res) => {
  const a = req.body;
  if (usePostgres) {
    try {
      await pool.query(
        `INSERT INTO "nextActions" (id, text, completed)
         VALUES ($1, $2, $3)`,
        [a.id, a.text, a.completed]
      );
      res.status(201).json(a);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    dbData.nextActions.push(a);
    writeLocalDb(dbData);
    res.status(201).json(a);
  }
});

app.put('/api/nextActions/:id', async (req, res) => {
  const { id } = req.params;
  const a = req.body;
  if (usePostgres) {
    try {
      await pool.query(
        `UPDATE "nextActions" 
         SET text=$1, completed=$2
         WHERE id=$3`,
        [a.text, a.completed, id]
      );
      res.json(a);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    const idx = dbData.nextActions.findIndex(x => x.id === id);
    if (idx !== -1) {
      dbData.nextActions[idx] = { ...dbData.nextActions[idx], ...a };
      writeLocalDb(dbData);
      res.json(dbData.nextActions[idx]);
    } else {
      res.status(404).json({ error: 'Action item not found' });
    }
  }
});

app.delete('/api/nextActions/:id', async (req, res) => {
  const { id } = req.params;
  if (usePostgres) {
    try {
      await pool.query('DELETE FROM "nextActions" WHERE id=$1', [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const dbData = readLocalDb();
    dbData.nextActions = dbData.nextActions.filter(x => x.id !== id);
    writeLocalDb(dbData);
    res.json({ success: true });
  }
});

// --- LOGS API ENDPOINTS ---

// 1. Get recent logs (latest 100 entries)
app.get('/api/logs', async (req, res) => {
  if (usePostgres) {
    try {
      const result = await pool.query('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 100');
      res.json(result.rows);
    } catch (err) {
      await writeLog('error', 'Failed to fetch logs from Postgres: ' + err.message, err.stack);
      res.status(500).json({ error: err.message });
    }
  } else {
    try {
      const dbData = readLocalDb();
      const logs = [...dbData.logs].reverse().slice(0, 100);
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
});

// 2. Post a new log entry (from client-side)
app.post('/api/logs', async (req, res) => {
  const { level, message, stack, context } = req.body;
  if (!level || !message) {
    return res.status(400).json({ error: 'Level and message are required' });
  }
  try {
    await writeLog(level, message, stack || '', typeof context === 'object' ? JSON.stringify(context) : (context || ''));
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Clear all logs
app.delete('/api/logs', async (req, res) => {
  if (usePostgres) {
    try {
      await pool.query('DELETE FROM logs');
      await writeLog('info', 'Database logs cleared by user');
      res.json({ success: true });
    } catch (err) {
      await writeLog('error', 'Failed to clear logs: ' + err.message, err.stack);
      res.status(500).json({ error: err.message });
    }
  } else {
    try {
      const dbData = readLocalDb();
      dbData.logs = [];
      writeLocalDb(dbData);
      // We don't log "cleared" locally since it would immediately re-populate the logs
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
});



// Serve OIOS Studio static assets (protected by checkAuth which runs globally above)
app.use('/studio', express.static(path.join(__dirname, 'studio')));

// Page route handlers
app.get('/discovery', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'discovery.html'));
});

app.get('/studio', (req, res) => {
  res.sendFile(path.join(__dirname, 'studio', 'index.html'));
});

// Fallback to studio/index.html (OIOS Studio) for SPA routing of internal routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'studio', 'index.html'));
});

// Start application
initDatabase().then(() => {
  app.listen(port, () => {
    console.log(`OIOS Studio running on port ${port} (Postgres: ${usePostgres})`);
  });
});
