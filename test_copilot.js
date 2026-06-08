const { JSDOM } = require('jsdom');

// 1. Set up simulated browser environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head></head>
<body>
  <div id="app-container">
    <header id="topbar">
      <h1 id="topbar-title">Dashboard</h1>
      <div id="topbar-actions">
        <span id="workspace-indicator" style="display: none;">
          Workspace: <strong id="current-workspace-name">-</strong>
        </span>
        <button id="theme-toggle"></button>
      </div>
    </header>
    <main id="main-content">
      <div id="app-viewport"></div>
    </main>
  </div>
  <div id="app-modal" class="modal-backdrop">
    <div class="modal-container">
      <div class="modal-header">
        <h3 id="modal-title"></h3>
        <button id="modal-close"></button>
      </div>
      <div class="modal-body" id="modal-body-content"></div>
      <div class="modal-footer" id="modal-footer-content"></div>
    </div>
  </div>
  <div id="app-drawer" class="drawer-backdrop">
    <div class="drawer-container">
      <div class="drawer-header">
        <h3 id="drawer-title"></h3>
        <button id="drawer-expand"></button>
        <button id="drawer-edit"></button>
        <button id="drawer-close"></button>
      </div>
      <div class="drawer-body" id="drawer-body-content"></div>
    </div>
  </div>
