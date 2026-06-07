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

async function runTest() {
  console.log('Importing modules...');
  const { db } = await import('file:///c:/Users/skirm/Desktop/OIOS Studio/js/state.js');
  const { default: renderWorkspace } = await import('file:///c:/Users/skirm/Desktop/OIOS Studio/js/pages/workspace.js');

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

  // 4. Verify rename of "Capture Finding" button to "Capture This Finding" and initial disabled state
  const getCaptureBtn = () => document.getElementById('btn-meeting-complete');
  console.log('Capture Finding button exists:', !!getCaptureBtn());
  console.log('Capture Finding button text:', getCaptureBtn().textContent.trim());
  if (!getCaptureBtn() || getCaptureBtn().textContent.trim() !== 'Capture This Finding') {
    console.error('FAIL: Primary button not renamed to Capture This Finding!');
    process.exit(1);
  }
  console.log('Capture Finding button is initially disabled:', getCaptureBtn().disabled);
  if (!getCaptureBtn().disabled) {
    console.error('FAIL: Capture button should be disabled initially!');
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
  
  console.log('Capture button is disabled on text input:', getCaptureBtn().disabled);
  if (!getCaptureBtn().disabled) {
    console.error('FAIL: Capture button should be disabled on text input!');
    process.exit(1);
  }

  analyzeBtn.click();
  
  console.log('Capture button is enabled after analyze:', !getCaptureBtn().disabled);
  if (getCaptureBtn().disabled) {
    console.error('FAIL: Capture button should be enabled after analysis!');
    process.exit(1);
  }

  // Verify that editing the answer disables the Capture button again
  answerTextarea.value = 'We consolidate data using Excel manually to compile reports. (edited)';
  answerTextarea.dispatchEvent(new dom.window.Event('input'));
  console.log('Capture button is disabled after edit:', getCaptureBtn().disabled);
  if (!getCaptureBtn().disabled) {
    console.error('FAIL: Capture button should be disabled after editing the answer!');
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
  console.log('Clicking "Capture This Finding"...');
  const activeCaptureBtn = document.getElementById('btn-meeting-complete');
  activeCaptureBtn.click();

  // Click Save Finding button in the modal to complete the action
  const saveFindingBtn = document.getElementById('modal-save-finding');
  console.log('Save Finding button exists in modal:', !!saveFindingBtn);
  if (saveFindingBtn) {
    saveFindingBtn.click();
  } else {
    console.error('FAIL: Save Finding button not found in modal!');
    process.exit(1);
  }

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
  console.log('Navigating to Business > Primary Goals...');
  document.getElementById('btn-meeting-prev').click();
  document.getElementById('btn-meeting-prev').click();

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
  
  let themesContainer = document.getElementById('meeting-themes-container');
  console.log('Themes Text Content:', themesContainer.textContent);
  
  let hasProposalCreation = themesContainer.textContent.includes('Proposal Creation');
  let hasKnowledgeAccess = themesContainer.textContent.includes('Knowledge Access');
  let hasConsultantUtilization = themesContainer.textContent.includes('Consultant Utilization');
  let hasNoThemesText = themesContainer.textContent.includes('No themes identified yet.');
  
  console.log('Includes Proposal Creation:', hasProposalCreation);
  console.log('Includes Knowledge Access:', hasKnowledgeAccess);
  console.log('Includes Consultant Utilization:', hasConsultantUtilization);
  console.log('Does NOT show "No themes identified yet.":', !hasNoThemesText);
  
  if (!hasProposalCreation || !hasKnowledgeAccess || !hasConsultantUtilization) {
    console.error('FAIL: Expected themes (Proposal Creation, Knowledge Access, Consultant Utilization) not all present!');
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
  
  console.log('DISCOVERY THEMES DETECTION VERIFICATION PASSED!\n');

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
