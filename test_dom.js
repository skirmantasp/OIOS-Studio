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
    <div id="app-viewport"></div>
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

// Mock external CDNs
global.window.lucide = {
  createIcons: () => {
    const icons = document.querySelectorAll('i[data-lucide]');
    icons.forEach(icon => {
      icon.innerHTML = `[${icon.getAttribute('data-lucide')}]`;
    });
  }
};
global.window.marked = {
  parse: (x) => x
};

// Seed database with Nordic Precision Components and its 4 insights
const initialData = {
  companies: [
    {
      id: 'nordic_precision',
      name: 'Nordic Precision Components',
      industry: 'Manufacturing',
      status: 'active',
      stage: 'Discovery',
      createdAt: '2026-06-06T12:00:00.000Z',
      description: 'Precision component manufacturing.',
      website: '',
      contactName: '',
      contactEmail: '',
      assessment: {
        businessGoals: '',
        coreProblems: '',
        operationalBottlenecks: '',
        techStack: ''
      },
      discoveryIntake: {
        business: { primaryGoals: '', expectedOutcomes: '', currentChallenges: 'Reporting data is fragmented across multiple spreadsheets and systems.' },
        people:   { decisionMakers: '', affectedTeams: '', keyStakeholders: '' },
        process:  { coreProcesses: '', knownBottlenecks: 'Manual data consolidation and duplicate data entry.', manualWorkAreas: 'Copying data manually between systems, causing delays for affected teams and stakeholders.' },
        systems:  { currentSystems: 'Excel, SAP ERP, Power BI', integrations: '', technologyIssues: '' },
        data:     { reports: '', kpis: '', dataSources: '' }
      }
    }
  ],
  discoveryNotes: [
    {
      id: 'note_1',
      companyId: 'nordic_precision',
      title: 'Production Reporting Workflow Review',
      category: 'document_review',
      source: 'discovery_intake',
      generatedNoteType: 'reporting',
      content: 'Reporting data is fragmented across multiple spreadsheets and systems. Manual data consolidation and duplicate data entry.'
    },
    {
      id: 'note_2',
      companyId: 'nordic_precision',
      title: 'Systems Integration & Data Flow Review',
      category: 'document_review',
      source: 'discovery_intake',
      generatedNoteType: 'systems',
      content: 'Current systems include Excel, SAP ERP, Power BI. Lack of integration causing manual work.'
    },
    {
      id: 'note_3',
      companyId: 'nordic_precision',
      title: 'Maintenance Records Process Observation',
      category: 'observation',
      source: 'discovery_intake',
      generatedNoteType: 'manual',
      content: 'Manual record updates. Manually transcribing maintenance reports.'
    },
    {
      id: 'note_4',
      companyId: 'nordic_precision',
      title: 'Inventory Data Visibility Review',
      category: 'document_review',
      source: 'discovery_intake',
      generatedNoteType: 'inventory',
      content: 'No stock visibility in warehouse. Inventory planning is highly unreliable.'
    },
    {
      id: 'note_5',
      companyId: 'nordic_precision',
      title: 'Stakeholder Alignment Interview',
      category: 'interview',
      source: 'discovery_intake',
      generatedNoteType: 'stakeholder',
      content: 'Stakeholder alignment is critical. Need buy-in from department managers and executive leadership.'
    }
  ],
  insights: [
    {
      id: 'ins_1',
      companyId: 'nordic_precision',
      title: 'Fragmented System Landscape Limits Real-Time Reporting',
      description: 'Discovery notes show that reporting, maintenance, and inventory information is spread across Excel, SAP ERP, Power BI...',
      category: 'data',
      impact: 'high',
      sourceNotes: ['note_1', 'note_2']
    },
    {
      id: 'ins_2',
      companyId: 'nordic_precision',
      title: 'Manual Reporting Workflows Create Administrative Bottlenecks',
      description: 'A manual process is used to compile weekly reports. Staff spend significant time transcribing...',
      category: 'process',
      impact: 'high',
      sourceNotes: ['note_3']
    },
    {
      id: 'ins_3',
      companyId: 'nordic_precision',
      title: 'Inventory Visibility Gaps May Affect Planning Reliability',
      description: 'Lack of real-time stock levels in the warehouse limits planning...',
      category: 'data',
      impact: 'medium',
      sourceNotes: ['note_4']
    },
    {
      id: 'ins_4',
      companyId: 'nordic_precision',
      title: 'Stakeholder Alignment Is Needed Before Workflow Redesign',
      description: 'Key stakeholders, including department managers and executive leadership, need to be aligned...',
      category: 'people',
      impact: 'medium',
      sourceNotes: ['note_5']
    }
  ],
  systemIdeas: [
    {
      id: 'idea_existing',
      companyId: 'nordic_precision',
      title: 'Unified Operations Data Hub',
      description: 'Existing hub proposal.',
      status: 'backlog',
      priority: 'high',
      feasibility: 'moderate',
      linkedInsights: ['ins_1']
    }
  ],
  projects: [],
  reports: [],
  nextActions: []
};

