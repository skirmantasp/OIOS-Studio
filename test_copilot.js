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

async function runTest() {
  console.log('Importing modules...');
  const { db } = await import('file:///c:/Users/skirm/Desktop/OIOS Studio/js/state.js');
  const { default: renderWorkspace } = await import('file:///c:/Users/skirm/Desktop/OIOS Studio/js/pages/workspace.js');

  const viewport = document.getElementById('app-viewport');
  const params = new URLSearchParams('id=nordic_precision&tab=Discovery Intake');

  console.log('Rendering Discovery Intake page...');
  renderWorkspace(viewport, params);

  // Check if Guided Discovery Copilot Banner is rendered
  const banner = document.getElementById('btn-start-copilot');
  console.log('Start Copilot button exists:', !!banner);
  if (!banner) {
    console.error('FAIL: Start Copilot button not found!');
    process.exit(1);
  }

  // Click start copilot
  console.log('Clicking "Start Guided Discovery"...');
  banner.click();

  // Check if meeting mode overlay is created
  const overlay = document.getElementById('meeting-mode-overlay');
  console.log('Meeting mode overlay created in DOM:', !!overlay);
  if (!overlay) {
    console.error('FAIL: Meeting mode overlay not found in DOM!');
    process.exit(1);
  }

  // Check that the question text is assessment-aware
  const questionDisplay = document.getElementById('meeting-question-display');
  console.log('Question display element exists:', !!questionDisplay);
  if (!questionDisplay) {
    console.error('FAIL: Question display element not found!');
    process.exit(1);
  }
  const qText = questionDisplay.textContent.trim();
  console.log('Question text:', qText);
  const isAssessmentAware = qText.includes('Based on your assessment, you mentioned goals like');
  console.log('Question text is assessment-aware:', isAssessmentAware);
  if (!isAssessmentAware) {
    console.error('FAIL: Question text is not assessment-aware!');
    process.exit(1);
  }

  // Let's test the answer input and evaluation
  const answerTextarea = document.getElementById('meeting-answer-input');
  const analyzeBtn = document.getElementById('btn-meeting-analyze');
  console.log('Answer textarea exists:', !!answerTextarea);
  console.log('Analyze button exists:', !!analyzeBtn);

  if (!answerTextarea || !analyzeBtn) {
    console.error('FAIL: Controls not found inside active question card!');
    process.exit(1);
  }

  // 1. Test Weak Answer (Needs follow-up)
  console.log('Submitting a weak answer...');
  answerTextarea.value = 'We use Excel.';
  // Trigger input event to save draft
  answerTextarea.dispatchEvent(new dom.window.Event('input'));
  analyzeBtn.click();

  let resultContainer = document.getElementById('meeting-result-container');
  console.log('Result box contains "Needs follow-up":', resultContainer.textContent.includes('Needs follow-up'));
  if (!resultContainer.textContent.includes('Needs follow-up')) {
    console.error('FAIL: Weak answer did not trigger follow-up status!');
    process.exit(1);
  }

  // 2. Test Ask Follow-up button
  const askFollowUpBtn = document.getElementById('btn-meeting-ask-follow-up');
  console.log('Ask Follow-up button exists:', !!askFollowUpBtn);
  if (askFollowUpBtn) {
    askFollowUpBtn.click();
    console.log('Textarea updated with follow-up string:', answerTextarea.value.includes('Follow-up:'));
  }

  // 3. Test Sufficient Answer
  console.log('Submitting a sufficient answer...');
  // Question 1 is Business > Primary Goals. Needs goal keywords, motivation, and timeline
  answerTextarea.value = 'Our primary goal is to reduce manual reporting work by next month because we need to save time for supervisors.';
  answerTextarea.dispatchEvent(new dom.window.Event('input'));
  analyzeBtn.click();

  resultContainer = document.getElementById('meeting-result-container');
  console.log('Result box contains "Answer is sufficient":', resultContainer.textContent.includes('Answer is sufficient'));
  if (!resultContainer.textContent.includes('Answer is sufficient')) {
    console.error('FAIL: Strong answer did not trigger sufficient status!');
    process.exit(1);
  }

  // 4. Test Suggested Copy section
  console.log('Suggested copy text block rendered:', !!document.getElementById('meeting-suggested-text'));
  const copyBtn = document.getElementById('btn-meeting-copy-text');
  console.log('Copy Suggested Text button exists:', !!copyBtn);
  if (copyBtn) {
    copyBtn.click();
    console.log('Text copied to simulated clipboard:', navigator.clipboard.lastCopied);
    if (!navigator.clipboard.lastCopied.includes('Our primary goal is to reduce manual reporting work by next month because we need to save time for supervisors.')) {
      console.error('FAIL: Copied text mismatch!');
      process.exit(1);
    }
  }

  // 5. Test Mark Closed and Auto-Advance
  const markCompleteBtn = document.getElementById('btn-meeting-complete');
  console.log('Mark Question Complete button exists:', !!markCompleteBtn);
  if (markCompleteBtn) {
    markCompleteBtn.click();
    // Re-evaluate index
    const sessionStr = localStorage.getItem('oios_studio_copilot_session_nordic_precision');
    const session = JSON.parse(sessionStr);
    console.log('New active question index advanced:', session.currentIndex > 0);
    console.log('First question marked completed in session:', session.completedQuestions.includes('primaryGoals'));
    if (session.currentIndex === 0) {
      console.error('FAIL: Copilot did not advance the question index!');
      process.exit(1);
    }
  }

  // 6. Test Exit Session
  const exitBtn = document.getElementById('btn-exit-meeting');
  console.log('Exit Session button exists:', !!exitBtn);
  if (exitBtn) {
    exitBtn.click();
    console.log('Overlay removed from DOM:', !document.getElementById('meeting-mode-overlay'));
  }

  console.log('\nALL COPILOT AND SUGGESTED COPY TESTS PASSED!');
  process.exit(0);
}

runTest();
