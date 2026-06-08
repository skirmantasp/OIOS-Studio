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

  // Allow login page, public APIs, favicon, and public landing/discovery/onboarding paths without authentication
  const isPublicApi = req.path.startsWith('/api/public/');
  const isPublicAsset = req.path.startsWith('/css/') || req.path.startsWith('/js/') || req.path === '/favicon.ico';
  const isPublicPage = req.path === '/' || req.path === '/onboarding' || req.path === '/discovery' || req.path.startsWith('/discovery-chat') || req.path === '/login.html';
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

// 1. Start client onboarding session
app.post('/api/public/onboarding/start', async (req, res) => {
  const { name, industry, description, website, contactName, contactEmail, companySize, country } = req.body;
  if (!name || !industry) {
    return res.status(400).json({ error: 'Company name and industry are required.' });
  }

  const companyId = 'comp_disc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const newCompany = {
    id: companyId,
    name,
    industry,
    status: 'Lead',
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
      companySize: companySize || '',
      country: country || '',
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

// --- DISCOVERY CHATBOT ENGINE & SERVICES ---

const DISCOVERY_QUESTIONS = [
  {
    stage: 'business',
    field: 'primaryGoals',
    question: "Let's start with your high-level business direction. What are the main strategic priorities or goals you are aiming to achieve over the next 6 to 12 months?",
    followUp: "You mentioned improving speed or efficiency. What is the target timeline and what is driving the urgency for these goals?",
    checkType: 'priority_driver_timeline'
  },
  {
    stage: 'business',
    field: 'expectedOutcomes',
    question: "If this initiative is successful, what specific, measurable targets (e.g., time or cost savings, or key metrics) will prove its success?",
    followUp: "Could you specify a target number, percentage, or hours saved that you are aiming for?",
    checkType: 'kpi'
  },
  {
    stage: 'business',
    field: 'currentChallenges',
    question: "What are the main operational challenges or pain points that prevent you from reaching these targets today?",
    followUp: "What is the primary business impact of this challenge if it remains unresolved?",
    checkType: 'driver'
  },
  {
    stage: 'process',
    field: 'coreProcesses',
    question: "Now that we understand the business goals, let's look at the daily operations. What are the core processes or workflows that directly support these business goals?",
    followUp: "Could you outline the very first step your team takes when this process starts, and where it ends?",
    checkType: 'scope'
  },
  {
    stage: 'process',
    field: 'knownBottlenecks',
    question: "Where in this workflow do delays or errors happen most frequently, and what causes them?",
    followUp: "How often do these delays or errors happen, and how long does the process stall as a result?",
    checkType: 'driver'
  },
  {
    stage: 'process',
    field: 'manualWorkAreas',
    question: "Which specific tasks require your team to manually type, copy, or move data between files or systems?",
    followUp: "What specific spreadsheets or manual tools are team members using to complete these manual steps?",
    checkType: 'scope'
  },
  {
    stage: 'systems',
    field: 'currentSystems',
    question: "To help me map how these tasks are performed, let's look at the tools you use. What software platforms, databases, or legacy systems are currently used by your team, and are they cloud or on-premises?",
    followUp: "Could you name the specific platforms or versions of software (e.g. Salesforce, Excel, custom ERP) that you use?",
    checkType: 'scope'
  },
  {
    stage: 'systems',
    field: 'integrations',
    question: "How do these systems currently share data? Is it automated, or does it require manual exports, CSV uploads, or re-keying?",
    followUp: "How does information get from your sales system to your operations system? Is there a direct link, or is it handled manually?",
    checkType: 'scope'
  },
  {
    stage: 'systems',
    field: 'technologyIssues',
    question: "What are the main technical issues (such as slow performance, crashes, sync lags, or missing features) the team faces with these systems?",
    followUp: "Does the team experience any technical pain points, such as data synchronization errors or slow system response times?",
    checkType: 'scope'
  },
  {
    stage: 'people',
    field: 'decisionMakers',
    question: "Understanding the tech stack is critical. Next, let's talk about the team structure. Who holds final decision-making authority and budget approval for this system modernization?",
    followUp: "Who has the final sign-off to approve changes to your software stack or operational budgets?",
    checkType: 'owner'
  },
  {
    stage: 'people',
    field: 'affectedTeams',
    question: "Which departments, teams, or roles will be most affected by changes to this process?",
    followUp: "Who are the daily users of the current tools, and how will their day-to-day workflow change?",
    checkType: 'owner'
  },
  {
    stage: 'people',
    field: 'keyStakeholders',
    question: "Who are the key subject matter experts or team leads we should consult to understand the process details?",
    followUp: "Who is the primary person we should speak to if we need to trace a transaction step-by-step?",
    checkType: 'owner'
  },
  {
    stage: 'data',
    field: 'reports',
    question: "Finally, let's look at how you measure success. What specific dashboards, reports, or KPIs does your leadership rely on today to monitor this process?",
    followUp: "How is your weekly progress reported to management? Is it compiled automatically, or is it done manually?",
    checkType: 'scope'
  },
  {
    stage: 'data',
    field: 'kpis',
    question: "What key performance indicators (KPIs) are tracked for this process, and what are the target levels?",
    followUp: "How does the organization measure if this process is running efficiently? What is the target vs. current value?",
    checkType: 'kpi'
  },
  {
    stage: 'data',
    field: 'dataSources',
    question: "Where does the raw data reside before it is consolidated (e.g., SQL server, local drives, SharePoint, ERP)?",
    followUp: "Where is the original transaction or log data saved when it is first created?",
    checkType: 'scope'
  }
];

// Sufficiency Checker
function checkAnswerSufficiency(text, checkType) {
  if (!text || text.trim().length < 10) {
    return { sufficient: false, missing: 'length' };
  }

  const priorityRegex = /\b(priority|highest priority|critical|important|main goal|objective|strategic objective|primary|urgent|must|required|essential|key|main|highest)\b/i;
  const driverRegex = /\b(because|due to|impacts|limits|affects|drives|reason|so that|in order to|motivation|why|need|demand|drive|competition|growth|revenue|improve|reduce|save|cost|value)\b/i;
  const timelineRegex = /\b(next 12 months|next 6 months|over the next year|within|by q[1-4]|this year|next year|deadline|target period|month|week|year|day|quarter|schedule|q1|q2|q3|q4|\d+\s*(month|week|year|day)s?)\b/i;
  const kpiRegex = /\b(increase|reduce|decrease|improve|percent|hours|days|utilization|kpi|metric|target|from|to|measurable|measure|dollars|metrics|numbers|\d+|%)\b/i;
  const ownerRegex = /\b(owner|responsible|accountable|sponsor|manager|director|vp|cfo|ceo|team lead|department owner|process owner|champion|role|supervisor|user|team|staff|lead|person|operations|who|rep|coordinator|administrator)\b/i;
  const scopeRegex = /\b(process|workflow|reporting|production|inventory|database|system|tool|spreadsheet|sheet|software|platform|intake|sap|excel|salesforce|jira|sharepoint|erp|crm|outlook|email)\b/i;

  const hasPriority = priorityRegex.test(text);
  const hasDriver = driverRegex.test(text);
  const hasTimeline = timelineRegex.test(text);
  const hasKpi = kpiRegex.test(text);
  const hasOwner = ownerRegex.test(text);
  const hasScope = scopeRegex.test(text);

  let criteriaMet = 0;
  if (hasPriority) criteriaMet++;
  if (hasDriver) criteriaMet++;
  if (hasTimeline) criteriaMet++;
  if (hasKpi) criteriaMet++;
  if (hasOwner) criteriaMet++;
  if (hasScope) criteriaMet++;

  if (text.length > 50 && criteriaMet >= 4) {
    return { sufficient: true };
  }

  if (checkType === 'priority_driver_timeline') {
    if (!hasPriority || !hasDriver || !hasTimeline) {
      return { sufficient: false, missing: 'priority, driver, or timeline details' };
    }
  } else if (checkType === 'kpi') {
    if (!hasKpi) {
      return { sufficient: false, missing: 'measurable targets or KPIs (e.g. percentages or hours)' };
    }
  } else if (checkType === 'driver') {
    if (!hasDriver) {
      return { sufficient: false, missing: 'the business driver or underlying reason' };
    }
  } else if (checkType === 'owner') {
    if (!hasOwner) {
      return { sufficient: false, missing: 'ownership, responsible roles, or affected teams' };
    }
  } else if (checkType === 'scope') {
    if (!hasScope) {
      return { sufficient: false, missing: 'the specific systems, tools, or processes involved' };
    }
  }

  return { sufficient: true };
}

// Text Normalizer
function mockNormalizeAnswer(field, answer) {
  if (!answer || answer.trim().length === 0) return '';
  if (answer.trim() === '[Skipped by client]') return '[Skipped by client]';

  let text = answer.trim();

  const fillers = [
    /^\s*well,?\s*/i,
    /^\s*honestly,?\s*/i,
    /^\s*basically,?\s*/i,
    /^\s*today,?\s*/i,
    /^\s*right now,?\s*/i,
    /^\s*we currently\s*/i,
    /^\s*the client said\s*/i
  ];
  for (const filler of fillers) {
    text = text.replace(filler, '');
  }

  text = text.replace(/\bwe use\b/gi, 'the organization utilizes');
  text = text.replace(/\bwe are using\b/gi, 'the organization utilizes');
  text = text.replace(/\bwe need to\b/gi, 'the objective is to');
  text = text.replace(/\bwe want to\b/gi, 'the objective is to');
  text = text.replace(/\bour\b/gi, 'the');
  text = text.replace(/\bmy\b/gi, 'the');
  text = text.replace(/\bus\b/gi, 'the team');
  text = text.replace(/\bwe\b/gi, 'the organization');

  text = text.charAt(0).toUpperCase() + text.slice(1);

  let prefix = '';
  if (field === 'primaryGoals') prefix = 'Primary strategic objective: ';
  else if (field === 'expectedOutcomes') prefix = 'Target outcome: ';
  else if (field === 'currentChallenges') prefix = 'Operational challenge: ';
  else if (field === 'coreProcesses') prefix = 'Core workflow: ';
  else if (field === 'knownBottlenecks') prefix = 'Identified bottleneck: ';
  else if (field === 'manualWorkAreas') prefix = 'Manual operation: ';
  else if (field === 'currentSystems') prefix = 'System environment: ';
  else if (field === 'integrations') prefix = 'Data integration: ';
  else if (field === 'technologyIssues') prefix = 'Technical gap: ';
  else if (field === 'decisionMakers') prefix = 'Decision authority: ';
  else if (field === 'affectedTeams') prefix = 'Impacted department: ';
  else if (field === 'keyStakeholders') prefix = 'Subject matter expert: ';
  else if (field === 'reports') prefix = 'Reporting mechanism: ';
  else if (field === 'kpis') prefix = 'Key performance indicator: ';
  else if (field === 'dataSources') prefix = 'Primary data repository: ';

  if (text.startsWith(prefix)) {
    return text;
  }
  return prefix + text;
}

// Assessment compiler
function mockCompileAssessment(intakeData) {
  const business = intakeData.business || {};
  const people = intakeData.people || {};
  const process = intakeData.process || {};
  const systems = intakeData.systems || {};
  const data = intakeData.data || {};

  const clean = (val) => (val || '').trim();

  const primaryGoals = clean(business.primaryGoals);
  const expectedOutcomes = clean(business.expectedOutcomes);
  let businessGoals = '';
  if (primaryGoals || expectedOutcomes) {
    businessGoals = `* **Primary Objective:** ${primaryGoals || 'Not specified.'}\n* **Expected Outcomes:** ${expectedOutcomes || 'Not specified.'}`;
  } else {
    businessGoals = 'No business goals documented.';
  }

  const currentChallenges = clean(business.currentChallenges);
  const affectedTeams = clean(people.affectedTeams);
  let coreProblems = '';
  if (currentChallenges || affectedTeams) {
    coreProblems = `* **Operational Challenges:** ${currentChallenges || 'Not specified.'}\n* **Impacted Departments:** ${affectedTeams || 'Not specified.'}`;
  } else {
    coreProblems = 'No operational challenges or pain points documented.';
  }

  const knownBottlenecks = clean(process.knownBottlenecks);
  const manualWorkAreas = clean(process.manualWorkAreas);
  let operationalBottlenecks = '';
  if (knownBottlenecks || manualWorkAreas) {
    operationalBottlenecks = `* **Key Bottlenecks:** ${knownBottlenecks || 'Not specified.'}\n* **Manual Work Areas:** ${manualWorkAreas || 'Not specified.'}`;
  } else {
    operationalBottlenecks = 'No operational bottlenecks documented.';
  }

  const currentSystems = clean(systems.currentSystems);
  const integrations = clean(systems.integrations);
  const technologyIssues = clean(systems.technologyIssues);
  let techStack = '';
  if (currentSystems || integrations || technologyIssues) {
    techStack = `* **Systems In Use:** ${currentSystems || 'Not specified.'}\n* **Integrations:** ${integrations || 'Not specified.'}\n* **Technical Issues:** ${technologyIssues || 'Not specified.'}`;
  } else {
    techStack = 'No technology stack documented.';
  }

  return {
    businessGoals,
    coreProblems,
    operationalBottlenecks,
    techStack
  };
}

// Database query helpers
async function dbGetCompany(id) {
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM companies WHERE id=$1', [id]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      name: row.name,
      industry: row.industry,
      status: row.status,
      stage: row.stage,
      createdAt: row.createdAt,
      description: row.description,
      website: row.website,
      contactName: row.contactName,
      contactEmail: row.contactEmail,
      assessment: typeof row.assessment === 'string' ? JSON.parse(row.assessment) : (row.assessment || {}),
      discoveryIntake: typeof row.discoveryIntake === 'string' ? JSON.parse(row.discoveryIntake) : (row.discoveryIntake || {})
    };
  } else {
    const dbData = readLocalDb();
    return dbData.companies.find(x => x.id === id) || null;
  }
}

