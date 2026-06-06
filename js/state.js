/* OIOS Studio State Manager & LocalStorage Persistence */

const STORAGE_KEY = 'oios_studio_db_v1';

// Initial Mock Data (Realistic Business Transformation Scenarios)
const DEFAULT_MOCK_DATA = {
  companies: [
    {
      id: 'comp_1',
      name: 'Aetheric Quantum Systems',
      industry: 'Quantum Hardware',
      status: 'active',
      stage: 'System Ideas',
      createdAt: '2026-04-12T09:00:00.000Z',
      description: 'Scaling silicon spin qubit quantum hardware platforms and cryogenic controller compilers.',
      website: 'https://aethericquantum.tech',
      contactName: 'Dr. Helena Vance',
      contactEmail: 'helena.vance@aethericquantum.tech',
      assessment: {
        businessGoals: '### Core Strategic Objectives\n- Scale qubit count from 8 to 64 spin-qubits within 12 months.\n- Shorten integration cycle between cryogenic compiler and control electronics from 6 weeks to 3 days.\n- Commercialize cloud-access quantum testbed for early pilot clients.',
        coreProblems: '### Primary Bottlenecks\n1. **High coupler defect rate** during cleanroom silicon doping (currently 24% failure yield).\n2. **Manual calibration lag**: Tuning cryogenic controller parameters requires software engineers and physical scientists to manually sync calibrations, taking up to 30 hours per testbed.',
        operationalBottlenecks: '### Operational Roadblocks\n- Cryogenic hardware engineers and quantum software engineers operate in communication siloes.\n- API changes in the hardware microcode are poorly communicated, causing build breaks in the compiler layers.',
        techStack: '### Hardware & Software Stack\n- Cryogenic Controller: Custom FPGA with Verilog\n- Compiler: Rust / QASM parser\n- Research Orchestration: Python / Jupyter Notebooks'
      }
    },
    {
      id: 'comp_2',
      name: 'Apex Foundry Works',
      industry: 'Heavy Industrial Foundry',
      status: 'active',
      stage: 'Discovery',
      createdAt: '2026-05-01T14:30:00.000Z',
      description: 'Traditional manufacturer of heavy turbine castings and custom engine housings for maritime and energy sectors.',
      website: 'https://apexfoundry.works',
      contactName: 'Marcus Sterling',
      contactEmail: 'm.sterling@apexfoundry.works',
      assessment: {
        businessGoals: '### Core Strategic Objectives\n- Reduce cast scrap rates by 50% across Turbine Shaft lines.\n- Transition from calendar-based kiln shutdowns to predictive condition-based maintenance.\n- Introduce high-mix low-volume production lines.',
        coreProblems: '### Primary Bottlenecks\n1. **Scrap rate spikes**: Variable melt temperatures in kiln casting lines lead to micro-fissures (currently costing $120k/month in scrap metal).\n2. **Inventory Stockouts**: Refractory brick inventory tracking relies on physical ledgers and a single Excel sheet, leading to unscheduled line outages.',
        operationalBottlenecks: '### Operational Roadblocks\n- Floor managers operate on experience-based adjustments rather than real-time telemetry.\n- Procurement delays due to manual inventory counts occur at critical thermal cycle points.',
        techStack: '### Operations Stack\n- Production: Manual log sheets & paper work-orders\n- Inventory: Excel (local server share)\n- ERP: Legacy IBM AS400 terminal system'
      }
    },
    {
      id: 'comp_3',
      name: 'Valence Advisory Partners',
      industry: 'Management Consulting',
      status: 'active',
      stage: 'Projects',
      createdAt: '2026-03-15T08:15:00.000Z',
      description: 'Specialized strategy advisory firm with 150 consultants serving global finance and M&A clients.',
      website: 'https://valenceadvisory.com',
      contactName: 'Catherine Cho',
      contactEmail: 'catherine.cho@valenceadvisory.com',
      assessment: {
        businessGoals: '### Core Strategic Objectives\n- Increase consultant utilization rate from 72% to 80% by reducing proposal creation time.\n- Build a centralized intellectual property library to reuse research papers and deck templates.\n- Accelerate onboarding time of new associate consultants.',
        coreProblems: '### Primary Bottlenecks\n1. **Recreating the wheel**: Consultants spend an average of 6.2 hours per proposal drafting templates and searching email archives for past briefs.\n2. **Siloed knowledge**: Crucial industry research resides on individual local hard drives with zero global indexing.',
        operationalBottlenecks: '### Operational Roadblocks\n- No centralized index or search engine for intellectual property.\n- Partners protect their client decks, preventing junior analysts from accessing high-value frameworks.',
        techStack: '### Enterprise Stack\n- Files: Microsoft Sharepoint / OneDrive\n- Communication: MS Teams / Outlook\n- Knowledge Base: Static PDF archives on intranet'
      }
    }
  ],
  discoveryNotes: [
    {
      id: 'note_1',
      companyId: 'comp_1',
      title: 'Cryogenic Compiler Core Integration Meeting',
      content: 'Interviewed Lead Compiler Architect (Alex Chen) and Chief Physicist (Dr. Vance).\n- **Findings**: The compiler team relies on compiler schemas defined in QASM dialect files. Cryo-hardware controllers use a different Verilog register-map mapping. \n- **Process**: When firmware changes register-maps, compiler builds fail silently. Integration tests are run manually once a week.\n- **Quote**: "We waste 2 days a week adjusting compiler targets to match updated control board firmware. A change register shouldn\'t halt compiler operations."',
      date: '2026-04-18',
      category: 'interview'
    },
    {
      id: 'note_2',
      companyId: 'comp_1',
      title: 'Silicon Qubit Coupler Assembly Line Audit',
      content: 'Observed cleanroom deposition flow.\n- **Findings**: Doping temperatures fluctuate by +-0.4C during molecular beam epitaxy. Coupler defect margins are within +-0.1C limits.\n- **Telemetry**: Sensors log data locally, but logs are only extracted post-failure analysis.\n- **Conclusion**: Early telemetry feedback could trigger heater adjustments before the batch is ruined.',
      date: '2026-04-20',
      category: 'observation'
    },
    {
      id: 'note_3',
      companyId: 'comp_2',
      title: 'Floor Audit - Turbine Shaft Kiln Casting Line',
      content: 'Spent 4 hours shadowing shift managers on Casting Line 3.\n- **Observations**: Thermal temperature of the molten steel is measured using manual immersion thermocouples once every 20 minutes.\n- **Critical Risk**: Melt temperature can drop below the liquidus boundary (1480C) between checks, causing micro-void defects.\n- **Opportunity**: Continuous optical pyrometer telemetry would give real-time warning on thermal drop-offs.',
      date: '2026-05-08',
      category: 'observation'
    },
    {
      id: 'note_4',
      companyId: 'comp_2',
      title: 'Refractory Warehouse Operations Review',
      content: 'Interviewed Logistics lead (Bob Miller).\n- **Findings**: Refractory brick lining replacement cycles are unpredictable. Lead time is 4 weeks. Currently, inventory is tracked manually in Excel.\n- **Bottleneck**: Last month, the stock count was incorrect by 80 units, leading to a kiln operating at a degraded state for 5 days while waiting for replacement bricks.',
      date: '2026-05-12',
      category: 'interview'
    },
    {
      id: 'note_5',
      companyId: 'comp_3',
      title: 'Knowledge Sharing & Proposal Creation Audit',
      content: 'Followed 3 senior consultants drafting M&A proposal decks.\n- **Findings**: Consultants start by pinging Slack channels asking "Does anyone have a proposal on SaaS M&A?" and manually digging through Outlook search.\n- **Waste**: 75% of slide content is structurally identical to past proposals. Average search time is 5-7 hours per pitch deck.\n- **Quote**: "Finding past data is like archeology. If the consultant left the firm, their research is essentially lost."',
      date: '2026-03-20',
      category: 'interview'
    }
  ],
  insights: [
    {
      id: 'ins_1',
      companyId: 'comp_1',
      title: 'Desynchronized Microcode Schema Pipeline',
      description: 'Compiler architects and control electronics engineers lack a single source of truth for register maps, leading to 25% integration dev overhead and frequent compiler bugs.',
      sourceNotes: ['note_1'],
      impact: 'high',
      category: 'technology'
    },
    {
      id: 'ins_2',
      companyId: 'comp_1',
      title: 'Lagging Cleanroom Telemetry Feedback Loop',
      description: 'Lack of real-time temperature feedback during molecular beam epitaxy results in high qubit coupler failure yields, which cannot be salvaged post-process.',
      sourceNotes: ['note_2'],
      impact: 'high',
      category: 'process'
    },
    {
      id: 'ins_3',
      companyId: 'comp_2',
      title: 'Manual Thermocouple Check Gaps',
      description: 'Immersion checks every 20 minutes leave casting lines vulnerable to thermal drop-offs, resulting in micro-fissures in turbine shafts that aren\'t detected until mechanical stress tests.',
      sourceNotes: ['note_3'],
      impact: 'high',
      category: 'technology'
    },
    {
      id: 'ins_4',
      companyId: 'comp_2',
      title: 'Fragile Localized Inventory Records',
      description: 'Tracking critical kiln refractory bricks in localized Excel files creates a single point of failure and inventory desynchronization, triggering expensive unscheduled shutdowns.',
      sourceNotes: ['note_4'],
      impact: 'high',
      category: 'data'
    },
    {
      id: 'ins_5',
      companyId: 'comp_3',
      title: 'Fragmented Proposal Templates & Email Hoarding',
      description: 'Highly valuable proposal structures are locked in individual consultant folders and email archives, forcing constant recreation of identical marketing slides.',
      sourceNotes: ['note_5'],
      impact: 'medium',
      category: 'people'
    }
  ],
  systemIdeas: [
    {
      id: 'idea_1',
      companyId: 'comp_1',
      title: 'Single Source of Truth Schema Registry',
      description: 'Implement a Protobuf or YAML-based schema registry for control registers. Automatically compile both Verilog register maps and Rust/QASM compiler headers in the CI/CD pipeline.',
      linkedInsights: ['ins_1'],
      priority: 'high',
      feasibility: 'easy',
      status: 'approved'
    },
    {
      id: 'idea_2',
      companyId: 'comp_1',
      title: 'Cleanroom Sensor Mesh & Heater PID Loops',
      description: 'Deploy real-time optical thermal monitoring inside the epitaxy chamber and link feedback directly to heater PID loops to self-adjust temperature margins within 0.1C.',
      linkedInsights: ['ins_2'],
      priority: 'medium',
      feasibility: 'complex',
      status: 'refining'
    },
    {
      id: 'idea_3',
      companyId: 'comp_2',
      title: 'Non-contact Continuous Optical Pyrometry Mesh',
      description: 'Mount dual-wavelength optical pyrometers over Casting Line 3 linked to a dashboard on the factory floor, signaling alerts immediately if temperature drops below 1490C.',
      linkedInsights: ['ins_3'],
      priority: 'high',
      feasibility: 'moderate',
      status: 'backlog'
    },
    {
      id: 'idea_4',
      companyId: 'comp_2',
      title: 'Cloud-Based JIT Inventory Alerts',
      description: 'Move supply tracking to a lightweight browser system linked to local weighing sensors under refractory pallets, triggering automated procurement emails when stock falls below 40 units.',
      linkedInsights: ['ins_4'],
      priority: 'high',
      feasibility: 'easy',
      status: 'approved'
    },
    {
      id: 'idea_5',
      companyId: 'comp_3',
      title: 'Vector Search Proposal Indexer (Proposal AI)',
      description: 'Build a script to parse OneDrive/Sharepoint proposals, extract slide components, and embed them in a vector database for natural-language search ("Find past slides on SaaS M&A strategy").',
      linkedInsights: ['ins_5'],
      priority: 'high',
      feasibility: 'moderate',
      status: 'approved'
    }
  ],
  projects: [
    {
      id: 'proj_1',
      companyId: 'comp_1',
      title: 'CI/CD Schema Registry MVP',
      description: 'Establish the unified register definitions in YAML and integrate compiler and hardware header build generators in the Github Actions pipelines.',
      linkedSystemIdeas: ['idea_1'],
      status: 'in_progress',
      startDate: '2026-05-10',
      endDate: '2026-06-30',
      progress: 45
    },
    {
      id: 'proj_2',
      companyId: 'comp_2',
      title: 'Refractory JIT Inventory System Launch',
      description: 'Set up the cloud inventory dashboard and wire the automated threshold email alerts to procurement.',
      linkedSystemIdeas: ['idea_4'],
      status: 'not_started',
      startDate: '2026-06-15',
      endDate: '2026-07-20',
      progress: 0
    },
    {
      id: 'proj_3',
      companyId: 'comp_3',
      title: 'Proposal Vector Indexing Engine Deployment',
      description: 'Extracted 4,000 slides from historical M&A decks, ran vector embedding generations, and deployed a React-based retrieval tool for consultants.',
      linkedSystemIdeas: ['idea_5'],
      status: 'completed',
      startDate: '2026-04-01',
      endDate: '2026-05-15',
      progress: 100
    }
  ],
  reports: [
    {
      id: 'rep_1',
      companyId: 'comp_3',
      title: 'Valence Advisory: Knowledge Management Architecture Report',
      summary: 'Executive architecture recommendations proposing Vector proposal semantic lookup to drive utilization rates.',
      content: '## Executive Summary\nValence Advisory Partners has experienced operational drag resulting from fragmented proposal templates. Consultants waste approximately 6.2 hours per week looking for documents.\n\n## Insights Identified\n- **Fragmented Proposal Templates & Email Hoarding**: Proposal slides are siloed in local drives.\n\n## Recommendations\n- **Vector Search Proposal Indexer**: Introduce semantic indexing of historical M&A slides.\n\n## Project Status\n- **Proposal Vector Indexing Engine**: Completed successfully on May 15, 2026. Adoption is at 84%, saving an estimated 5.1 hours/consultant/week.',
      createdAt: '2026-05-18T10:00:00.000Z',
      status: 'finalized'
    }
  ],
  nextActions: [
    { id: 'todo_1', text: 'Review compile-time schemas for Aetheric Quantum Systems', completed: false },
    { id: 'todo_2', text: 'Confirm pyrometer placement with Apex Foundry Lead Engineer', completed: false },
    { id: 'todo_3', text: 'Draft M&A intelligence architecture report for Valence Advisory', completed: true },
    { id: 'todo_4', text: 'Set up cloud backup routine for client local databases', completed: false }
  ]
};

