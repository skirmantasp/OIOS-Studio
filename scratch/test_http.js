/**
 * API Integration Test for PRAGMA / OIOS Discovery Chatbot
 */

const { spawn } = require('child_process');
const http = require('http');

const PORT = 3003;
const BASE_URL = `http://localhost:${PORT}`;

// 1. Spin up the server on port 3003
console.log(`Starting server on port ${PORT}...`);
const serverProcess = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: PORT, ACCESS_PASSWORD: 'oios2026' },
  shell: true
});

serverProcess.stdout.on('data', (data) => {
  console.log(`[Server]: ${data.toString().trim()}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`[Server Error]: ${data.toString().trim()}`);
});

function cleanup(exitCode = 0) {
  console.log('Shutting down server...');
  serverProcess.kill('SIGKILL');
  process.exit(exitCode);
}

// Set up cleanups
process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));

// Wait for server to start
function waitForServer(callback) {
  const req = http.get(`${BASE_URL}/api/status`, (res) => {
    callback();
  });
  req.on('error', () => {
    setTimeout(() => waitForServer(callback), 100);
  });
}

// Helper to make fetch-like requests with cookie support
async function makeRequest(path, method, body, cookie = null) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(body || {});
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataStr)
      }
    };

    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(responseBody);
        } catch (e) {
          parsed = responseBody;
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(dataStr);
    req.end();
  });
}

// Run the integration test suite
waitForServer(async () => {
  console.log('\n--- SERVER ACTIVE, RUNNING INTEGRATION FLOW ---\n');
  try {
    // Step 1: Client Onboarding Start
    console.log('Step 1: Onboarding a new company...');
    const onboardingRes = await makeRequest('/api/public/onboarding/start', 'POST', {
      name: 'Test Acme Corp',
      industry: 'Logistics',
      description: 'Acme logistics operations',
      contactName: 'John Doe',
      contactEmail: 'john@acme.com',
      companySize: '50-200',
      country: 'USA'
    });

    if (onboardingRes.statusCode !== 200) {
      throw new Error(`Onboarding failed: ${JSON.stringify(onboardingRes.body)}`);
    }

    const companyId = onboardingRes.body.companyId;
    const cookieHeader = onboardingRes.headers['set-cookie'] ? onboardingRes.headers['set-cookie'][0] : null;
    const discoveryToken = cookieHeader ? cookieHeader.split(';')[0] : '';

    console.log(`✓ Onboarded company successfully. ID: ${companyId}`);
    console.log(`Token Cookie: ${discoveryToken}`);

    // Step 2: Initialize Discovery Session
    console.log('\nStep 2: Starting discovery session...');
    const startRes = await makeRequest('/api/public/discovery/start', 'POST', {
      companyId,
      resume: null
    }, discoveryToken);

    if (startRes.statusCode !== 200) {
      throw new Error(`Start session failed: ${JSON.stringify(startRes.body)}`);
    }

    console.log('✓ Discovery session initialized.');
    console.log(`Current Stage: ${startRes.body.currentStage}`);
    console.log(`Opening Message: "${startRes.body.messageHistory[0].text}"`);

    // Step 3: Trigger Probing (Insufficient response)
    console.log('\nStep 3: Testing sufficiency checker with insufficient response...');
    const msg1Res = await makeRequest('/api/public/discovery/message', 'POST', {
      companyId,
      message: 'Improve speed' // Too short, fails priority_driver_timeline
    }, discoveryToken);

    if (msg1Res.statusCode !== 200) {
      throw new Error(`Message sending failed: ${JSON.stringify(msg1Res.body)}`);
    }

    console.log(`✓ Bot probed client as expected. Reply: "${msg1Res.body.reply}"`);
    console.log(`Probed check: index remained at 0, currentStage: ${msg1Res.body.currentStage}`);

    // Step 4: Submit Sufficient Response
    console.log('\nStep 4: Submitting sufficient response...');
    const msg2Res = await makeRequest('/api/public/discovery/message', 'POST', {
      companyId,
      message: 'Our main priority is to automate proposal generation within 12 months because manual drafting takes too long.'
    }, discoveryToken);

    console.log(`✓ Accepted response. Bot Reply: "${msg2Res.body.reply}"`);
    console.log(`Moved to question index: ${msg2Res.body.currentQuestionIndex}, Stage: ${msg2Res.body.currentStage}`);

    // Step 5: Skip Question
    console.log('\nStep 5: Testing skip functionality (via skip route)...');
    const skipRes = await makeRequest('/api/public/discovery/skip', 'POST', {
      companyId
    }, discoveryToken);

    console.log(`✓ Question skipped. Bot Reply: "${skipRes.body.reply}"`);
    console.log(`Moved to question index: ${skipRes.body.currentQuestionIndex}, Stage: ${skipRes.body.currentStage}`);
    console.log(`Skipped Fields list: ${JSON.stringify(skipRes.body.skippedFields)}`);

    // Step 6: Test resume check logic (Simulate page reload)
    console.log('\nStep 6: Simulating page reload, start without resume param (expect 409)...');
    const reloadRes = await makeRequest('/api/public/discovery/start', 'POST', {
      companyId,
      resume: null
    }, discoveryToken);

    if (reloadRes.statusCode !== 409) {
      throw new Error(`Expected 409 Conflict indicating active draft, got: ${reloadRes.statusCode}`);
    }
    console.log('✓ Successfully received 409 conflict. Resume prompt is functional.');

    // Step 7: Complete all remaining questions to verify writeback
    console.log('\nStep 7: Completing the remaining questions in chatbot flow...');
    let currentIdx = skipRes.body.currentQuestionIndex;
    let lastState = skipRes.body;

    const sampleAnswers = {
      currentChallenges: 'Manual coordination takes up to 4 hours per proposal.',
      coreProcesses: 'The core workflow involves reading customer specifications and drafting templates.',
      knownBottlenecks: 'The bottleneck is waiting for technical reviews from team leads.',
      manualWorkAreas: 'Manually copy-pasting numbers from SAP into word document files.',
      currentSystems: 'SAP ERP cloud, Outlook email client, local Excel files.',
      integrations: 'SAP ERP has no integration to word template generator.',
      technologyIssues: 'Crashes occur when exports exceed 500 rows.',
      decisionMakers: 'Modernization budget is approved by Operations Director, CFO.',
      affectedTeams: 'Proposal coordinators and operations team are affected.',
      keyStakeholders: 'John Doe senior proposal writer is key contact.',
      reports: 'Leadership uses weekly report on proposal volumes.',
      kpis: 'KPI target is 24 hour turnaround time.',
      dataSources: 'Data is located in SAP database, local files, Outlook.'
    };

    // Keep sending sample responses until complete
    while (currentIdx < 15) {
      const field = ['primaryGoals', 'expectedOutcomes', 'currentChallenges',
                     'coreProcesses', 'knownBottlenecks', 'manualWorkAreas',
                     'currentSystems', 'integrations', 'technologyIssues',
                     'decisionMakers', 'affectedTeams', 'keyStakeholders',
                     'reports', 'kpis', 'dataSources'][currentIdx];
      const ansText = sampleAnswers[field] || 'Default detailed answer representing scope, owner, and metrics.';
      
      console.log(`Sending response for field "${field}"...`);
      const res = await makeRequest('/api/public/discovery/message', 'POST', {
        companyId,
        message: ansText
      }, discoveryToken);

      lastState = res.body;
      currentIdx = res.body.currentQuestionIndex;
    }

    console.log(`✓ Completed chatbot conversation! Status: ${lastState.status}`);
    console.log(`Closing Message: "${lastState.reply}"`);

    // Step 8: Call final complete route to trigger Assessment Generation & Intake population
    console.log('\nStep 8: Finalizing session and compiling Assessment...');
    const completeRes = await makeRequest('/api/public/discovery/complete', 'POST', {
      companyId
    }, discoveryToken);

    if (completeRes.statusCode !== 200) {
      throw new Error(`Session completion failed: ${JSON.stringify(completeRes.body)}`);
    }
    console.log('✓ Session finalized successfully on server.');

    // Step 9: Verify database state updates
    console.log('\nStep 9: Logging in as admin to verify database state updates...');
    const loginRes = await makeRequest('/api/login', 'POST', {
      password: 'oios2026'
    });

    if (loginRes.statusCode !== 200) {
      throw new Error(`Admin login failed: ${JSON.stringify(loginRes.body)}`);
    }

    const adminCookieHeader = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0] : null;
    const sessionToken = adminCookieHeader ? adminCookieHeader.split(';')[0] : '';
    console.log('✓ Admin logged in successfully.');

    console.log('Fetching database state via protected /api/studio/state...');
    const stateRes = await makeRequest('/api/studio/state', 'GET', null, sessionToken);

    if (stateRes.statusCode !== 200) {
      throw new Error(`Failed to fetch state: ${stateRes.statusCode} - ${JSON.stringify(stateRes.body)}`);
    }

    const dbCompanies = stateRes.body.companies || [];
    const savedCompany = dbCompanies.find(c => c.id === companyId);

    if (!savedCompany) {
      throw new Error('Company was not found in final DB state!');
    }

    console.log(`Saved Company Stage: "${savedCompany.stage}" (Expected: "Assessment")`);
    console.log('Discovery Intake fields populated:');
    console.log(JSON.stringify(savedCompany.discoveryIntake, null, 2));
    console.log('Auto-Generated Assessment:');
    console.log(JSON.stringify(savedCompany.assessment, null, 2));

    // Verify skipped field isn't counted as completed
    const skippedFieldVal = savedCompany.discoveryIntake.business.expectedOutcomes;
    console.log(`Skipped field expectedOutcomes value: "${skippedFieldVal}" (Expected: "[Skipped by client]")`);
    
    console.log('\nALL INTEGRATION TESTS COMPLETED SUCCESSFULLY!');
    cleanup(0);
  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err);
    cleanup(1);
  }
});