</body>
</html>
`, {
  url: 'http://localhost/'
});

global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.HashChangeEvent = dom.window.HashChangeEvent;
global.confirm = () => true;

// Mock Clipboard API since JSDOM doesn't support it
global.navigator.clipboard = {
  writeText: async (text) => {
    global.navigator.clipboard.lastCopied = text;
    return true;
  },
  lastCopied: null
};

// Mock Lucide icons
global.window.lucide = {
  createIcons: () => {}
};

// Seed db in localStorage
const testDb = {
  companies: [
    {
      id: 'nordic_precision',
      name: 'Nordic Precision Components',
      industry: 'Manufacturing',
      status: 'active',
      stage: 'Discovery',
      createdAt: '2026-06-06T12:00:00.000Z',
      description: 'Precision component manufacturing.',
      assessment: {
        businessGoals: 'Optimize weekly reports and manual data pipeline.',
        coreProblems: 'Excel files are fragmented.',
        operationalBottlenecks: '',
        techStack: 'SAP ERP, Excel'
      },
      discoveryIntake: {
        business: { primaryGoals: '', expectedOutcomes: '', currentChallenges: '' },
        people:   { decisionMakers: '', affectedTeams: '', keyStakeholders: '' },
        process:  { coreProcesses: '', knownBottlenecks: '', manualWorkAreas: '' },
        systems:  { currentSystems: '', integrations: '', technologyIssues: '' },
        data:     { reports: '', kpis: '', dataSources: '' }
      }
    }
  ],
  discoveryNotes: [],
  insights: [],
  systemIdeas: [],
  projects: [],
  reports: [],
  nextActions: []
};
localStorage.setItem('oios_studio_db_v1', JSON.stringify(testDb));

// Seed legacy copilot session in localStorage to verify robust migration and Resume state
const legacySession = {
  currentIndex: 0,
  answeredQuestions: {
    expectedOutcomes: "This is expected outcome from previous version."
  },
  skippedQuestions: ["currentChallenges"],
  followUpNotes: {},
  lastAnalysisResult: {}
};
localStorage.setItem('oios_studio_copilot_session_nordic_precision', JSON.stringify(legacySession));

function validateFindingQuality(findingText, domain, originalAnswer, suggestedCopy, isMeaningfulFinding) {
  console.log(`Validating finding quality for domain "${domain}": "${findingText}"`);
  
  // 1. Concise (1-3 sentences)
  const sentences = findingText.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+/g) || [findingText];
  const sentenceCount = sentences.length;
  console.log(`- Sentence count: ${sentenceCount} (expected 1-3)`);
  if (sentenceCount < 1 || sentenceCount > 3) {
    console.error(`FAIL: Saved finding is not concise (has ${sentenceCount} sentences)! Text: "${findingText}"`);
    process.exit(1);
  }
  
  // 2. Not the full Suggested Copy block
  if (suggestedCopy && suggestedCopy.length > 50) {
    const isExactCopy = findingText.trim() === suggestedCopy.trim();
    console.log(`- Is exact copy of suggested copy:`, isExactCopy);
    if (isExactCopy) {
      console.error(`FAIL: Saved finding is a duplicate of the full Suggested Copy block!`);
      process.exit(1);
    }
  }
  
  // 3. Domain-aware
  let domainKeywords = [];
  let forbiddenKeywords = [];
  if (domain === 'healthcare') {
    domainKeywords = ['patient', 'clinic', 'clinician', 'scheduling', 'appointment', 'utilization', 'coordination'];
    forbiddenKeywords = ['proposal', 'consultant', 'knowledge retrieval', 'production', 'calibration'];
  } else if (domain === 'consulting') {
    domainKeywords = ['proposal', 'consultant', 'knowledge', 'utilization', 'retrieval'];
    forbiddenKeywords = ['patient', 'clinic', 'clinician', 'production', 'calibration'];
  } else if (domain === 'manufacturing') {
    domainKeywords = ['production', 'inventory', 'reporting', 'visibility', 'bottleneck', 'downtime'];
    forbiddenKeywords = ['proposal', 'consultant', 'patient', 'clinician', 'calibration'];
  } else if (domain === 'hightech') {
    domainKeywords = ['engineering', 'calibration', 'integration', 'testbed', 'hardware', 'software'];
    forbiddenKeywords = ['healthcare', 'consulting', 'consultant', 'patient', 'clinician'];
  } else if (domain === 'hightech_software') {
    domainKeywords = ['engineering', 'utilization', 'monitoring', 'incident', 'alert'];
    forbiddenKeywords = ['healthcare', 'consulting', 'consultant', 'patient', 'clinician', 'calibration', 'quantum', 'testbed', 'fpga'];
  } else if (domain === 'generic') {
    forbiddenKeywords = ['proposal', 'consultant', 'patient', 'clinician', 'production', 'calibration'];
  }
  
  const lowerText = findingText.toLowerCase();
  if (domainKeywords.length > 0) {
    const hasDomainKw = domainKeywords.some(kw => lowerText.includes(kw));
    console.log(`- Has domain keywords:`, hasDomainKw);
    if (!hasDomainKw) {
      console.error(`FAIL: Saved finding is missing domain keywords for ${domain}!`);
      process.exit(1);
    }
  }
  
  const hasForbiddenKw = forbiddenKeywords.some(kw => lowerText.includes(kw));
  console.log(`- Does NOT leak other domain keywords:`, !hasForbiddenKw);
  if (hasForbiddenKw) {
    console.error(`FAIL: Saved finding leaked keywords from other domains!`);
    process.exit(1);
  }
  
  // 4. Meaningful consultant conclusion
  const isMeaningful = isMeaningfulFinding(findingText);
  console.log(`- Passes isMeaningfulFinding quality check:`, isMeaningful);
  if (!isMeaningful) {
    console.error(`FAIL: Saved finding failed the isMeaningfulFinding quality check!`);
    process.exit(1);
  }
}

function validateRecommendationQuality(recommendationText, followUpText, domain) {
  console.log(`Validating Recommendation Quality for domain "${domain}"...`);
  console.log(`- Recommendation Text: "${recommendationText.trim()}"`);
  console.log(`- Follow-up Text: "${followUpText.trim()}"`);
  
  const text = (recommendationText + " " + followUpText).toLowerCase();
  
  // Forbidden phrases: Avoid "accepted", "strong enough", "proceed to the next question"
  const forbiddenPhrases = [
    'answer is accepted',
    'answer is strong enough',
    'proceed to the next question'
  ];
  for (const phrase of forbiddenPhrases) {
    if (text.includes(phrase)) {
      console.error(`FAIL: Recommendation text contains forbidden validator phrase: "${phrase}"`);
      process.exit(1);
    }
  }

  // Domain-specific keyword rules
  let expectedKeywords = [];
  let forbiddenKeywords = [];
  
  if (domain === 'healthcare') {
    expectedKeywords = ['scheduling', 'appointment coordination', 'clinic operations', 'clinician utilization', 'patient wait times'];
    forbiddenKeywords = ['proposal', 'consultant', 'production', 'downtime'];
  } else if (domain === 'manufacturing') {
    expectedKeywords = ['production visibility', 'production reporting', 'downtime', 'operations', 'maintenance', 'production team'];
    forbiddenKeywords = ['proposal', 'consultant', 'knowledge retrieval', 'patient', 'clinician'];
  } else if (domain === 'consulting') {
    expectedKeywords = ['proposal preparation', 'consultant utilization', 'knowledge reuse', 'engagement team'];
    forbiddenKeywords = ['patient', 'clinic', 'clinician', 'production', 'downtime'];
  } else if (domain === 'hightech_software') {
    expectedKeywords = ['system monitoring', 'incident management', 'devops', 'site reliability team'];
    forbiddenKeywords = ['patient', 'clinic', 'clinician', 'production', 'downtime', 'calibration', 'lab operations', 'quantum', 'proposal'];
  } else if (domain === 'generic') {
    expectedKeywords = ['this operational process', 'responsible team', 'ownership'];
    forbiddenKeywords = [
      'proposal', 'patient', 'clinician', 'production', 'downtime', 
      'attorney', 'warehouse', 'reconciliation'
    ];
  }
  
  if (expectedKeywords.length > 0) {
    const hasExpected = expectedKeywords.some(kw => text.includes(kw));
    console.log(`- Includes expected keywords for ${domain}:`, hasExpected);
    if (!hasExpected) {
      console.error(`FAIL: Recommendation for ${domain} does not contain any of: ${expectedKeywords.join(', ')}`);
      process.exit(1);
    }
  }
  
  const hasForbidden = forbiddenKeywords.some(kw => text.includes(kw));
  console.log(`- Does NOT leak other domain keywords:`, !hasForbidden);
  if (hasForbidden) {
    console.error(`FAIL: Recommendation for ${domain} leaked keywords: ${forbiddenKeywords.filter(kw => text.includes(kw)).join(', ')}`);
    process.exit(1);
  }
}

async function runTest() {
  console.log('Importing modules...');
  const { db } = await import('file:///c:/Users/skirm/Desktop/OIOS Studio/js/state.js');
  const { default: renderWorkspace, isMeaningfulFinding, generateDiscoveryFinding } = await import('file:///c:/Users/skirm/Desktop/OIOS Studio/js/pages/workspace.js');

  const viewport = document.getElementById('app-viewport');
  const params = new URLSearchParams('id=nordic_precision&tab=Discovery Intake');

  console.log('Rendering Discovery Intake page...');
  renderWorkspace(viewport, params);

  // 1. Verify Resume banner exists
  const resumeBtn = document.getElementById('btn-resume-copilot');
  const startNewBtn = document.getElementById('btn-start-new-copilot');
  console.log('Resume button exists in banner:', !!resumeBtn);
  console.log('Start New Session button exists in banner:', !!startNewBtn);
  if (!resumeBtn || !startNewBtn) {
    console.error('FAIL: Resume or Start New buttons not found in banner!');
    process.exit(1);
  }

  // Click resume
  console.log('Clicking "Resume" Discovery...');
  resumeBtn.click();

  // Check if meeting mode overlay is created
  const overlay = document.getElementById('meeting-mode-overlay');
  console.log('Meeting mode overlay created in DOM:', !!overlay);
  if (!overlay) {
    console.error('FAIL: Meeting mode overlay not found in DOM!');
    process.exit(1);
  }

  // 2. Verify 70/30 split layout elements
  const grid = overlay.querySelector('.meeting-grid-layout');
  const mainPanel = overlay.querySelector('.meeting-main-panel');
  const sidebarPanel = overlay.querySelector('.meeting-sidebar-panel');
  const sidebarCards = overlay.querySelectorAll('.meeting-sidebar-card');
  console.log('Grid layout container exists:', !!grid);
  console.log('Left 70% main panel exists:', !!mainPanel);
  console.log('Right 30% sidebar panel exists:', !!sidebarPanel);
  console.log('Sidebar context cards count (Snapshot, Map, Findings):', sidebarCards.length);
  if (!grid || !mainPanel || !sidebarPanel || sidebarCards.length < 3) {
    console.error('FAIL: 70/30 layout panels not correctly structured!');
    process.exit(1);
  }

  // 3. Verify Client Snapshot Panel contains loaded assessment metadata
  const snapshotHTML = sidebarCards[0].innerHTML;
  console.log('Snapshot Industry field contains "Manufacturing":', snapshotHTML.includes('Manufacturing'));
  console.log('Snapshot Tech Stack contains "SAP ERP, Excel":', snapshotHTML.includes('SAP ERP, Excel'));
  if (!snapshotHTML.includes('Manufacturing') || !snapshotHTML.includes('SAP ERP, Excel')) {
    console.error('FAIL: Snapshot panel did not display assessment metadata!');
    process.exit(1);
  }

  // 4. Verify that the bottom action bar does NOT contain the "Save as Discovery Finding" button
  const getCompleteBtn = () => document.getElementById('btn-meeting-complete');
  console.log('Bottom action bar complete button exists:', !!getCompleteBtn());
  if (getCompleteBtn()) {
    console.error('FAIL: Bottom action bar contains Save as Discovery Finding button!');
    process.exit(1);
  }

  // 5. Test Minimize Session
  const minimizeBtn = document.getElementById('btn-minimize-meeting');
  console.log('Minimize button exists in topbar:', !!minimizeBtn);
  if (!minimizeBtn) {
    console.error('FAIL: Minimize button not found in topbar!');
    process.exit(1);
  }

  console.log('Clicking Minimize button...');
  minimizeBtn.click();

  // Verify overlay is closed
  console.log('Overlay removed from DOM on minimize:', !document.getElementById('meeting-mode-overlay'));
  
  // Verify floating resume button is created
  const floatResumeBtn = document.getElementById('btn-floating-resume-session');
  console.log('Floating Resume button exists on page:', !!floatResumeBtn);
  if (!floatResumeBtn) {
    console.error('FAIL: Floating Resume button not found after minimizing!');
    process.exit(1);
  }

  // Click floating resume button
  console.log('Clicking floating Resume button...');
  floatResumeBtn.click();
  console.log('Overlay reopened in DOM:', !!document.getElementById('meeting-mode-overlay'));
  console.log('Floating Resume button removed from DOM:', !document.getElementById('btn-floating-resume-session'));

  // 6. Test AI Detected Information list on Analyze and Capture button state controls
  const answerTextarea = document.getElementById('meeting-answer-input');
  const analyzeBtn = document.getElementById('btn-meeting-analyze');
  
  console.log('Submitting notes matching Excel and manual reporting...');
  answerTextarea.value = 'We consolidate data using Excel manually to compile reports.';
  answerTextarea.dispatchEvent(new dom.window.Event('input'));
  
  const getCardCaptureBtn = () => document.getElementById('btn-card-save-discovery-finding');
  console.log('Card Capture button does not exist in DOM after text input:', !getCardCaptureBtn());
  if (getCardCaptureBtn()) {
    console.error('FAIL: Card Capture button should not exist on text input!');
    process.exit(1);
  }

  analyzeBtn.click();
  
  console.log('Card Capture button exists after analyze:', !!getCardCaptureBtn());
  if (!getCardCaptureBtn()) {
    console.error('FAIL: Card Capture button should exist after analysis!');
    process.exit(1);
  }
  console.log('Card Capture button is enabled after analyze:', !getCardCaptureBtn().disabled);
  if (getCardCaptureBtn().disabled) {
    console.error('FAIL: Card Capture button should be enabled after analysis!');
    process.exit(1);
  }

  // Assert that exactly one visible Save button exists
  const allSaveButtons = Array.from(document.querySelectorAll('button')).filter(btn => btn.textContent.trim().includes('Save as Discovery Finding'));
  console.log('Number of Save as Discovery Finding buttons after analysis:', allSaveButtons.length);
  if (allSaveButtons.length !== 1) {
    console.error('FAIL: There should be exactly one visible Save as Discovery Finding button after analysis!');
    process.exit(1);
  }

  // Verify that editing the answer removes the Card Capture button again
  answerTextarea.value = 'We consolidate data using Excel manually to compile reports. (edited)';
  answerTextarea.dispatchEvent(new dom.window.Event('input'));
  console.log('Card Capture button does not exist in DOM after edit:', !getCardCaptureBtn());
  if (getCardCaptureBtn()) {
    console.error('FAIL: Card Capture button should be removed after editing the answer!');
    process.exit(1);
  }
  
  // Re-analyze to restore state
  analyzeBtn.click();

  const resultContainer = document.getElementById('meeting-result-container');
  console.log('Result container includes Detected Information:', resultContainer.textContent.includes('Detected Information'));
  console.log('Result container includes System: Excel:', resultContainer.textContent.includes('System') && resultContainer.textContent.includes('Excel'));
  console.log('Result container includes Pain Point: Manual Reporting:', resultContainer.textContent.includes('Pain Point') && resultContainer.textContent.includes('Manual Reporting'));
  console.log('Result container includes AI Observation:', resultContainer.textContent.includes('AI Observation'));
  if (!resultContainer.textContent.includes('Detected Information') || !resultContainer.textContent.includes('Excel') || !resultContainer.textContent.includes('Manual Reporting')) {
    console.error('FAIL: AI Detected Information keyword matching failed!');
    process.exit(1);
  }

  // 7. Verify Suggested Follow-up card and Use Follow-up button
  const useFollowUpBtn = document.getElementById('btn-use-follow-up');
  console.log('Use Follow-up button exists:', !!useFollowUpBtn);
  if (useFollowUpBtn) {
    useFollowUpBtn.click();
    console.log('Textarea updated with follow-up string:', answerTextarea.value.includes('Follow-up:'));
  }

  // 8. Verify Sufficient Answer and Suggested Copy card
  console.log('Submitting a sufficient answer...');
  answerTextarea.value = 'Our primary goal is to reduce manual reporting work by next month because we need to save time for supervisors.';
  answerTextarea.dispatchEvent(new dom.window.Event('input'));
  analyzeBtn.click();

  console.log('Result box contains "Answer is sufficient":', resultContainer.textContent.includes('Answer is sufficient'));
  console.log('Suggested copy block exists:', !!document.getElementById('meeting-suggested-text'));
  const copyBtn = document.getElementById('btn-meeting-copy-text');
  console.log('Copy Suggested Text button exists:', !!copyBtn);
  if (copyBtn) {
    copyBtn.click();
    console.log('Text copied to simulated clipboard:', navigator.clipboard.lastCopied);
    if (!navigator.clipboard.lastCopied.includes('The primary strategic objective is to reduce manual reporting work by next month to optimize time allocation for supervisors.')) {
      console.error('FAIL: Copied text mismatch!');
      process.exit(1);
    }
  }

  // 9. Test Capture Finding Click
  console.log('Clicking "Save as Discovery Finding"...');
  
  // Verify capturedFindings length before click
  let initialSession = JSON.parse(localStorage.getItem('oios_studio_copilot_session_nordic_precision'));
  const initialCount = (initialSession.capturedFindings || []).length;
  console.log('capturedFindings count before save:', initialCount);
  
  const activeCaptureBtn = document.getElementById('btn-card-save-discovery-finding');
  if (!activeCaptureBtn) {
    console.error('FAIL: Save as Discovery Finding button not found!');
    process.exit(1);
  }
  activeCaptureBtn.click();

  // Assert button and status text entered captured state
  const postCaptureBtn = document.getElementById('btn-card-save-discovery-finding');
  console.log('Capture button text after save:', postCaptureBtn.textContent.trim());
  console.log('Capture button is disabled after save:', postCaptureBtn.disabled);
  
  const statusTextEl = postCaptureBtn.parentNode.querySelector('.captured-status-text');
  console.log('Status text element exists:', !!statusTextEl);
  console.log('Status text content:', statusTextEl ? statusTextEl.textContent : 'NONE');

  if (postCaptureBtn.textContent.trim() !== '✓ Finding Saved' || !postCaptureBtn.disabled) {
    console.error('FAIL: Capture button did not enter captured state after save!');
    process.exit(1);
  }
  if (!statusTextEl || statusTextEl.textContent !== 'Saved to Captured Findings') {
    console.error('FAIL: Status text "Saved to Captured Findings" not displayed below button!');
    process.exit(1);
  }

  // Verify that clicking increases session.capturedFindings.length by 1
  let freshSession = JSON.parse(localStorage.getItem('oios_studio_copilot_session_nordic_precision'));
  console.log('Number of captured findings after first save:', freshSession.capturedFindings.length);
  if (freshSession.capturedFindings.length !== initialCount + 1) {
    console.error(`FAIL: Expected exactly ${initialCount + 1} captured findings!`);
    process.exit(1);
  }

  // Verify finding object structure in localStorage
  const lastFinding = freshSession.capturedFindings[freshSession.capturedFindings.length - 1];
  const requiredKeys = [
    'id', 'timestamp', 'sourceType', 'questionId', 'targetField', 
    'originalAnswer', 'suggestedCopy', 'aiObservation', 'confidence', 
    'identifiedTags', 'optionalClarifications'
  ];
  console.log('Checking finding object keys in localStorage...');
  for (const key of requiredKeys) {
    const hasKey = key in lastFinding;
    console.log(`- Finding has key "${key}":`, hasKey);
    if (!hasKey) {
      console.error(`FAIL: Finding object is missing key "${key}"!`);
      process.exit(1);
    }
  }

  // Verify Captured Findings sidebar updates immediately
  const meetingSidebarPanel = document.querySelector('.meeting-sidebar-panel');
  const sidebarText = meetingSidebarPanel ? meetingSidebarPanel.textContent : '';
  console.log('Sidebar updates immediately and includes the saved finding:', sidebarText.includes(lastFinding.suggestedCopy));
  if (!sidebarText.includes(lastFinding.suggestedCopy)) {
    console.error('FAIL: Captured Findings sidebar did not update immediately!');
    process.exit(1);
  }

  const firstSuggestedCopyText = document.getElementById('meeting-suggested-text').textContent;
  validateFindingQuality(lastFinding.suggestedCopy, 'manufacturing', lastFinding.originalAnswer, firstSuggestedCopyText, isMeaningfulFinding);

  // Verify that clicking again does not silently create duplicate
  console.log('Checking that clicking again does not silently create duplicate...');
  postCaptureBtn.disabled = false; // temporarily enable
  postCaptureBtn.click();
  
  freshSession = JSON.parse(localStorage.getItem('oios_studio_copilot_session_nordic_precision'));
  console.log('Number of captured findings after clicking duplicate:', freshSession.capturedFindings.length);
  if (freshSession.capturedFindings.length !== initialCount + 1) {
    console.error('FAIL: Duplicate was saved silently!');
    process.exit(1);
  }
  postCaptureBtn.disabled = true; // restore disabled state

  // 10. Test Previous/Next Question Navigation
  const prevBtn = document.getElementById('btn-meeting-prev');
  const nextBtn = document.getElementById('btn-meeting-next');
  console.log('Previous Question button exists:', !!prevBtn);
  console.log('Next Question button exists:', !!nextBtn);
  if (!prevBtn || !nextBtn) {
    console.error('FAIL: Previous or Next button not found!');
    process.exit(1);
  }

  let sessionStr = localStorage.getItem('oios_studio_copilot_session_nordic_precision');
  let session = JSON.parse(sessionStr);
  const oldIndex = session.currentIndex;
  console.log('Index before Previous click:', oldIndex);

  console.log('Clicking Previous Question...');
  prevBtn.click();

  sessionStr = localStorage.getItem('oios_studio_copilot_session_nordic_precision');
  session = JSON.parse(sessionStr);
  console.log('Index after Previous click:', session.currentIndex);
  if (session.currentIndex !== (oldIndex - 1 + 15) % 15) {
    console.error('FAIL: Previous Question button did not navigate backward correctly!');
    process.exit(1);
  }

  console.log('Clicking Next Question...');
  nextBtn.click();

  sessionStr = localStorage.getItem('oios_studio_copilot_session_nordic_precision');
  session = JSON.parse(sessionStr);
  console.log('Index after Next click:', session.currentIndex);
  if (session.currentIndex !== oldIndex) {
    console.error('FAIL: Next Question button did not navigate forward correctly!');
    process.exit(1);
  }

  // 10.5 Verify Confidence Engine with missing ownership vs fully-satisfied answer
  console.log('\n--- 10.5 CONFIDENCE ENGINE VERIFICATION ---');
  
  // Navigate back to Business > Primary Goals question (from index 2 to 0)
  console.log('Already at Business > Primary Goals (no navigation needed)...');

  const proposalAnswerText = `Our highest priority is reducing proposal creation time.