class StateManager {
  constructor() {
    this.data = this.loadData();
    this.repairDuplicateInsightIds();
    this.repairDuplicateDiscoveryNoteIds();
    this.repairDuplicateSystemIdeaIds();
    this.repairSystemIdeaTraceability();
  }

  generateUniqueId(prefix, collection) {
    let id;
    let attempts = 0;
    do {
      id = prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      attempts++;
    } while (collection.some(item => item.id === id) && attempts < 100);
    return id;
  }

  repairDuplicateInsightIds() {
    if (!this.data || !this.data.insights || !Array.isArray(this.data.insights)) return;
    const seenIds = new Set();
    let hasDuplicates = false;

    this.data.insights.forEach(insight => {
      if (!insight.id || seenIds.has(insight.id)) {
        const newId = this.generateUniqueId('ins', this.data.insights);
        insight.id = newId;
        hasDuplicates = true;
      } else {
        seenIds.add(insight.id);
      }
    });

    if (hasDuplicates) {
      this.saveData();
    }
  }

  repairDuplicateDiscoveryNoteIds() {
    if (!this.data || !this.data.discoveryNotes || !Array.isArray(this.data.discoveryNotes)) return;
    const seenIds = new Set();
    let hasDuplicates = false;

    this.data.discoveryNotes.forEach(note => {
      if (!note.id || seenIds.has(note.id)) {
        const newId = this.generateUniqueId('note', this.data.discoveryNotes);
        note.id = newId;
        hasDuplicates = true;
      } else {
        seenIds.add(note.id);
      }
    });

    if (hasDuplicates) {
      this.saveData();
    }
  }