async function dbUpdateCompany(id, company) {
  if (usePostgres) {
    await pool.query(
      `UPDATE companies 
       SET name=$1, industry=$2, status=$3, stage=$4, "createdAt"=$5, description=$6, website=$7, "contactName"=$8, "contactEmail"=$9, assessment=$10, "discoveryIntake"=$11
       WHERE id=$12`,
      [
        company.name,
        company.industry,
        company.status,
        company.stage,
        company.createdAt,
        company.description,
        company.website,
        company.contactName,
        company.contactEmail,
        JSON.stringify(company.assessment || {}),
        JSON.stringify(company.discoveryIntake || {}),
        id
      ]
    );
  } else {
    const dbData = readLocalDb();
    const idx = dbData.companies.findIndex(x => x.id === id);
    if (idx !== -1) {
      dbData.companies[idx] = company;
      writeLocalDb(dbData);
    }
  }
}

async function dbGetDiscoverySession(companyId) {
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM "discoverySessions" WHERE "companyId" = $1', [companyId]);
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: row.id,
      companyId: row.companyId,
      currentStage: row.currentStage,
      currentQuestionIndex: row.currentQuestionIndex,
      answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : (row.answers || {}),
      skippedFields: typeof row.skippedFields === 'string' ? JSON.parse(row.skippedFields) : (row.skippedFields || []),
      messageHistory: typeof row.messageHistory === 'string' ? JSON.parse(row.messageHistory) : (row.messageHistory || []),
      status: row.status,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
      lastClientMessageAt: row.lastClientMessageAt,
      expiresAt: row.expiresAt
    };
  } else {
    const dbData = readLocalDb();
    if (!dbData.discoverySessions) dbData.discoverySessions = [];
    return dbData.discoverySessions.find(s => s.companyId === companyId) || null;
  }
}