localStorage.setItem('oios_studio_db_v1', JSON.stringify(initialData));

async function runAudit() {
  console.log('Importing modules...');
  const { db } = await import('file:///c:/Users/skirm/Desktop/OIOS Studio/js/state.js');
  const { default: renderWorkspace } = await import('file:///c:/Users/skirm/Desktop/OIOS Studio/js/pages/workspace.js');

  const viewport = document.getElementById('app-viewport');
  const params = new URLSearchParams('id=nordic_precision&tab=System Ideas');

  console.log('Rendering workspace...');
  renderWorkspace(viewport, params);

  console.log('--- 1. UI VERIFICATION ---');
  const genBtn = document.getElementById('btn-generate-ideas');
  const addBtn = document.getElementById('btn-add-idea');
  console.log('Button "Generate System Ideas From Insights" exists:', !!genBtn);
  console.log('Button "Formulate System Idea" exists:', !!addBtn);

  if (!genBtn || !addBtn) {
    console.error('FAIL: Buttons not found');
    process.exit(1);
  }

  // Click Generate Button
  console.log('\n--- 2. SUGGESTION GENERATION ---');
  genBtn.click();

  const modalTitle = document.getElementById('modal-title');
  console.log('Modal title:', modalTitle ? modalTitle.textContent : 'none');

  const cards = document.querySelectorAll('#modal-body-content .card');
  console.log('Number of suggestions generated:', cards.length);

  const generatedSuggestions = [];
  cards.forEach((card, idx) => {
    const title = card.querySelector('.idea-title-input').value;
    const priority = card.querySelector('.idea-priority-select').value;
    const feasibility = card.querySelector('.idea-feasibility-select').value;
    const status = card.querySelector('.idea-status-select').value;
    const description = card.querySelector('.idea-description-textarea').value;
    
    const insightItems = card.querySelectorAll('ul li');
    const linkedInsights = [];
    insightItems.forEach(li => {
      linkedInsights.push(li.textContent.trim());
    });

    generatedSuggestions.push({
      title,
      priority,
      feasibility,
      status,
      description,
      linkedInsights
    });

    console.log(`\nSuggestion #${idx + 1}:`);
    console.log(`Title: ${title}`);
    console.log(`Priority: ${priority}`);
    console.log(`Feasibility: ${feasibility}`);
    console.log(`Status: ${status}`);
    console.log(`Description: ${description}`);
    console.log(`Linked Insights: ${linkedInsights.join(', ')}`);
  });

  console.log('\n--- 3. INSIGHT MAPPING VERIFICATION ---');
  // Expected suggestions and what they should link to
  // - "Automated Reporting & KPI Pipeline" should only link to "Manual Reporting Workflows Create Administrative Bottlenecks" (ins_2)
  // - "Inventory Visibility & Planning Dashboard" should only link to "Inventory Visibility Gaps May Affect Planning Reliability" (ins_3)
  // - "Stakeholder Alignment & Adoption Plan" should only link to "Stakeholder Alignment Is Needed Before Workflow Redesign" (ins_4)
  // - "Unified Operations Data Hub" was de-duplicated (it exists in DB). So it shouldn't be generated.
  
  let mappingPass = true;
  generatedSuggestions.forEach(sug => {
    if (sug.title === 'Unified Operations Data Hub') {
      console.error('FAIL: Unified Operations Data Hub was generated despite being in DB.');
      mappingPass = false;
    }
    if (sug.title === 'Automated Reporting & KPI Pipeline') {
      const correct = sug.linkedInsights.length === 1 && sug.linkedInsights[0].includes('Manual Reporting Workflows');
      console.log(`Automated Reporting & KPI Pipeline correct mapping: ${correct} (${sug.linkedInsights.join(', ')})`);
      if (!correct) mappingPass = false;
    }
    if (sug.title === 'Inventory Visibility & Planning Dashboard') {
      const correct = sug.linkedInsights.length === 1 && sug.linkedInsights[0].includes('Inventory Visibility Gaps');
      console.log(`Inventory Visibility & Planning Dashboard correct mapping: ${correct} (${sug.linkedInsights.join(', ')})`);
      if (!correct) mappingPass = false;
    }
    if (sug.title === 'Stakeholder Alignment & Adoption Plan') {
      const correct = sug.linkedInsights.length === 1 && sug.linkedInsights[0].includes('Stakeholder Alignment Is Needed');
      console.log(`Stakeholder Alignment & Adoption Plan correct mapping: ${correct} (${sug.linkedInsights.join(', ')})`);
      if (!correct) mappingPass = false;
    }
  });

  console.log('Mapping verification:', mappingPass ? 'PASS' : 'FAIL');

  console.log('\n--- 4. GROUNDING VERIFICATION ---');
  // Check if any non-existing systems are mentioned in descriptions
  let groundingPass = true;
  generatedSuggestions.forEach(sug => {
    // Only systems present: SAP ERP, Excel, Power BI
    // Make sure other systems are not mentioned.
    const desc = sug.description;
    const systems = ['sap', 'excel', 'power', 'oracle', 'salesforce', 'jira'];
    console.log(`Checking description of "${sug.title}":`);
    console.log(`  > ${desc}`);
    if (desc.toLowerCase().includes('oracle') || desc.toLowerCase().includes('salesforce') || desc.toLowerCase().includes('jira')) {
      console.error('  FAIL: Hallucinated systems found!');
      groundingPass = false;
    } else {
      console.log('  PASS: No hallucinated systems.');
    }
  });

  console.log('\n--- 5. PERSISTENCE VERIFICATION ---');
  // We'll simulate creating the suggestions
  // Change title on first card to 'Custom Automated Pipeline' and description
  const firstCard = document.querySelector('#modal-body-content .card');
  firstCard.querySelector('.idea-title-input').value = 'Custom Automated Pipeline';
  firstCard.querySelector('.idea-title-input').dispatchEvent(new dom.window.Event('input'));
  firstCard.querySelector('.idea-description-textarea').value = 'Custom description of the pipeline.';
  firstCard.querySelector('.idea-description-textarea').dispatchEvent(new dom.window.Event('input'));

  // Uncheck second card
  const secondCard = document.querySelectorAll('#modal-body-content .card')[1];
  secondCard.querySelector('.idea-checkbox').checked = false;
  secondCard.querySelector('.idea-checkbox').dispatchEvent(new dom.window.Event('change'));

  // Click create button
  const createBtn = document.getElementById('modal-gen-ideas-create');
  console.log('Create button click:');
  createBtn.click();

  // Read from DB
  const updatedDb = JSON.parse(localStorage.getItem('oios_studio_db_v1'));
  console.log('Number of ideas in DB after save:', updatedDb.systemIdeas.length);

  let savedPass = true;
  // We expect:
  // 1. 'Unified Operations Data Hub' (existing)
  // 2. 'Custom Automated Pipeline' (created and customized)
  // 3. 'Stakeholder Alignment & Adoption Plan' (created)
  // The 'Inventory Visibility & Planning Dashboard' was unchecked, so it should not be in the database.
  
  const expectedTitles = [
    'Unified Operations Data Hub',
    'Custom Automated Pipeline',
    'Stakeholder Alignment & Adoption Plan'
  ];
  
  const actualTitles = updatedDb.systemIdeas.map(idea => idea.title);
  console.log('Actual Titles in DB:', actualTitles);
  
  expectedTitles.forEach(expectedTitle => {
    if (!actualTitles.includes(expectedTitle)) {
      console.error(`  FAIL: Missing expected title: "${expectedTitle}"`);
      savedPass = false;
    }
  });
  if (actualTitles.includes('Inventory Visibility & Planning Dashboard')) {
    console.error('  FAIL: Found "Inventory Visibility & Planning Dashboard" which was unchecked.');
    savedPass = false;
  }
  
  console.log('Persistence verification:', savedPass ? 'PASS' : 'FAIL');

  console.log('\n--- 6. BOARD BEHAVIOR ---');
  // Re-render workspace to simulate page reload/refresh
  renderWorkspace(viewport, params);

  const boardCards = document.querySelectorAll('.kanban-card');
  console.log('Number of cards on board:', boardCards.length);
  
  let boardPass = true;
  boardCards.forEach(card => {
    const title = card.querySelector('.kanban-card-title').textContent.trim();
    console.log(`Card on board: "${title}"`);
    if (!expectedTitles.includes(title)) {
      console.error(`  FAIL: Unexpected card on board: "${title}"`);
      boardPass = false;
    }
  });

  // Test opening a card's drawer
  const targetCard = document.querySelector('[data-id="idea_existing"]');
  if (targetCard) {
    targetCard.click();
    const drawerTitle = document.getElementById('drawer-title');
    const drawerBody = document.getElementById('drawer-body-content');
    console.log('Drawer Title:', drawerTitle ? drawerTitle.textContent.trim() : 'none');
    console.log('Drawer contains "Justifying Architecture Insights":', drawerBody ? drawerBody.textContent.includes('Justifying Architecture Insights') : false);
    if (!drawerTitle || drawerTitle.textContent.trim() !== 'Unified Operations Data Hub' || !drawerBody.textContent.includes('Justifying Architecture Insights')) {
      boardPass = false;
    }
  } else {
    console.error('FAIL: Could not find card for "idea_existing"');
    boardPass = false;
  }

  console.log('Board Behavior verification:', boardPass ? 'PASS' : 'FAIL');

  console.log('\n--- 7. REGRESSION CHECK ---');
  // Verify that manual "Formulate System Idea" button opens the manual form modal
  const addBtnRefreshed = document.getElementById('btn-add-idea');
  addBtnRefreshed.click();
  const manualTitle = document.getElementById('modal-title');
  console.log('Manual Formulate Modal Title:', manualTitle ? manualTitle.textContent : 'none');
  const cancelBtn = document.getElementById('modal-cancel-idea');
  let regressionPass = true;
  if (!manualTitle || manualTitle.textContent !== 'Formulate System Design Proposal' || !cancelBtn) {
    console.error('FAIL: Manual formulate modal did not open correctly or lacks cancel button.');
    regressionPass = false;
  } else {
    cancelBtn.click();
    console.log('PASS: Manual formulate modal opened and closed successfully.');
  }

  console.log('Regression check:', regressionPass ? 'PASS' : 'FAIL');

  const overallPass = mappingPass && groundingPass && savedPass && boardPass && regressionPass;
  console.log(`\nOVERALL AUDIT RESULT: ${overallPass ? 'PASS' : 'FAIL'}`);

  process.exit(overallPass ? 0 : 1);
}

runAudit();