  repairDuplicateSystemIdeaIds() {
    if (!this.data || !this.data.systemIdeas || !Array.isArray(this.data.systemIdeas)) return;
    
    const idCounts = {};
    this.data.systemIdeas.forEach(idea => {
      if (idea.id) {
        idCounts[idea.id] = (idCounts[idea.id] || 0) + 1;
      }
    });

    const seenIds = new Set();
    let hasDuplicates = false;

    this.data.systemIdeas.forEach(idea => {
      if (!idea.id || seenIds.has(idea.id)) {
        const oldId = idea.id;
        const newId = this.generateUniqueId('idea', this.data.systemIdeas);
        idea.id = newId;
        hasDuplicates = true;

        if (oldId) {
          const count = idCounts[oldId] || 0;
          if (count === 1) {
            // Unambiguous: update project references
            if (this.data.projects) {
              this.data.projects.forEach(project => {
                if (project.linkedSystemIdeas && Array.isArray(project.linkedSystemIdeas)) {
                  const idx = project.linkedSystemIdeas.indexOf(oldId);
                  if (idx !== -1) {
                    project.linkedSystemIdeas[idx] = newId;
                  }
                }
              });
            }
          } else if (count > 1) {
            // Ambiguous: log warning and leave project reference unchanged
            console.warn(`[Self-Healing] Ambiguous duplicate system idea ID reference skipped for projects: ${oldId}`);
          }
        }
      } else {
        seenIds.add(idea.id);
      }
    });

    if (hasDuplicates) {
      this.saveData();
    }
  }