async function dbSaveDiscoverySession(session) {
  if (usePostgres) {
    const query = `
      INSERT INTO "discoverySessions" (
        id, "companyId", "currentStage", "currentQuestionIndex",
        answers, "skippedFields", "messageHistory", status,
        "createdAt", "completedAt", "lastClientMessageAt", "expiresAt"
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        "currentStage" = EXCLUDED."currentStage",
        "currentQuestionIndex" = EXCLUDED."currentQuestionIndex",
        answers = EXCLUDED.answers,
        "skippedFields" = EXCLUDED."skippedFields",
        "messageHistory" = EXCLUDED."messageHistory",
        status = EXCLUDED.status,
        "completedAt" = EXCLUDED."completedAt",
        "lastClientMessageAt" = EXCLUDED."lastClientMessageAt",
        "expiresAt" = EXCLUDED."expiresAt"
    `;
    await pool.query(query, [
      session.id,
      session.companyId,
      session.currentStage,
      session.currentQuestionIndex,
      JSON.stringify(session.answers || {}),
      JSON.stringify(session.skippedFields || []),
      JSON.stringify(session.messageHistory || []),
      session.status,
      session.createdAt,
      session.completedAt,
      session.lastClientMessageAt,
      session.expiresAt
    ]);
  } else {
    const dbData = readLocalDb();
    if (!dbData.discoverySessions) dbData.discoverySessions = [];
    const idx = dbData.discoverySessions.findIndex(s => s.id === session.id);
    if (idx !== -1) {
      dbData.discoverySessions[idx] = session;
    } else {
      dbData.discoverySessions.push(session);
    }
    writeLocalDb(dbData);
  }
}