Today consultants spend time searching previous proposals, industry research, and internal frameworks.
This impacts consultant utilization.
Over the next 12 months we want to reduce proposal preparation effort by at least 50% and increase consultant utilization from 72% to 80%.`;
  
  console.log('Testing proposal creation answer (missing ownership)...');
  let dynamicTextarea = document.getElementById('meeting-answer-input');
  let dynamicAnalyzeBtn = document.getElementById('btn-meeting-analyze');
  
  dynamicTextarea.value = proposalAnswerText;
  dynamicTextarea.dispatchEvent(new dom.window.Event('input'));
  dynamicAnalyzeBtn.click();
  
  let activeQuestionField = document.querySelector('.meeting-question-header span:last-child').textContent.trim();
  console.log('Active Question Field:', activeQuestionField);
  
  let currentSession = JSON.parse(localStorage.getItem('oios_studio_copilot_session_nordic_precision'));
  let analysisRes = currentSession.analysisResults[activeQuestionField];
  
  console.log('Calculated Confidence:', analysisRes.confidence);
  console.log('Is Confidence below 100:', analysisRes.confidence < 100);
  console.log('Is Confidence between 80 and 90:', analysisRes.confidence >= 80 && analysisRes.confidence <= 90);
  console.log('Optional Clarifications:', analysisRes.optionalClarifications);
  
  const hasOwnershipClarification = analysisRes.optionalClarifications.some(c => c.toLowerCase().includes('ownership / responsible role'));
  console.log('Optional Clarifications includes ownership / responsible role:', hasOwnershipClarification);
  
  const hasStakeholderClarification = analysisRes.optionalClarifications.some(c => c.toLowerCase().includes('stakeholder / sponsor'));
  console.log('Optional Clarifications includes stakeholder / sponsor:', hasStakeholderClarification);
  
  let resContainer = document.getElementById('meeting-result-container');
  const hasNoneIdentifiedText = resContainer.textContent.includes('None identified');
  console.log('None identified is NOT displayed:', !hasNoneIdentifiedText);
  
  if (analysisRes.confidence >= 100 || analysisRes.confidence < 80 || analysisRes.confidence > 90) {
    console.error('FAIL: Confidence score for missing ownership not in the 80-90% range!');
    process.exit(1);
  }
  if (!hasOwnershipClarification) {
    console.error('FAIL: Missing ownership clarification not listed in optional clarifications!');
    process.exit(1);
  }
  if (hasStakeholderClarification) {
    console.error('FAIL: Unallowed stakeholder / sponsor clarification was listed for primaryGoals!');
    process.exit(1);
  }
  if (hasNoneIdentifiedText) {
    console.error('FAIL: "None identified" displayed despite missing ownership component!');
    process.exit(1);
  }
  
  // Test full-answer case (all 6 components present)
  console.log('Testing full-answer case (all 6 components present)...');
  const fullAnswerText = `Our strategic objective is to improve the proposal creation process. 