  repairSystemIdeaTraceability() {
    if (!this.data || !this.data.systemIdeas || !Array.isArray(this.data.systemIdeas)) return;
    if (!this.data.insights || !Array.isArray(this.data.insights)) return;

    let hasChanges = false;

    const getInsightCoreText = (insight) => {
      const title = insight.title || '';
      const category = insight.category || '';
      let desc = insight.description || '';
      
      const descLower = desc.toLowerCase();
      const challengeIdx = descLower.indexOf('stated challenge:');
      const bottleneckIdx = descLower.indexOf('stated bottleneck:');
      
      let cutIdx = -1;
      if (challengeIdx !== -1 && bottleneckIdx !== -1) {
        cutIdx = Math.min(challengeIdx, bottleneckIdx);
      } else if (challengeIdx !== -1) {
        cutIdx = challengeIdx;
      } else if (bottleneckIdx !== -1) {
        cutIdx = bottleneckIdx;
      }
      
      if (cutIdx !== -1) {
        desc = desc.substring(0, cutIdx);
      }
      
      return `${title} ${category} ${desc}`.toLowerCase();
    };

    const rules = [
      {
        title: 'Unified Operations Data Hub',
        keywords: ['Fragmented System Landscape', 'Real-Time Reporting', 'disconnected systems', 'fragmented data', 'dashboard visibility'],
        filter: (ins, coreText) => {
          const cat = (ins.category || '').toLowerCase();
          if (cat === 'data' || cat === 'technology') return true;
          if (cat === 'process') {
            const sysDataKeywords = ['sap', 'excel', 'power bi', 'system', 'data', 'integration', 'database', 'platform', 'landscape'];
            return sysDataKeywords.some(kw => coreText.includes(kw));
          }
          return false;
        }
      },
      {
        title: 'Automated Reporting & KPI Pipeline',
        keywords: ['Manual Reporting Workflows', 'Administrative Bottlenecks', 'manual consolidation', 'duplicate data entry', 'reporting preparation'],
        filter: (ins, coreText) => {
          const cat = (ins.category || '').toLowerCase();
          if (cat === 'process' || cat === 'data') return true;
          if (cat === 'people' || cat === 'stakeholder' || cat === 'stakeholders') {
            const reportingTerms = ['reporting', 'kpi', 'automated', 'automation', 'pipeline', 'report'];
            return reportingTerms.some(term => coreText.includes(term));
          }
          return false;
        }
      },
      {
        title: 'Inventory Visibility & Planning Dashboard',
        keywords: ['Inventory Visibility', 'procurement', 'inventory accuracy', 'planning reliability'],
        filter: (ins, coreText) => {
          const cat = (ins.category || '').toLowerCase();
          if (cat === 'data' || cat === 'process') {
            const invKeywords = ['inventory', 'procurement', 'stock', 'spares', 'parts', 'warehouse', 'replenishment'];
            return invKeywords.some(kw => coreText.includes(kw));
          }
          return false;
        }
      },
      {
        title: 'Stakeholder Alignment & Adoption Plan',
        keywords: ['Stakeholder Alignment', 'workflow redesign', 'adoption', 'change management', 'affected teams'],
        filter: (ins, coreText) => {
          const cat = (ins.category || '').toLowerCase();
          if (cat === 'people' || cat === 'stakeholder' || cat === 'stakeholders') {
            const stakeholderKeywords = ['stakeholder', 'alignment', 'adoption', 'affected team', 'people', 'change management', 'training', 'buy-in', 'leadership'];
            return stakeholderKeywords.some(kw => coreText.includes(kw));
          }
          return false;
        }
      }
    ];

    this.data.systemIdeas.forEach(idea => {
      const rule = rules.find(r => r.title.toLowerCase().trim() === idea.title.toLowerCase().trim());
      if (rule) {
        const companyInsights = this.data.insights.filter(ins => ins.companyId === idea.companyId);
        
        const validInsightIds = companyInsights.filter(ins => {
          const coreText = getInsightCoreText(ins);
          const matchesKeywords = rule.keywords.some(kw => coreText.includes(kw.toLowerCase()));
          if (!matchesKeywords) return false;
          return rule.filter(ins, coreText);
        }).map(ins => ins.id);

        const currentLinks = [...(idea.linkedInsights || [])].sort();
        const newLinks = [...validInsightIds].sort();

        if (JSON.stringify(currentLinks) !== JSON.stringify(newLinks)) {
          console.log(`[Self-Healing] Repairing linkedInsights for system idea "${idea.title}" (ID: ${idea.id})`);
          idea.linkedInsights = validInsightIds;
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      this.saveData();
    }
  }

  loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Failed to parse database from localStorage', e);
    }
    
    // Default fallback
    this.saveData(DEFAULT_MOCK_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_MOCK_DATA));
  }