// --- PUBLIC DISCOVERY CHAT ENDPOINTS ---

app.post('/api/public/discovery/start', async (req, res) => {
  const { resume } = req.body;
  const companyId = getDiscoveryCompanyId(req);
  if (!companyId) {
    return res.status(401).json({ error: 'Unauthorized discovery session.' });
  }

  try {
    const company = await dbGetCompany(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company lead not found.' });
    }

    let session = await dbGetDiscoverySession(companyId);

    if (session && session.status === 'completed') {
      return res.json({
        id: session.id,
        companyId: session.companyId,
        companyName: company.name,
        currentStage: session.currentStage,
        currentQuestionIndex: session.currentQuestionIndex,
        messageHistory: session.messageHistory,
        status: session.status,
        skippedFields: session.skippedFields
      });
    }

    if (session) {
      if (resume === null) {
        return res.status(409).json({ message: 'Active draft session exists.' });
      } else if (resume === false) {
        session = null;
      }
    }

    if (!session) {
      const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      const openingText = `Hi ${company.contactName || 'there'}, welcome to PRAGMA AI Systems. I'm your virtual discovery partner today. I've reviewed your onboarding info for ${company.name} in the ${company.industry} sector. My goal is to understand your day-to-day operations, processes, and current technical systems. Together, we'll compile a clear picture of your environment to prepare for our consulting team's review. This should take about 10-15 minutes. Let's start with your high-level business direction. What are the main strategic priorities or goals you are aiming to achieve over the next 6 to 12 months?`;

      session = {
        id: sessionId,
        companyId,
        currentStage: 'business',
        currentQuestionIndex: 0,
        answers: { _probedQuestions: [] },
        skippedFields: [],
        messageHistory: [
          { sender: 'bot', text: openingText, timestamp: new Date().toISOString() }
        ],
        status: 'draft',
        createdAt: new Date().toISOString(),
        completedAt: null,
        lastClientMessageAt: null,
        expiresAt: null
      };

      await dbSaveDiscoverySession(session);
      await writeLog('info', `Discovery session started for company ${company.name} (${companyId})`);
    }

    res.json({
      id: session.id,
      companyId: session.companyId,
      companyName: company.name,
      currentStage: session.currentStage,
      currentQuestionIndex: session.currentQuestionIndex,
      messageHistory: session.messageHistory,
      status: session.status,
      skippedFields: session.skippedFields
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/public/discovery/message', async (req, res) => {
  const { message } = req.body;
  const companyId = getDiscoveryCompanyId(req);
  if (!companyId) {
    return res.status(401).json({ error: 'Unauthorized discovery session.' });
  }

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  try {
    const company = await dbGetCompany(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company lead not found.' });
    }

    const session = await dbGetDiscoverySession(companyId);
    if (!session || session.status === 'completed') {
      return res.status(400).json({ error: 'No active session found.' });
    }

    session.messageHistory.push({
      sender: 'user',
      text: message,
      timestamp: new Date().toISOString()
    });
    session.lastClientMessageAt = new Date().toISOString();

    const qIdx = session.currentQuestionIndex;
    const qObj = DISCOVERY_QUESTIONS[qIdx];

    const isSkipText = /^\s*(skip|pass|don't know|dont know|i do not know|i don't know|not sure|no idea|unknown|no clue|na|n\/a)\s*$/i.test(message);

    if (isSkipText) {
      session.skippedFields = session.skippedFields || [];
      if (!session.skippedFields.includes(qObj.field)) {
        session.skippedFields.push(qObj.field);
      }
      session.answers[qObj.field] = '[Skipped by client]';

      session.currentQuestionIndex++;
      if (session.currentQuestionIndex < DISCOVERY_QUESTIONS.length) {
        const nextQ = DISCOVERY_QUESTIONS[session.currentQuestionIndex];
        session.currentStage = nextQ.stage;
        const botReply = `Understood, we will skip this topic. Let's move on: ${nextQ.question}`;
        session.messageHistory.push({
          sender: 'bot',
          text: botReply,
          timestamp: new Date().toISOString()
        });
      } else {
        session.status = 'completed';
        const closingText = `Thank you, ${company.contactName || 'there'}. We have successfully compiled your Discovery profile and generated your initial operational assessment. I have logged these details directly in our secure OIOS workspace. A PRAGMA consulting architect will review your environment, analyze your system integrations, and extract key insights. We will follow up shortly to schedule a review session. Have a productive day!`;
        session.messageHistory.push({
          sender: 'bot',
          text: closingText,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      const sufficiency = checkAnswerSufficiency(message, qObj.checkType);
      const probedList = session.answers._probedQuestions || [];

      if (!sufficiency.sufficient && !probedList.includes(qObj.field)) {
        probedList.push(qObj.field);
        session.answers._probedQuestions = probedList;

        const botReply = qObj.followUp;
        session.messageHistory.push({
          sender: 'bot',
          text: botReply,
          timestamp: new Date().toISOString()
        });
      } else {
        const normalized = mockNormalizeAnswer(qObj.field, message);
        session.answers[qObj.field] = normalized;

        session.currentQuestionIndex++;
        if (session.currentQuestionIndex < DISCOVERY_QUESTIONS.length) {
          const nextQ = DISCOVERY_QUESTIONS[session.currentQuestionIndex];
          session.currentStage = nextQ.stage;
          const acks = [
            "Got it. Let's keep going. ",
            "Understood, thank you. ",
            "Thank you for those details. ",
            "Clear. Next topic: "
          ];
          const ack = acks[session.currentQuestionIndex % acks.length];
          const botReply = ack + nextQ.question;
          session.messageHistory.push({
            sender: 'bot',
            text: botReply,
            timestamp: new Date().toISOString()
          });
        } else {
          session.status = 'completed';
          const closingText = `Thank you, ${company.contactName || 'there'}. We have successfully compiled your Discovery profile and generated your initial operational assessment. I have logged these details directly in our secure OIOS workspace. A PRAGMA consulting architect will review your environment, analyze your system integrations, and extract key insights. We will follow up shortly to schedule a review session. Have a productive day!`;
          session.messageHistory.push({
            sender: 'bot',
            text: closingText,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    await dbSaveDiscoverySession(session);

    const lastMsg = session.messageHistory[session.messageHistory.length - 1];
    res.json({
      id: session.id,
      companyId: session.companyId,
      companyName: company.name,
      currentStage: session.currentStage,
      currentQuestionIndex: session.currentQuestionIndex,
      messageHistory: session.messageHistory,
      status: session.status,
      skippedFields: session.skippedFields,
      reply: lastMsg.sender === 'bot' ? lastMsg.text : ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/public/discovery/skip', async (req, res) => {
  const companyId = getDiscoveryCompanyId(req);
  if (!companyId) {
    return res.status(401).json({ error: 'Unauthorized discovery session.' });
  }

  try {
    const company = await dbGetCompany(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company lead not found.' });
    }

    const session = await dbGetDiscoverySession(companyId);
    if (!session || session.status === 'completed') {
      return res.status(400).json({ error: 'No active session found.' });
    }

    const qIdx = session.currentQuestionIndex;
    const qObj = DISCOVERY_QUESTIONS[qIdx];

    session.skippedFields = session.skippedFields || [];
    if (!session.skippedFields.includes(qObj.field)) {
      session.skippedFields.push(qObj.field);
    }
    session.answers[qObj.field] = '[Skipped by client]';

    session.currentQuestionIndex++;
    if (session.currentQuestionIndex < DISCOVERY_QUESTIONS.length) {
      const nextQ = DISCOVERY_QUESTIONS[session.currentQuestionIndex];
      session.currentStage = nextQ.stage;
      const botReply = `Understood, skipping. Let's move on: ${nextQ.question}`;
      session.messageHistory.push({
        sender: 'bot',
        text: botReply,
        timestamp: new Date().toISOString()
      });
    } else {
      session.status = 'completed';
      const closingText = `Thank you, ${company.contactName || 'there'}. We have successfully compiled your Discovery profile and generated your initial operational assessment. I have logged these details directly in our secure OIOS workspace. A PRAGMA consulting architect will review your environment, analyze your system integrations, and extract key insights. We will follow up shortly to schedule a review session. Have a productive day!`;
      session.messageHistory.push({
        sender: 'bot',
        text: closingText,
        timestamp: new Date().toISOString()
      });
    }

    await dbSaveDiscoverySession(session);

    const lastMsg = session.messageHistory[session.messageHistory.length - 1];
    res.json({
      id: session.id,
      companyId: session.companyId,
      companyName: company.name,
      currentStage: session.currentStage,
      currentQuestionIndex: session.currentQuestionIndex,
      messageHistory: session.messageHistory,
      status: session.status,
      skippedFields: session.skippedFields,
      reply: lastMsg.sender === 'bot' ? lastMsg.text : ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/public/discovery/complete', async (req, res) => {
  const companyId = getDiscoveryCompanyId(req);
  if (!companyId) {
    return res.status(401).json({ error: 'Unauthorized discovery session.' });
  }

  try {
    const company = await dbGetCompany(companyId);
    if (!company) {
      return res.status(404).json({ error: 'Company lead not found.' });
    }

    const session = await dbGetDiscoverySession(companyId);
    if (!session) {
      return res.status(400).json({ error: 'No session found.' });
    }

    const intake = company.discoveryIntake || {
      business: {}, people: {}, process: {}, systems: {}, data: {}
    };

    intake.skippedFields = session.skippedFields || [];

    intake.business = {
      primaryGoals: session.answers.primaryGoals || '',
      expectedOutcomes: session.answers.expectedOutcomes || '',
      currentChallenges: session.answers.currentChallenges || ''
    };
    intake.people = {
      decisionMakers: session.answers.decisionMakers || '',
      affectedTeams: session.answers.affectedTeams || '',
      keyStakeholders: session.answers.keyStakeholders || ''
    };
    intake.process = {
      coreProcesses: session.answers.coreProcesses || '',
      knownBottlenecks: session.answers.knownBottlenecks || '',
      manualWorkAreas: session.answers.manualWorkAreas || ''
    };
    intake.systems = {
      currentSystems: session.answers.currentSystems || '',
      integrations: session.answers.integrations || '',
      technologyIssues: session.answers.technologyIssues || ''
    };
    intake.data = {
      reports: session.answers.reports || '',
      kpis: session.answers.kpis || '',
      dataSources: session.answers.dataSources || ''
    };

    company.discoveryIntake = intake;

    const asm = mockCompileAssessment(intake);
    company.assessment = asm;

    company.stage = 'Assessment';

    await dbUpdateCompany(companyId, company);

    session.status = 'completed';
    session.completedAt = new Date().toISOString();
    await dbSaveDiscoverySession(session);

    await writeLog('info', `Discovery chatbot session completed and assessment compiled for lead: ${company.name} (${companyId})`);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

        CREATE TABLE IF NOT EXISTS "discoverySessions" (
          id TEXT PRIMARY KEY,
          "companyId" TEXT REFERENCES companies(id) ON DELETE CASCADE,
          "currentStage" TEXT NOT NULL,
          "currentQuestionIndex" INTEGER NOT NULL,
          answers JSONB,
          "skippedFields" JSONB,
          "messageHistory" JSONB,
          status TEXT DEFAULT 'draft',
          "createdAt" TEXT NOT NULL,
          "completedAt" TEXT,
          "lastClientMessageAt" TEXT,
          "expiresAt" TEXT
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
        logs: [],
        discoverySessions: []
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
    if (!data.discoverySessions) data.discoverySessions = [];
    return data;
  } catch (e) {
    return { companies: [], discoveryNotes: [], insights: [], systemIdeas: [], projects: [], reports: [], nextActions: [], logs: [], discoverySessions: [] };
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
      const sessRes = await client.query('SELECT * FROM "discoverySessions"');
      
      client.release();
      
      res.json({
        companies: compRes.rows,
        discoveryNotes: noteRes.rows,
        insights: insRes.rows,
        systemIdeas: ideaRes.rows,
        projects: projRes.rows,
        reports: repRes.rows,
        nextActions: actRes.rows,
        discoverySessions: sessRes.rows
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
      await client.query('DELETE FROM "discoverySessions"');
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
    if (dbData.discoverySessions) {
      dbData.discoverySessions = dbData.discoverySessions.filter(x => x.companyId !== id);
    }
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
  res.redirect(302, '/onboarding');
});

app.get('/onboarding', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'onboarding.html'));
});

app.get('/discovery-chat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'discovery-chat.html'));
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
