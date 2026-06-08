/**
 * Test runner for PRAGMA / OIOS Discovery Chatbot logic
 */

const assert = require('assert');

// 1. Sufficiency checks
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

// 2. Text Normalizer
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

// 3. Assessment compiler
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

// --- RUN TESTS ---
console.log('Running PRAGMA Chatbot Logic Tests...\n');

// Test 1: Sufficiency Logic
console.log('Test 1: Sufficiency Logic...');
const s1 = checkAnswerSufficiency("short", "kpi");
assert.strictEqual(s1.sufficient, false);
assert.strictEqual(s1.missing, "length");

const s2 = checkAnswerSufficiency("Our goal is to grow", "priority_driver_timeline");
assert.strictEqual(s2.sufficient, false);
assert.strictEqual(s2.missing, "priority, driver, or timeline details");

const s3 = checkAnswerSufficiency("Our critical objective is to improve proposal speeds over the next 12 months because our clients are complaining about delays", "priority_driver_timeline");
assert.strictEqual(s3.sufficient, true);

const s4 = checkAnswerSufficiency("We want to reduce manual proposal writing times by 50% next quarter.", "kpi");
assert.strictEqual(s4.sufficient, true);

console.log('✓ Sufficiency Logic tests passed.');

// Test 2: Text Normalization
console.log('\nTest 2: Text Normalization...');
const n1 = mockNormalizeAnswer("primaryGoals", "well basically we want to speed up things");
assert.strictEqual(n1, "Primary strategic objective: The objective is to speed up things");

const n2 = mockNormalizeAnswer("currentSystems", "we are using Salesforce CRM and Excel sheets");
assert.strictEqual(n2, "System environment: The organization utilizes Salesforce CRM and Excel sheets");

const n3 = mockNormalizeAnswer("kpis", "[Skipped by client]");
assert.strictEqual(n3, "[Skipped by client]");

console.log('✓ Text Normalization tests passed.');

// Test 3: Assessment Compilation
console.log('\nTest 3: Assessment Compilation...');
const intakeMock = {
  business: {
    primaryGoals: "Primary strategic objective: Objective is to speed up things",
    expectedOutcomes: "Target outcome: Reduce delay by 50%",
    currentChallenges: "Operational challenge: Manual entry delays"
  },
  people: {
    affectedTeams: "Impacted department: Operations and Sales"
  },
  process: {},
  systems: {},
  data: {}
};
const asm = mockCompileAssessment(intakeMock);
assert.ok(asm.businessGoals.includes("Objective is to speed up things"));
assert.ok(asm.coreProblems.includes("Manual entry delays"));
assert.ok(asm.operationalBottlenecks.includes("No operational bottlenecks documented."));

console.log('✓ Assessment Compilation tests passed.');
console.log('\nALL TESTS PASSED SUCCESSFULLY!');