  saveData(data = this.data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.data = data;
    } catch (e) {
      console.error('Failed to save database to localStorage', e);
    }
  }

  resetData() {
    this.saveData(DEFAULT_MOCK_DATA);
    this.data = JSON.parse(JSON.stringify(DEFAULT_MOCK_DATA));
  }

  importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      // Basic validation
      if (parsed.companies && parsed.discoveryNotes && parsed.insights && parsed.systemIdeas && parsed.projects && parsed.reports) {
        this.saveData(parsed);
        return true;
      }
    } catch (e) {
      console.error('Import failed: invalid JSON format', e);
    }
    return false;
  }

  exportData() {
    return JSON.stringify(this.data, null, 2);
  }

  // --- Companies CRUD ---
  getCompanies() {
    return this.data.companies;
  }

  getCompany(id) {
    return this.data.companies.find(c => c.id === id);
  }

  addCompany(company) {
    const newCompany = {
      id: company.id || 'comp_' + Date.now(),
      name: company.name,
      industry: company.industry,
      status: company.status || 'active',
      stage: company.stage || 'Discovery',
      createdAt: new Date().toISOString(),
      description: company.description || '',
      website: company.website || '',
      contactName: company.contactName || '',
      contactEmail: company.contactEmail || '',
      assessment: company.assessment || {
        businessGoals: '',
        coreProblems: '',
        operationalBottlenecks: '',
        techStack: ''
      },
      discoveryIntake: company.discoveryIntake || this._defaultDiscoveryIntake()
    };
    this.data.companies.push(newCompany);
    this.saveData();
    return newCompany;
  }

  updateCompany(id, updates) {
    const idx = this.data.companies.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data.companies[idx] = { ...this.data.companies[idx], ...updates };
      this.saveData();
      return this.data.companies[idx];
    }
    return null;
  }

  deleteCompany(id) {
    this.data.companies = this.data.companies.filter(c => c.id !== id);
    // Cascade delete linked entities
    this.data.discoveryNotes = this.data.discoveryNotes.filter(n => n.companyId !== id);
    this.data.insights = this.data.insights.filter(i => i.companyId !== id);
    this.data.systemIdeas = this.data.systemIdeas.filter(s => s.companyId !== id);
    this.data.projects = this.data.projects.filter(p => p.companyId !== id);
    this.data.reports = this.data.reports.filter(r => r.companyId !== id);
    this.saveData();
  }

  // --- Discovery Notes CRUD ---
  getDiscoveryNotes(companyId = null) {
    if (companyId) {
      return this.data.discoveryNotes.filter(n => n.companyId === companyId);
    }
    return this.data.discoveryNotes;
  }

  getDiscoveryNote(id) {
    return this.data.discoveryNotes.find(n => n.id === id);
  }

  addDiscoveryNote(note) {
    const newNote = {
      id: this.generateUniqueId('note', this.data.discoveryNotes),
      companyId: note.companyId,
      title: note.title,
      content: note.content,
      date: note.date || new Date().toISOString().split('T')[0],
      category: note.category || 'other'
    };
    if (note.source) newNote.source = note.source;
    if (note.generatedFrom) newNote.generatedFrom = note.generatedFrom;
    if (note.generatedNoteType) newNote.generatedNoteType = note.generatedNoteType;
    if (note.createdAt) newNote.createdAt = note.createdAt;
    this.data.discoveryNotes.push(newNote);
    this.saveData();
    return newNote;
  }

  updateDiscoveryNote(id, updates) {
    const idx = this.data.discoveryNotes.findIndex(n => n.id === id);
    if (idx !== -1) {
      this.data.discoveryNotes[idx] = { ...this.data.discoveryNotes[idx], ...updates };
      this.saveData();
      return this.data.discoveryNotes[idx];
    }
    return null;
  }

  deleteDiscoveryNote(id) {
    this.data.discoveryNotes = this.data.discoveryNotes.filter(n => n.id !== id);
    // Remove references to this note in insights
    this.data.insights.forEach(insight => {
      if (insight.sourceNotes) {
        insight.sourceNotes = insight.sourceNotes.filter(nId => nId !== id);
      }
    });
    this.saveData();
  }

  // --- Insights CRUD ---
  getInsights(companyId = null) {
    if (companyId) {
      return this.data.insights.filter(i => i.companyId === companyId);
    }
    return this.data.insights;
  }

  getInsight(id) {
    return this.data.insights.find(i => i.id === id);
  }

  addInsight(insight) {
    const newInsight = {
      id: this.generateUniqueId('ins', this.data.insights),
      companyId: insight.companyId,
      title: insight.title,
      description: insight.description,
      sourceNotes: insight.sourceNotes || [],
      impact: insight.impact || 'medium',
      category: insight.category || 'other'
    };
    if (insight.evidenceConfidence) {
      newInsight.evidenceConfidence = insight.evidenceConfidence;
    }
    this.data.insights.push(newInsight);
    this.saveData();
    return newInsight;
  }

  updateInsight(id, updates) {
    const idx = this.data.insights.findIndex(i => i.id === id);
    if (idx !== -1) {
      this.data.insights[idx] = { ...this.data.insights[idx], ...updates };
      this.saveData();
      return this.data.insights[idx];
    }
    return null;
  }

  deleteInsight(id) {
    this.data.insights = this.data.insights.filter(i => i.id !== id);
    // Remove references to this insight in system ideas
    this.data.systemIdeas.forEach(idea => {
      if (idea.linkedInsights) {
        idea.linkedInsights = idea.linkedInsights.filter(iId => iId !== id);
      }
    });
    this.saveData();
  }

  // --- System Ideas CRUD ---
  getSystemIdeas(companyId = null) {
    if (companyId) {
      return this.data.systemIdeas.filter(s => s.companyId === companyId);
    }
    return this.data.systemIdeas;
  }

  getSystemIdea(id) {
    return this.data.systemIdeas.find(s => s.id === id);
  }

  addSystemIdea(idea) {
    const newIdea = {
      id: this.generateUniqueId('idea', this.data.systemIdeas),
      companyId: idea.companyId,
      title: idea.title,
      description: idea.description,
      linkedInsights: idea.linkedInsights || [],
      priority: idea.priority || 'medium',
      feasibility: idea.feasibility || 'moderate',
      status: idea.status || 'backlog'
    };
    this.data.systemIdeas.push(newIdea);
    this.saveData();
    return newIdea;
  }

  updateSystemIdea(id, updates) {
    const idx = this.data.systemIdeas.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.data.systemIdeas[idx] = { ...this.data.systemIdeas[idx], ...updates };
      this.saveData();
      return this.data.systemIdeas[idx];
    }
    return null;
  }

  deleteSystemIdea(id) {
    this.data.systemIdeas = this.data.systemIdeas.filter(s => s.id !== id);
    // Remove references in projects
    this.data.projects.forEach(project => {
      if (project.linkedSystemIdeas) {
        project.linkedSystemIdeas = project.linkedSystemIdeas.filter(sId => sId !== id);
      }
    });
    this.saveData();
  }

  // --- Projects CRUD ---
  getProjects(companyId = null) {
    if (companyId) {
      return this.data.projects.filter(p => p.companyId === companyId);
    }
    return this.data.projects;
  }

  getProject(id) {
    return this.data.projects.find(p => p.id === id);
  }

  /**
   * Default milestone template applied to all new (and migrated) projects
   */
  _defaultMilestones() {
    const titles = [
      'Requirements Mapping',
      'Architecture Design',
      'Data Integration Planning',
      'Implementation Build',
      'User Review',
      'Go Live'
    ];
    return titles.map((title, i) => ({
      id: 'ms_' + Date.now() + '_' + i,
      title,
      completed: false,
      completedAt: null
    }));
  }

  /**
   * Calculate progress from milestone completion ratio.
   * Falls back to stored progress if no milestones exist.
   */
  calcProjectProgress(proj) {
    if (!proj.milestones || proj.milestones.length === 0) return proj.progress || 0;
    const done = proj.milestones.filter(m => m.completed).length;
    return Math.round((done / proj.milestones.length) * 100);
  }

  addProject(project) {
    const milestones = project.milestones || this._defaultMilestones();
    const activityLog = [{
      id: 'act_' + Date.now(),
      type: 'created',
      message: 'Project created',
      createdAt: new Date().toISOString()
    }];
    const newProject = {
      id: 'proj_' + Date.now(),
      companyId: project.companyId,
      title: project.title,
      description: project.description || '',
      linkedSystemIdeas: project.linkedSystemIdeas || [],
      status: project.status || 'not_started',
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      progress: parseInt(project.progress) || 0,
      milestones,
      activityLog
    };
    newProject.progress = this.calcProjectProgress(newProject);
    this.data.projects.push(newProject);
    this.saveData();
    return newProject;
  }

  updateProject(id, updates) {
    const idx = this.data.projects.findIndex(p => p.id === id);
    if (idx !== -1) {
      const merged = { ...this.data.projects[idx], ...updates };
      // Recalculate progress from milestones if they exist
      merged.progress = this.calcProjectProgress(merged);
      this.data.projects[idx] = merged;
      this.saveData();
      return this.data.projects[idx];
    }
    return null;
  }

  /**
   * Ensure a project has milestones (migration for old projects).
   * Returns updated project (already saved to localStorage).
   */
  ensureProjectMilestones(id) {
    const proj = this.getProject(id);
    if (!proj) return null;
    let changed = false;
    if (!proj.milestones || proj.milestones.length === 0) {
      proj.milestones = this._defaultMilestones();
      changed = true;
    }
    if (!proj.activityLog) {
      proj.activityLog = [{
        id: 'act_' + Date.now(),
        type: 'created',
        message: 'Project created',
        createdAt: proj.createdAt || new Date().toISOString()
      }];
      changed = true;
    }
    if (changed) {
      proj.progress = this.calcProjectProgress(proj);
      const idx = this.data.projects.findIndex(p => p.id === id);
      this.data.projects[idx] = proj;
      this.saveData();
    }
    return this.data.projects.find(p => p.id === id);
  }

  /**
   * Toggle a milestone on a project. Recalculates progress and logs activity.
   */
  toggleMilestone(projectId, milestoneId) {
    const proj = this.ensureProjectMilestones(projectId);
    if (!proj) return null;
    const ms = proj.milestones.find(m => m.id === milestoneId);
    if (!ms) return null;
    ms.completed = !ms.completed;
    ms.completedAt = ms.completed ? new Date().toISOString() : null;
    proj.activityLog.push({
      id: 'act_' + Date.now(),
      type: ms.completed ? 'milestone_complete' : 'milestone_reopen',
      message: ms.completed ? `Milestone completed: ${ms.title}` : `Milestone reopened: ${ms.title}`,
      createdAt: new Date().toISOString()
    });
    proj.progress = this.calcProjectProgress(proj);
    const idx = this.data.projects.findIndex(p => p.id === projectId);
    this.data.projects[idx] = proj;
    this.saveData();
    return proj;
  }

  deleteProject(id) {
    this.data.projects = this.data.projects.filter(p => p.id !== id);
    this.saveData();
  }

  // --- Reports CRUD ---
  getReports(companyId = null) {
    if (companyId) {
      return this.data.reports.filter(r => r.companyId === companyId);
    }
    return this.data.reports;
  }

  getReport(id) {
    return this.data.reports.find(r => r.id === id);
  }

  addReport(report) {
    const newReport = {
      id: 'rep_' + Date.now(),
      companyId: report.companyId,
      title: report.title,
      summary: report.summary || '',
      content: report.content || '',
      createdAt: new Date().toISOString(),
      status: report.status || 'draft'
    };
    this.data.reports.push(newReport);
    this.saveData();
    return newReport;
  }

  updateReport(id, updates) {
    const idx = this.data.reports.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.data.reports[idx] = { ...this.data.reports[idx], ...updates };
      this.saveData();
      return this.data.reports[idx];
    }
    return null;
  }

  deleteReport(id) {
    this.data.reports = this.data.reports.filter(r => r.id !== id);
    this.saveData();
  }

  // --- Next Actions (Dashboard checklist) ---
  getNextActions() {
    return this.data.nextActions || [];
  }

  addNextAction(text) {
    if (!this.data.nextActions) this.data.nextActions = [];
    const newAction = {
      id: 'todo_' + Date.now(),
      text,
      completed: false
    };
    this.data.nextActions.push(newAction);
    this.saveData();
    return newAction;
  }

  toggleNextAction(id) {
    if (!this.data.nextActions) return;
    const action = this.data.nextActions.find(t => t.id === id);
    if (action) {
      action.completed = !action.completed;
      this.saveData();
    }
  }

  deleteNextAction(id) {
    if (!this.data.nextActions) return;
    this.data.nextActions = this.data.nextActions.filter(t => t.id !== id);
    this.saveData();
  }

  // --- Discovery Intake ---

  /**
   * Returns the blank Discovery Intake skeleton (5 sections × 3 fields).
   */
  _defaultDiscoveryIntake() {
    return {
      business: { primaryGoals: '', expectedOutcomes: '', currentChallenges: '' },
      people:   { decisionMakers: '', affectedTeams: '', keyStakeholders: '' },
      process:  { coreProcesses: '', knownBottlenecks: '', manualWorkAreas: '' },
      systems:  { currentSystems: '', integrations: '', technologyIssues: '' },
      data:     { reports: '', kpis: '', dataSources: '' }
    };
  }

  /**
   * Ensures a company has a discoveryIntake object (migration for existing companies).
   * Returns the updated company (already persisted to localStorage).
   */
  ensureDiscoveryIntake(companyId) {
    const idx = this.data.companies.findIndex(c => c.id === companyId);
    if (idx === -1) return null;
    const company = this.data.companies[idx];
    if (!company.discoveryIntake) {
      company.discoveryIntake = this._defaultDiscoveryIntake();
      this.data.companies[idx] = company;
      this.saveData();
    }
    return this.data.companies[idx];
  }

  /**
   * Deep-merges a partial intake object into the stored discoveryIntake and saves.
   * Example: updateDiscoveryIntake(id, { business: { primaryGoals: 'Grow ARR' } })
   */
  updateDiscoveryIntake(companyId, sectionUpdates) {
    const company = this.ensureDiscoveryIntake(companyId);
    if (!company) return null;
    const idx = this.data.companies.findIndex(c => c.id === companyId);
    const intake = company.discoveryIntake;
    for (const section of Object.keys(sectionUpdates)) {
      if (intake[section]) {
        intake[section] = { ...intake[section], ...sectionUpdates[section] };
      }
    }
    this.data.companies[idx].discoveryIntake = intake;
    this.saveData();
    return this.data.companies[idx];
  }
}

// Single instance
export const db = new StateManager();
export default db;