In order to achieve this, the Operations Director will be responsible for the transition.
By Q4, we expect to reduce proposal preparation effort by 50% using our custom SharePoint system because we need to save time.`;
  
  dynamicTextarea = document.getElementById('meeting-answer-input');
  dynamicAnalyzeBtn = document.getElementById('btn-meeting-analyze');
  dynamicTextarea.value = fullAnswerText;
  dynamicTextarea.dispatchEvent(new dom.window.Event('input'));
  dynamicAnalyzeBtn.click();
  
  currentSession = JSON.parse(localStorage.getItem('oios_studio_copilot_session_nordic_precision'));
  analysisRes = currentSession.analysisResults[activeQuestionField];
  
  console.log('Calculated Confidence (Full Answer):', analysisRes.confidence);
  console.log('Is Confidence 95-100%:', analysisRes.confidence >= 95 && analysisRes.confidence <= 100);
  console.log('Optional Clarifications (Full Answer):', analysisRes.optionalClarifications);
  
  resContainer = document.getElementById('meeting-result-container');
  const hasNoneIdentifiedFull = resContainer.textContent.includes('None identified');
  console.log('None identified is displayed for full answer:', hasNoneIdentifiedFull);
  
  if (analysisRes.confidence < 95 || analysisRes.confidence > 100) {
    console.error('FAIL: Confidence score for full answer not in the 95-100% range!');
    process.exit(1);
  }
  if (analysisRes.optionalClarifications.length > 0) {
    console.error('FAIL: Optional clarifications listed when all components are present!');
    process.exit(1);
  }
  if (!hasNoneIdentifiedFull) {
    console.error('FAIL: "None identified" not displayed when all optional clarifications are met!');
    process.exit(1);
  }

  // Verify recommendation text for full answer
  const fullRecommendationBox = document.querySelector('.meeting-recommendation-box');
  console.log('Full Recommendation text:', fullRecommendationBox ? fullRecommendationBox.textContent : 'NOT FOUND');
  if (!fullRecommendationBox) {
    console.error('FAIL: Recommendation box not found for full answer!');
    process.exit(1);
  }
  const fullRecText = fullRecommendationBox.textContent;
  const hasValidationPhrases = /accepted|strong enough|proceed to the next question/i.test(fullRecText);
  const hasStrategicWording = fullRecText.includes('production visibility and downtime reduction');
  const hasPartnerWording = fullRecText.includes('I recommend capturing this finding and proceeding to the next topic');
  const hasSuggestedFollowUp = fullRecText.includes('Suggested Follow-up');

  console.log('Does NOT include validation phrases:', !hasValidationPhrases);
  console.log('Includes strategic objective wording:', hasStrategicWording);
  console.log('Includes discovery partner wording:', hasPartnerWording);
  console.log('Does NOT suggest a follow-up:', !hasSuggestedFollowUp);

  if (hasValidationPhrases || !hasStrategicWording || !hasPartnerWording || hasSuggestedFollowUp) {
    console.error('FAIL: Recommendation text requirements violated for full answer!');
    process.exit(1);
  }

  // 10.6 Test People > Decision Makers context-aware clarifications
  console.log('\n--- 10.6 CONTEXT-AWARE CLARIFICATION ENGINE (DECISION MAKERS) ---');
  console.log('Navigating to People > Decision Makers...');
  document.getElementById('btn-meeting-next').click();
  document.getElementById('btn-meeting-next').click();
  document.getElementById('btn-meeting-next').click();
  
  dynamicTextarea = document.getElementById('meeting-answer-input');
  dynamicAnalyzeBtn = document.getElementById('btn-meeting-analyze');
  
  console.log('Testing decision makers answer missing sponsor...');
  dynamicTextarea.value = 'We need to decide how to allocate the final approval task.';
  dynamicTextarea.dispatchEvent(new dom.window.Event('input'));
  dynamicAnalyzeBtn.click();
  
  activeQuestionField = document.querySelector('.meeting-question-header span:last-child').textContent.trim();
  console.log('Active Question Field:', activeQuestionField);
  if (activeQuestionField !== 'decisionMakers') {
    console.error('FAIL: Not on decisionMakers question!');
    process.exit(1);
  }
  
  currentSession = JSON.parse(localStorage.getItem('oios_studio_copilot_session_nordic_precision'));
  analysisRes = currentSession.analysisResults[activeQuestionField];
  
  console.log('Optional Clarifications for Decision Makers:', analysisRes.optionalClarifications);
  const decisionMakersHasStakeholderClar = analysisRes.optionalClarifications.some(c => c.toLowerCase().includes('stakeholder / sponsor'));
  console.log('Optional Clarifications includes Stakeholder / Sponsor:', decisionMakersHasStakeholderClar);
  
  if (!decisionMakersHasStakeholderClar) {
    console.error('FAIL: Stakeholder / Sponsor did not appear for Decision Makers answer missing it!');
    process.exit(1);
  }
  
  console.log('CONTEXT-AWARE CLARIFICATION ENGINE VERIFICATION PASSED!\n');

  // 10.7 Test Discovery Themes Detection
  console.log('\n--- 10.7 DISCOVERY THEMES DETECTION VERIFICATION ---');
  console.log('Navigating to Business > Primary Goals...');
  document.getElementById('btn-meeting-prev').click();
  document.getElementById('btn-meeting-prev').click();
  document.getElementById('btn-meeting-prev').click();

  dynamicTextarea = document.getElementById('meeting-answer-input');
  dynamicAnalyzeBtn = document.getElementById('btn-meeting-analyze');
  
  const proposalThemeAnswer = `Our highest priority is reducing proposal creation time. Today consultants spend a significant amount of time searching previous proposals, industry research, and internal frameworks before they can start drafting. This directly impacts consultant utilization and limits how many client engagements we can support. Over the next 12 months we want to reduce proposal preparation effort by at least 50% and increase consultant utilization from 72% to 80%.`;
  
  console.log('Submitting proposal creation answer...');
  dynamicTextarea.value = proposalThemeAnswer;
  dynamicTextarea.dispatchEvent(new dom.window.Event('input'));
  dynamicAnalyzeBtn.click();
  
  // Verify Suggested Copy for proposal creation answer
  const suggestedCopyDiv = document.getElementById('meeting-suggested-text');
  console.log('Suggested Copy:', suggestedCopyDiv ? suggestedCopyDiv.textContent : 'NOT FOUND');
  if (!suggestedCopyDiv) {
    console.error('FAIL: Suggested Copy block not found in DOM!');
    process.exit(1);
  }
  const suggestedCopyText = suggestedCopyDiv.textContent;
  
  const includesStrategic = suggestedCopyText.includes('Primary strategic objective');
  const includesReduceEffort = suggestedCopyText.includes('reduce proposal preparation effort');
  const includesNext12 = suggestedCopyText.includes('over the next 12 months');
  const includesIncreaseUtil = suggestedCopyText.includes('increase consultant utilization from 72% to 80%');
  const startsWithHighestPriority = suggestedCopyText.trim().startsWith('Our highest priority is');
  
  console.log('Includes "Primary strategic objective":', includesStrategic);
  console.log('Includes "reduce proposal preparation effort":', includesReduceEffort);
  console.log('Includes "over the next 12 months":', includesNext12);
  console.log('Includes "increase consultant utilization from 72% to 80%":', includesIncreaseUtil);
  console.log('Does NOT start with "Our highest priority is":', !startsWithHighestPriority);
  
  if (!includesStrategic || !includesReduceEffort || !includesNext12 || !includesIncreaseUtil || startsWithHighestPriority) {
    console.error('FAIL: Suggested Copy synthesis rules not satisfied for proposal creation answer!');
    process.exit(1);
  }

  // Verify Recommendation block for proposal creation answer
  const recommendationBox = document.querySelector('.meeting-recommendation-box');
  console.log('Recommendation text found:', recommendationBox ? recommendationBox.textContent : 'NOT FOUND');
  if (!recommendationBox) {
    console.error('FAIL: Recommendation block not found!');
    process.exit(1);
  }
  const recommendationText = recommendationBox.textContent;
  
  const hasStrategicObj = recommendationText.includes('clear priority');
  const hasPropPrep = recommendationText.includes('proposal preparation');
  const hasConsUtil = recommendationText.includes('resource utilization');
  const hasClarWhoOwns = recommendationText.includes('ownership remains unclear') || recommendationText.includes('will own this initiative');
  
  const hasForbiddenPhrase = [
    'Missing detail',
    'Insufficient',
    'Required field missing'
  ].some(phrase => recommendationText.toLowerCase().includes(phrase.toLowerCase()));

  const followUpEl = recommendationBox.querySelector('div');
  const followUpText = followUpEl ? followUpEl.textContent : '';
  console.log('Suggested follow-up text:', followUpText);
  const hasOwnershipAccountability = followUpText.toLowerCase().includes('own') && (followUpText.toLowerCase().includes('accountable') || followUpText.toLowerCase().includes('efficiency'));

  console.log('Includes expected terms:', hasStrategicObj && hasPropPrep && hasConsUtil && hasClarWhoOwns);
  console.log('Does NOT include forbidden terms:', !hasForbiddenPhrase);
  console.log('Suggested follow-up includes ownership/accountability:', hasOwnershipAccountability);

  if (!hasStrategicObj || !hasPropPrep || !hasConsUtil || !hasClarWhoOwns || hasForbiddenPhrase) {
    console.error('FAIL: Recommendation content requirements violated for proposal creation answer!');
    process.exit(1);
  }
  if (!hasOwnershipAccountability) {
    console.error('FAIL: Suggested follow-up does not include ownership/accountability terms!');
    process.exit(1);
  }

  // Verify AI Observations for proposal creation answer
  let aiObsElements = Array.from(document.querySelectorAll('.meeting-detected-info-panel li')).filter(li => li.textContent.includes('AI Observation'));
  console.log('Proposal AI Observations found:', aiObsElements.map(li => li.textContent));
  if (aiObsElements.length === 0) {
    console.error('FAIL: No AI Observations found in DOM for proposal creation answer!');
    process.exit(1);
  }
  const allProposalAiObsText = aiObsElements.map(li => li.textContent).join(' ');
  
  const hasExpectedProposalPhrase = [
    'Proposal preparation appears',
    'knowledge accessibility',
    'institutional knowledge',
    'consultant utilization appears'
  ].some(phrase => allProposalAiObsText.includes(phrase));
  
  const hasForbiddenProposalPhrase = [
    'manual entry workload',
    'production reporting',
    'inventory reporting'
  ].some(phrase => allProposalAiObsText.toLowerCase().includes(phrase));
  
  console.log('Includes expected proposal phrase:', hasExpectedProposalPhrase);
  console.log('Does NOT include forbidden proposal phrase:', !hasForbiddenProposalPhrase);
  
  if (!hasExpectedProposalPhrase || hasForbiddenProposalPhrase) {
    console.error('FAIL: AI Observation rules violated for proposal creation answer!');
    process.exit(1);
  }
  
  let themesContainer = document.getElementById('meeting-themes-container');
  console.log('Themes Text Content:', themesContainer.textContent);
  
  let hasProposalCreation = themesContainer.textContent.includes('Proposal Creation');
  let hasKnowledgeAccess = themesContainer.textContent.includes('Knowledge Access');
  let hasResourceUtilization = themesContainer.textContent.includes('Resource Utilization');
  let hasNoThemesText = themesContainer.textContent.includes('No themes identified yet.');
  
  console.log('Includes Proposal Creation:', hasProposalCreation);
  console.log('Includes Knowledge Access:', hasKnowledgeAccess);
  console.log('Includes Resource Utilization:', hasResourceUtilization);
  console.log('Does NOT show "No themes identified yet.":', !hasNoThemesText);
  
  if (!hasProposalCreation || !hasKnowledgeAccess || !hasResourceUtilization) {
    console.error('FAIL: Expected themes (Proposal Creation, Knowledge Access, Resource Utilization) not all present!');
    process.exit(1);
  }
  if (hasNoThemesText) {
    console.error('FAIL: "No themes identified yet." is displayed!');
    process.exit(1);
  }
  
  // Test manufacturing/reporting answer
  console.log('Testing manufacturing/reporting answer...');
  const mfgAnswer = `We manually compile reports using spreadsheets, which creates a process bottleneck and delays visibility for management.`;
  
  dynamicTextarea.value = mfgAnswer;
  dynamicTextarea.dispatchEvent(new dom.window.Event('input'));
  dynamicAnalyzeBtn.click();
  
  // Verify Suggested Copy for MFG answer
  const mfgSuggestedCopyDiv = document.getElementById('meeting-suggested-text');
  console.log('MFG Suggested Copy:', mfgSuggestedCopyDiv ? mfgSuggestedCopyDiv.textContent : 'NOT FOUND');
  if (!mfgSuggestedCopyDiv) {
    console.error('FAIL: MFG Suggested Copy block not found!');
    process.exit(1);
  }
  const mfgSuggestedText = mfgSuggestedCopyDiv.textContent;
  
  const mfgIsConversational = mfgSuggestedText.includes('We manually') || mfgSuggestedText.includes('which creates');
  console.log('MFG Suggested Copy is NOT conversational transcript:', !mfgIsConversational);
  if (mfgIsConversational) {
    console.error('FAIL: MFG Suggested Copy is conversational transcript!');
    process.exit(1);
  }

  // Verify AI Observations for MFG answer
  let mfgAiObsElements = Array.from(document.querySelectorAll('.meeting-detected-info-panel li')).filter(li => li.textContent.includes('AI Observation'));
  console.log('MFG AI Observations found:', mfgAiObsElements.map(li => li.textContent));
  if (mfgAiObsElements.length === 0) {
    console.error('FAIL: No MFG AI Observations found in DOM!');
    process.exit(1);
  }
  const allMfgAiObsText = mfgAiObsElements.map(li => li.textContent).join(' ');
  
  const hasExpectedMfgPhrase = [
    'manual consolidation',
    'delayed reporting cycles',
    'management visibility',
    'fragmented operational data'
  ].some(phrase => allMfgAiObsText.includes(phrase));
  
  console.log('Includes expected MFG phrase:', hasExpectedMfgPhrase);
  
  if (!hasExpectedMfgPhrase) {
    console.error('FAIL: Expected AI Observation phrase not found for MFG answer!');
    process.exit(1);
  }
  
  themesContainer = document.getElementById('meeting-themes-container');
  console.log('Themes Text Content (MFG):', themesContainer.textContent);
  
  let hasOperationalVisibility = themesContainer.textContent.includes('Operational Visibility');
  let hasManualReporting = themesContainer.textContent.includes('Manual Reporting');
  let hasProcessBottleneck = themesContainer.textContent.includes('Process Bottleneck');
  
  console.log('Includes Operational Visibility:', hasOperationalVisibility);
  console.log('Includes Manual Reporting:', hasManualReporting);
  console.log('Includes Process Bottleneck:', hasProcessBottleneck);
  
  if (!hasOperationalVisibility || !hasManualReporting || !hasProcessBottleneck) {
    console.error('FAIL: Expected MFG themes (Operational Visibility, Manual Reporting, Process Bottleneck) not all present!');
    process.exit(1);
  }
  
  console.log('DISCOVERY THEMES DETECTION and AI OBSERVATION VERIFICATION PASSED!\n');

  // --- TEST APPLY TO DISCOVERY INTAKE ---
  console.log('\n--- TEST APPLY TO DISCOVERY INTAKE ---');
  const applyIntakeBtn = document.getElementById('btn-meeting-apply-intake');
  console.log('Apply to Discovery Intake button exists:', !!applyIntakeBtn);
  if (!applyIntakeBtn) {
    console.error('FAIL: Apply to Discovery Intake button not found!');
    process.exit(1);
  }
  
  // Click Apply
  console.log('Clicking Apply to Discovery Intake...');
  applyIntakeBtn.click();
  
  let freshCompany = db.getCompany('nordic_precision');
  let appliedText = freshCompany.discoveryIntake.business.primaryGoals;
  console.log('Applied text in DB:', appliedText);
  if (appliedText !== mfgSuggestedText) {
    console.error(`FAIL: Expected applied text to match Suggested Copy. Got: "${appliedText}"`);
    process.exit(1);
  }
  
  // Click Apply again (test append behavior)
  console.log('Clicking Apply to Discovery Intake again...');
  applyIntakeBtn.click();
  
  freshCompany = db.getCompany('nordic_precision');
  let appendedText = freshCompany.discoveryIntake.business.primaryGoals;
  console.log('Appended text in DB:', appendedText);
  
  const expectedAppended = mfgSuggestedText + '\n\n' + mfgSuggestedText;
  if (appendedText !== expectedAppended) {
    console.error(`FAIL: Expected appended text to contain two copies separated by two line breaks. Got: "${appendedText}"`);
    process.exit(1);
  }
  
  // Verify AI Observations did not get written to Discovery Intake
  const containsAiObservation = appendedText.includes('Management visibility') || appendedText.includes('constrained by');
  console.log('Does NOT contain AI Observations:', !containsAiObservation);
  if (containsAiObservation) {
    console.error('FAIL: AI Observation was written into Discovery Intake!');
    process.exit(1);
  }
  
  // Test one non-business field navigation and apply
  console.log('Navigating to Systems > Current Systems...');
  for (let i = 0; i < 9; i++) {
    document.getElementById('btn-meeting-next').click();
  }
  
  let sysActiveField = document.querySelector('.meeting-question-header span:last-child').textContent.trim();
  console.log('Active Question Field (Systems):', sysActiveField);
  if (sysActiveField !== 'currentSystems') {
    console.error('FAIL: Expected to be on currentSystems question, got:', sysActiveField);
    process.exit(1);
  }
  
  const systemsAnswer = `We currently use SAP ERP and multiple local Excel spreadsheets.`;
  dynamicTextarea = document.getElementById('meeting-answer-input');
  dynamicTextarea.value = systemsAnswer;
  dynamicTextarea.dispatchEvent(new dom.window.Event('input'));
  dynamicAnalyzeBtn = document.getElementById('btn-meeting-analyze');
  dynamicAnalyzeBtn.click();
  
  const sysSuggestedCopyDiv = document.getElementById('meeting-suggested-text');
  if (!sysSuggestedCopyDiv) {
    console.error('FAIL: Systems Suggested Copy block not found!');
    process.exit(1);
  }
  const sysSuggestedText = sysSuggestedCopyDiv.textContent;
  console.log('Systems Suggested Text:', sysSuggestedText);
  
  const sysApplyBtn = document.getElementById('btn-meeting-apply-intake');
  console.log('Systems Apply button exists:', !!sysApplyBtn);
  sysApplyBtn.click();
  
  freshCompany = db.getCompany('nordic_precision');
  let sysAppliedText = freshCompany.discoveryIntake.systems.currentSystems;
  console.log('Systems applied text in DB:', sysAppliedText);
  if (sysAppliedText !== sysSuggestedText) {
    console.error(`FAIL: Expected systems applied text to match. Got: "${sysAppliedText}"`);
    process.exit(1);
  }
  
  // Verify that the view button is rendered
  const viewBtn = document.getElementById('btn-meeting-view-intake');
  console.log('View button exists:', !!viewBtn);
  if (!viewBtn) {
    console.error('FAIL: View in Discovery Intake button not found after successful apply!');
    process.exit(1);
  }
  
  // Navigate back to Business > Primary Goals to restore index or check exit
  console.log('Navigating back to index 0...');
  for (let i = 0; i < 9; i++) {
    document.getElementById('btn-meeting-prev').click();
  }

  // ====================================================
  // AI Observation Domain-Awareness Scenario Tests
  // ====================================================
  console.log('\n--- AI Observation Domain-Awareness Scenario Tests ---');

  // Test 1: Healthcare scheduling
  console.log('Running Test 1: Healthcare scheduling...');
  const companyHC = db.getCompany('nordic_precision');
  companyHC.industry = 'Healthcare';
  companyHC.description = 'Patient clinic scheduling network.';
  companyHC.assessment = {
    businessGoals: 'Reduce patient wait times and optimize clinician utilization.',
    coreProblems: '',
    operationalBottlenecks: '',
    techStack: ''
  };
  db.updateCompany(companyHC.id, companyHC);

  // Reset session to clean starting state for Test 1
  const sessionHC = {
    currentIndex: 0,
    answers: { expectedOutcomes: 'initial setup' },
    analysisResults: {},
    suggestedCopies: {},
    capturedFindings: [],
    completedQuestions: [],
    skippedQuestions: []
  };
  localStorage.setItem('oios_studio_copilot_session_nordic_precision', JSON.stringify(sessionHC));

  renderWorkspace(viewport, params);
  document.getElementById('btn-resume-copilot').click();

  let inputHC = document.getElementById('meeting-answer-input');
  let btnHC = document.getElementById('btn-meeting-analyze');
  inputHC.value = `Our highest priority is improving patient scheduling efficiency across all clinics. Currently, each location manages scheduling differently and staff spend significant time coordinating appointments manually. This creates scheduling conflicts, underutilized clinician capacity, and longer patient wait times. Over the next 12 months we want to standardize scheduling processes, improve visibility into available resources, and reduce appointment coordination effort by at least 40%. Success would mean shorter patient wait times, higher clinician utilization, and a more predictable scheduling experience across all facilities.`;
  inputHC.dispatchEvent(new dom.window.Event('input'));
  btnHC.click();

  let resContainerHC = document.getElementById('meeting-result-container');
  let textHC = resContainerHC.textContent.toLowerCase();
  console.log('HC Result Summary:', resContainerHC.textContent.trim());

  let hasExpectedHC = ['patient scheduling', 'clinic capacity', 'clinician utilization', 'patient wait times', 'appointment coordination', 'resource planning'].some(term => textHC.includes(term));
  let hasForbiddenHC = ['proposal', 'consultant', 'knowledge retrieval', 'production reporting', 'inventory reporting'].some(term => textHC.includes(term));

  console.log('Healthcare includes clinician utilization/scheduling terms:', hasExpectedHC);
  console.log('Healthcare does NOT leak consulting/proposal/manufacturing terms:', !hasForbiddenHC);

  if (!hasExpectedHC || hasForbiddenHC) {
    console.error('FAIL: Healthcare scheduling test failed!');
    process.exit(1);
  }

  // Validate recommendation safety
  const recBoxHC = document.querySelector('.meeting-recommendation-box');
  const recTextHC = recBoxHC ? recBoxHC.querySelector('span').textContent : '';
  const followUpTextHC = recBoxHC ? recBoxHC.textContent : '';
  validateRecommendationQuality(recTextHC, followUpTextHC, 'healthcare');

  // Click Save as Discovery Finding
  const saveBtnHC = document.getElementById('btn-card-save-discovery-finding');
  if (!saveBtnHC) {
    console.error('FAIL: Healthcare save button not found!');
    process.exit(1);
  }
  saveBtnHC.click();

  // Retrieve finding and validate
  const freshSessionHC = JSON.parse(localStorage.getItem('oios_studio_copilot_session_nordic_precision'));
  const lastFindingHC = freshSessionHC.capturedFindings[freshSessionHC.capturedFindings.length - 1];
  const suggestedCopyHC = document.getElementById('meeting-suggested-text').textContent;
  validateFindingQuality(lastFindingHC.suggestedCopy, 'healthcare', lastFindingHC.originalAnswer, suggestedCopyHC, isMeaningfulFinding);

  document.getElementById('btn-exit-meeting').click();

  // Test 2: Consulting proposal
  console.log('Running Test 2: Consulting proposal...');
  const companyConsulting = db.getCompany('nordic_precision');
  companyConsulting.industry = 'Consulting';
  companyConsulting.description = 'Management consulting services.';
  companyConsulting.assessment = {
    businessGoals: 'Improve proposal preparation.',
    coreProblems: '',
    operationalBottlenecks: '',
    techStack: ''
  };
  db.updateCompany(companyConsulting.id, companyConsulting);

  // Reset session to clean starting state for Test 2
  const sessionConsulting = {
    currentIndex: 0,
    answers: { expectedOutcomes: 'initial setup' },
    analysisResults: {},
    suggestedCopies: {},
    capturedFindings: [],
    completedQuestions: [],
    skippedQuestions: []
  };
  localStorage.setItem('oios_studio_copilot_session_nordic_precision', JSON.stringify(sessionConsulting));

  renderWorkspace(viewport, params);
  document.getElementById('btn-resume-copilot').click();

  let inputConsulting = document.getElementById('meeting-answer-input');
  let btnConsulting = document.getElementById('btn-meeting-analyze');
  inputConsulting.value = `Our highest priority is reducing proposal creation time. Today consultants spend a significant amount of time searching previous proposals, industry research, and internal frameworks before they can start drafting. This directly impacts consultant utilization and limits how many client engagements we can support. Over the next 12 months we want to reduce proposal preparation effort by at least 50% and increase consultant utilization from 72% to 80%.`;
  inputConsulting.dispatchEvent(new dom.window.Event('input'));
  btnConsulting.click();

  let resContainerConsulting = document.getElementById('meeting-result-container');
  let textConsulting = resContainerConsulting.textContent.toLowerCase();
  console.log('Consulting Result Summary:', resContainerConsulting.textContent.trim());

  let hasExpectedConsulting = ['proposal preparation', 'consultant utilization', 'institutional knowledge', 'knowledge accessibility'].some(term => textConsulting.includes(term));
  let hasForbiddenConsulting = ['patient scheduling', 'production reporting'].some(term => textConsulting.includes(term));

  console.log('Consulting includes consultant utilization/proposal terms:', hasExpectedConsulting);
  console.log('Consulting does NOT leak healthcare/manufacturing terms:', !hasForbiddenConsulting);

  if (!hasExpectedConsulting || hasForbiddenConsulting) {
    console.error('FAIL: Consulting proposal test failed!');
    process.exit(1);
  }

  // Validate recommendation safety
  const recBoxConsulting = document.querySelector('.meeting-recommendation-box');
  const recTextConsulting = recBoxConsulting ? recBoxConsulting.querySelector('span').textContent : '';
  const followUpTextConsulting = recBoxConsulting ? recBoxConsulting.textContent : '';
  validateRecommendationQuality(recTextConsulting, followUpTextConsulting, 'consulting');

  // Click Save as Discovery Finding
  const saveBtnConsulting = document.getElementById('btn-card-save-discovery-finding');
  if (!saveBtnConsulting) {
    console.error('FAIL: Consulting save button not found!');
    process.exit(1);
  }
  saveBtnConsulting.click();

  // Retrieve finding and validate
  const freshSessionConsulting = JSON.parse(localStorage.getItem('oios_studio_copilot_session_nordic_precision'));
  const lastFindingConsulting = freshSessionConsulting.capturedFindings[freshSessionConsulting.capturedFindings.length - 1];
  const suggestedCopyConsulting = document.getElementById('meeting-suggested-text').textContent;
  validateFindingQuality(lastFindingConsulting.suggestedCopy, 'consulting', lastFindingConsulting.originalAnswer, suggestedCopyConsulting, isMeaningfulFinding);

  document.getElementById('btn-exit-meeting').click();

  // Test 3: Manufacturing reporting
  console.log('Running Test 3: Manufacturing reporting...');
  const companyMfg = db.getCompany('nordic_precision');
  companyMfg.industry = 'Manufacturing';
  companyMfg.description = 'Turbine castings production.';
  companyMfg.assessment = {
    businessGoals: 'Improve management visibility.',
    coreProblems: '',
    operationalBottlenecks: '',
    techStack: ''
  };
  db.updateCompany(companyMfg.id, companyMfg);

  // Reset session to clean starting state for Test 3
  const sessionMfg = {
    currentIndex: 0,
    answers: { expectedOutcomes: 'initial setup' },
    analysisResults: {},
    suggestedCopies: {},
    capturedFindings: [],
    completedQuestions: [],
    skippedQuestions: []
  };
  localStorage.setItem('oios_studio_copilot_session_nordic_precision', JSON.stringify(sessionMfg));

  renderWorkspace(viewport, params);
  document.getElementById('btn-resume-copilot').click();

  let inputMfg = document.getElementById('meeting-answer-input');
  let btnMfg = document.getElementById('btn-meeting-analyze');
  inputMfg.value = `We manually compile reports using spreadsheets, which creates a process bottleneck and delays visibility for management. Production reports are assembled at the end of the week.`;
  inputMfg.dispatchEvent(new dom.window.Event('input'));
  btnMfg.click();

  let resContainerMfg = document.getElementById('meeting-result-container');
  let textMfg = resContainerMfg.textContent.toLowerCase();
  console.log('Mfg Result Summary:', resContainerMfg.textContent.trim());

  let hasExpectedMfg = ['reporting workflows', 'manual consolidation', 'fragmented operational data', 'management visibility'].some(term => textMfg.includes(term));
  let hasForbiddenMfg = ['proposal', 'consultant'].some(term => textMfg.includes(term));
  let hasProductionReporting = textMfg.includes('production reporting');

  console.log('Mfg includes reporting workflows/visibility terms:', hasExpectedMfg);
  console.log('Mfg does NOT leak consulting/proposal terms:', !hasForbiddenMfg);
  console.log('Mfg process is Production Reporting:', hasProductionReporting);

  if (!hasExpectedMfg || hasForbiddenMfg || !hasProductionReporting) {
    console.error('FAIL: Manufacturing reporting test failed!');
    process.exit(1);
  }

  // Validate recommendation safety
  const recBoxMfg = document.querySelector('.meeting-recommendation-box');
  const recTextMfg = recBoxMfg ? recBoxMfg.querySelector('span').textContent : '';
  const followUpTextMfg = recBoxMfg ? recBoxMfg.textContent : '';
  validateRecommendationQuality(recTextMfg, followUpTextMfg, 'manufacturing');

  // Click Save as Discovery Finding
  const saveBtnMfg = document.getElementById('btn-card-save-discovery-finding');
  if (!saveBtnMfg) {
    console.error('FAIL: Mfg save button not found!');
    process.exit(1);
  }
  saveBtnMfg.click();

  // Retrieve finding and validate
  const freshSessionMfg = JSON.parse(localStorage.getItem('oios_studio_copilot_session_nordic_precision'));
  const lastFindingMfg = freshSessionMfg.capturedFindings[freshSessionMfg.capturedFindings.length - 1];
  const suggestedCopyMfg = document.getElementById('meeting-suggested-text').textContent;
  validateFindingQuality(lastFindingMfg.suggestedCopy, 'manufacturing', lastFindingMfg.originalAnswer, suggestedCopyMfg, isMeaningfulFinding);

  document.getElementById('btn-exit-meeting').click();

  // Test 4: High-tech calibration
  console.log('Running Test 4: High-tech calibration...');
  const companyTech = db.getCompany('nordic_precision');
  companyTech.industry = 'Quantum Hardware';
  companyTech.description = 'Cryogenic controller compiler and hardware integration.';
  companyTech.assessment = {
    businessGoals: 'Reduce calibration cycles and integration overhead.',
    coreProblems: '',
    operationalBottlenecks: '',
    techStack: ''
  };
  db.updateCompany(companyTech.id, companyTech);

  // Reset session to clean starting state for Test 4
  const sessionTech = {
    currentIndex: 0,
    answers: { expectedOutcomes: 'initial setup' },
    analysisResults: {},
    suggestedCopies: {},
    capturedFindings: [],
    completedQuestions: [],
    skippedQuestions: []
  };
  localStorage.setItem('oios_studio_copilot_session_nordic_precision', JSON.stringify(sessionTech));

  renderWorkspace(viewport, params);
  document.getElementById('btn-resume-copilot').click();

  let inputTech = document.getElementById('meeting-answer-input');
  let btnTech = document.getElementById('btn-meeting-analyze');
  inputTech.value = `Engineering workflow performance is affected by manual calibration coordination between hardware and software teams. The testbed needs frequent alignment. We also need to check utilization of testbeds.`;
  inputTech.dispatchEvent(new dom.window.Event('input'));
  btnTech.click();

  let resContainerTech = document.getElementById('meeting-result-container');
  let textTech = resContainerTech.textContent.toLowerCase();
  console.log('HighTech Result Summary:', resContainerTech.textContent.trim());

  let hasExpectedTech = ['engineering workflow', 'calibration coordination', 'hardware/software integration', 'testbed or lab visibility', 'engineering utilization'].some(term => textTech.includes(term));
  let hasForbiddenTech = ['healthcare', 'consulting', 'consultant'].some(term => textTech.includes(term));

  console.log('HighTech includes engineering/calibration/utilization terms:', hasExpectedTech);
  console.log('HighTech does NOT leak healthcare/consulting terms:', !hasForbiddenTech);

  if (!hasExpectedTech || hasForbiddenTech) {
    console.error('FAIL: High-tech calibration test failed!');
    process.exit(1);
  }

  // Click Save as Discovery Finding
  const saveBtnTech = document.getElementById('btn-card-save-discovery-finding');
  if (!saveBtnTech) {
    console.error('FAIL: HighTech save button not found!');
    process.exit(1);
  }
  saveBtnTech.click();

  // Retrieve finding and validate
  const freshSessionTech = JSON.parse(localStorage.getItem('oios_studio_copilot_session_nordic_precision'));
  const lastFindingTech = freshSessionTech.capturedFindings[freshSessionTech.capturedFindings.length - 1];
  const suggestedCopyTech = document.getElementById('meeting-suggested-text').textContent;
  validateFindingQuality(lastFindingTech.suggestedCopy, 'hightech', lastFindingTech.originalAnswer, suggestedCopyTech, isMeaningfulFinding);

  document.getElementById('btn-exit-meeting').click();

  // Test 5: Generic operations
  console.log('Running Test 5: Generic operations...');
  const companyGeneric = db.getCompany('nordic_precision');
  companyGeneric.industry = 'General Operations';
  companyGeneric.description = 'Standard operational services.';
  companyGeneric.assessment = {
    businessGoals: 'Improve overall efficiency.',
    coreProblems: '',
    operationalBottlenecks: '',
    techStack: ''
  };
  db.updateCompany(companyGeneric.id, companyGeneric);

  // Reset session to clean starting state for Test 5
  const sessionGeneric = {
    currentIndex: 0,
    answers: { expectedOutcomes: 'initial setup' },
    analysisResults: {},
    suggestedCopies: {},
    capturedFindings: [],
    completedQuestions: [],
    skippedQuestions: []
  };
  localStorage.setItem('oios_studio_copilot_session_nordic_precision', JSON.stringify(sessionGeneric));

  renderWorkspace(viewport, params);
  document.getElementById('btn-resume-copilot').click();

  let inputGeneric = document.getElementById('meeting-answer-input');
  let btnGeneric = document.getElementById('btn-meeting-analyze');
  inputGeneric.value = `We want to make the reporting workflow more efficient, reduce cycle time, and get better visibility.`;
  inputGeneric.dispatchEvent(new dom.window.Event('input'));
  btnGeneric.click();

  let resContainerGeneric = document.getElementById('meeting-result-container');
  let textGeneric = resContainerGeneric.textContent.toLowerCase();
  console.log('Generic Result Summary:', resContainerGeneric.textContent.trim());

  let hasForbiddenGeneric = ['proposal', 'consultant', 'patient', 'clinician', 'production', 'calibration'].some(term => textGeneric.includes(term));
  let hasOperationalReporting = textGeneric.includes('operational reporting');

  console.log('Generic does NOT contain industry-specific nouns:', !hasForbiddenGeneric);
  console.log('Generic process is Operational Reporting:', hasOperationalReporting);

  if (hasForbiddenGeneric || !hasOperationalReporting) {
    console.error('FAIL: Generic operations test failed!');
    process.exit(1);
  }

  // Validate recommendation safety
  const recBoxGeneric = document.querySelector('.meeting-recommendation-box');
  const recTextGeneric = recBoxGeneric ? recBoxGeneric.querySelector('span').textContent : '';
  const followUpTextGeneric = recBoxGeneric ? recBoxGeneric.textContent : '';
  validateRecommendationQuality(recTextGeneric, followUpTextGeneric, 'generic');

  // Click Save as Discovery Finding
  const saveBtnGeneric = document.getElementById('btn-card-save-discovery-finding');
  if (!saveBtnGeneric) {
    console.error('FAIL: Generic save button not found!');
    process.exit(1);
  }
  saveBtnGeneric.click();

  // Retrieve finding and validate
  const freshSessionGeneric = JSON.parse(localStorage.getItem('oios_studio_copilot_session_nordic_precision'));
  const lastFindingGeneric = freshSessionGeneric.capturedFindings[freshSessionGeneric.capturedFindings.length - 1];
  const suggestedCopyGeneric = document.getElementById('meeting-suggested-text').textContent;
  validateFindingQuality(lastFindingGeneric.suggestedCopy, 'generic', lastFindingGeneric.originalAnswer, suggestedCopyGeneric, isMeaningfulFinding);

  document.getElementById('btn-exit-meeting').click();

  // Test 6: SaaS / Software Operations (High-tech Software sub-domain)
  console.log('\nRunning Test 6: SaaS / Software Operations...');
  const companySaaS = db.getCompany('nordic_precision');
  companySaaS.industry = 'SaaS';
  companySaaS.description = 'Cloud-based monitoring and alert routing system.';
  companySaaS.assessment = {
    businessGoals: 'Optimize software deployment pipelines and incident response times.',
    coreProblems: 'Fragmented monitoring tools lead to alert fatigue.',
    operationalBottlenecks: 'Manual alert routing and incident coordination.',
    techStack: 'AWS, GitHub, Datadog, Splunk, PagerDuty'
  };
  db.updateCompany(companySaaS.id, companySaaS);

  // Reset session to clean starting state for Test 6
  const sessionSaaS = {
    currentIndex: 0,
    answers: { expectedOutcomes: 'initial setup' },
    analysisResults: {},
    suggestedCopies: {},
    capturedFindings: [],
    completedQuestions: [],
    skippedQuestions: []
  };
  localStorage.setItem('oios_studio_copilot_session_nordic_precision', JSON.stringify(sessionSaaS));

  renderWorkspace(viewport, params);
  document.getElementById('btn-resume-copilot').click();

  let inputSaaS = document.getElementById('meeting-answer-input');
  let btnSaaS = document.getElementById('btn-meeting-analyze');
  inputSaaS.value = `Our software operations team experiences manual alert triaging bottlenecks. Tool fragmentation across Splunk and Datadog affects engineering visibility. Incident routing takes too long.`;
  inputSaaS.dispatchEvent(new dom.window.Event('input'));
  btnSaaS.click();

  let resContainerSaaS = document.getElementById('meeting-result-container');
  let textSaaS = resContainerSaaS.textContent.toLowerCase();
  console.log('SaaS Result Summary:', resContainerSaaS.textContent.trim());

  let hasExpectedSaaS = ['monitoring', 'incident', 'software deployment', 'alert', 'engineering utilization'].some(term => textSaaS.includes(term));
  let hasForbiddenSaaS = ['calibration', 'hardware team', 'hardware and software teams', 'testbed', 'fpga', 'quantum', 'clinician', 'patient', 'consultant'].some(term => textSaaS.includes(term));

  console.log('SaaS includes monitoring/incident/alert terms:', hasExpectedSaaS);
  console.log('SaaS does NOT leak hardware/calibration terms:', !hasForbiddenSaaS);

  if (!hasExpectedSaaS || hasForbiddenSaaS) {
    console.error('FAIL: SaaS Software Operations test failed!');
    process.exit(1);
  }

  // Validate recommendation safety
  const recBoxSaaS = document.querySelector('.meeting-recommendation-box');
  const recTextSaaS = recBoxSaaS ? recBoxSaaS.querySelector('span').textContent : '';
  const followUpTextSaaS = recBoxSaaS ? recBoxSaaS.textContent : '';
  
  // Custom checks for SaaS recommendation
  const hasValidationPhrasesSaaS = /accepted|strong enough|proceed to the next question/i.test(recTextSaaS);
  const hasExpectedSaaSRecommendation = recTextSaaS.toLowerCase().includes('monitoring') || recTextSaaS.toLowerCase().includes('incident');
  const hasForbiddenSaaSRecommendation = /calibration|lab operations|hardware/i.test(recTextSaaS) || /calibration|lab operations|hardware/i.test(followUpTextSaaS);
  
  console.log('SaaS recommendation does NOT include validator phrases:', !hasValidationPhrasesSaaS);
  console.log('SaaS recommendation includes software/monitoring terms:', hasExpectedSaaSRecommendation);
  console.log('SaaS recommendation does NOT leak hardware/calibration terms:', !hasForbiddenSaaSRecommendation);

  if (hasValidationPhrasesSaaS || !hasExpectedSaaSRecommendation || hasForbiddenSaaSRecommendation) {
    console.error('FAIL: SaaS Recommendation validation failed!');
    process.exit(1);
  }

  // Click Save as Discovery Finding
  const saveBtnSaaS = document.getElementById('btn-card-save-discovery-finding');
  if (!saveBtnSaaS) {
    console.error('FAIL: SaaS save button not found!');
    process.exit(1);
  }
  saveBtnSaaS.click();

  // Retrieve finding and validate
  const freshSessionSaaS = JSON.parse(localStorage.getItem('oios_studio_copilot_session_nordic_precision'));
  const lastFindingSaaS = freshSessionSaaS.capturedFindings[freshSessionSaaS.capturedFindings.length - 1];
  const suggestedCopySaaS = document.getElementById('meeting-suggested-text').textContent;
  validateFindingQuality(lastFindingSaaS.suggestedCopy, 'hightech_software', lastFindingSaaS.originalAnswer, suggestedCopySaaS, isMeaningfulFinding);

  document.getElementById('btn-exit-meeting').click();

  // Test 7: Legal Scenario - Field-Specific Findings validation
  console.log('\nRunning Test 7: Legal Scenario (Field-Specific Finding Content Redesign)...');
  const companyLegal = {
    id: 'nordic_precision', // Reusing ID to avoid state complexity
    name: 'Legal Partners LLC',
    industry: 'Legal',
    assessment: {
      businessGoals: 'Reduce manual document review effort and improve matter context visibility.',
      coreProblems: 'Document retrieval takes too long.',
      operationalBottlenecks: 'Manual review of case files.',
      techStack: 'Clio, NetDocuments, Outlook, Teams, SharePoint, Excel'
    }
  };

  const testCases = [
    {
      field: 'primaryGoals',
      section: 'Business',
      answer: 'Our primary goal is to improve matter visibility across practice groups and optimize case workload tracking.',
      suggestedCopy: 'Improve matter visibility and case tracking.',
      checks: [
        { regex: /strategic priority|optimize|matter visibility/i, name: 'strategic/business priority focus' }
      ]
    },
    {
      field: 'expectedOutcomes',
      section: 'Business',
      answer: 'We expect to reduce manual document review and case retrieval time by 40% over the next quarter.',
      suggestedCopy: 'Reduce manual document review by 40%.',
      checks: [
        { regex: /expect.*measurable outcomes|target.*improvement/i, name: 'outcome/KPI focus' }
      ]
    },
    {
      field: 'decisionMakers',
      section: 'People',
      answer: 'The Managing Partner and the Executive Leadership Committee approve all budget allocations, while Legal Operations owns execution.',
      suggestedCopy: 'Managing Partner and Executive Committee approve, Legal Ops owns.',
      checks: [
        { regex: /governance|approval|ownership/i, name: 'governance/authority/ownership language' }
      ]
    },
    {
      field: 'affectedTeams',
      section: 'People',
      answer: 'Attorneys, paralegals, and legal assistants will see direct impacts on their daily work processes.',
      suggestedCopy: 'Attorneys and paralegals are affected.',
      checks: [
        { regex: /affected|impact|attorney|paralegal/i, name: 'affected teams/change impact language' }
      ]
    },
    {
      field: 'integrations',
      section: 'Systems',
      answer: 'Our core systems are Clio and NetDocuments, but we manually copy and consolidate report data from Excel sheets.',
      suggestedCopy: 'Clio and NetDocuments require manual consolidation.',
      checks: [
        { regex: /integrat|data flow|manual consolidation/i, name: 'integrations/data flow/manual consolidation language' }
      ]
    },
    {
      field: 'technologyIssues',
      section: 'Systems',
      answer: 'The search tools are slow and we lack a central dashboard, making cross-system search impossible.',
      suggestedCopy: 'No unified search or dashboard across systems.',
      checks: [
        { regex: /technology limitation|unified visibility|search|dashboard/i, name: 'technology limitation/unified visibility/search/dashboard language' }
      ]
    },
    {
      field: 'reports',
      section: 'Data',
      answer: 'Leadership relies on weekly retrospective utilization reports compiled manually by staff.',
      suggestedCopy: 'Retrospective reports compiled manually.',
      checks: [
        { regex: /report|dashboard|reporting/i, name: 'reports/dashboard/reporting language' }
      ]
    },
    {
      field: 'kpis',
      section: 'Data',
      answer: 'We track lawyer utilization rate and client matter cycle times as our primary performance targets.',
      suggestedCopy: 'Track lawyer utilization and matter cycle times.',
      checks: [
        { regex: /KPI|measurement|target/i, name: 'KPI/measurement/target language' }
      ]
    },
    {
      field: 'dataSources',
      section: 'Data',
      answer: 'Case records and communications are saved in NetDocuments, Clio, and local drives, serving as our system-of-record.',
      suggestedCopy: 'NetDocuments and Clio serve as system-of-record.',
      checks: [
        { regex: /data sources|data foundation|system-of-record/i, name: 'data sources/data foundation/system-of-record language' }
      ]
    }
  ];

  const generatedFindings = {};

  for (const tc of testCases) {
    const question = { section: tc.section, field: tc.field };
    const finding = generateDiscoveryFinding(tc.answer, question, companyLegal, {}, tc.suggestedCopy);
    
    console.log(`Generated finding for ${tc.section}.${tc.field}: "${finding}"`);
    
    // Check conciseness (1-3 sentences)
    const sentences = finding.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]+/g) || [finding];
    const sentenceCount = sentences.length;
    if (sentenceCount < 1 || sentenceCount > 3) {
      console.error(`FAIL: Finding for ${tc.section}.${tc.field} is not concise! (${sentenceCount} sentences)`);
      process.exit(1);
    }
    
    // Check required regexes
    for (const check of tc.checks) {
      if (!check.regex.test(finding)) {
        console.error(`FAIL: Finding for ${tc.section}.${tc.field} does not contain ${check.name}! (Regex: ${check.regex})`);
        process.exit(1);
      }
    }
    
    generatedFindings[`${tc.section}.${tc.field}`] = finding;
  }

  // Verify Primary Goals differs from Expected Outcomes
  const primaryGoalsFinding = generatedFindings['Business.primaryGoals'];
  const expectedOutcomesFinding = generatedFindings['Business.expectedOutcomes'];
  console.log('Primary Goals finding differs from Expected Outcomes finding:', primaryGoalsFinding !== expectedOutcomesFinding);
  if (primaryGoalsFinding === expectedOutcomesFinding) {
    console.error('FAIL: Primary Goals finding is identical to Expected Outcomes finding!');
    process.exit(1);
  }

  // Verify findings are not all duplicates
  const allFindings = Object.values(generatedFindings);
  const uniqueFindings = new Set(allFindings);
  console.log(`Unique findings count: ${uniqueFindings.size} of ${allFindings.length}`);
  if (uniqueFindings.size < allFindings.length) {
    console.error('FAIL: Legal test produced duplicate findings!');
    process.exit(1);
  }

  // Re-open and verify UI-driven exit session
  document.getElementById('btn-resume-copilot').click();

  // 11. Test Exit Session
  const exitBtn = document.getElementById('btn-exit-meeting');
  console.log('Exit Session button exists:', !!exitBtn);
  if (exitBtn) {
    exitBtn.click();
    console.log('Overlay removed from DOM on Exit:', !document.getElementById('meeting-mode-overlay'));
  }

  console.log('\nALL UX REFINEMENT TESTS PASSED!');
  process.exit(0);
}

runTest();
