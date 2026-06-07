/* Company Workspace Page View */

import { db } from '../state.js';
import { getIconHTML, formatDate, escapeHTML, parseMarkdown, showToast, openModal, closeModal, openDrawer, closeDrawer, generateUUID } from '../utils.js';
import { NavigationHistory } from '../navigation.js';

const navHistory = new NavigationHistory();

/**
 * Automatically reconstructs the parent breadcrumb path using the database relationships.
 */
function reconstructPath(company, entityType, entityId) {
  const path = [];
  if (entityType === 'project') {
    const proj = db.getProject(entityId);
    if (proj) {
      path.push({ type: 'tab', tab: 'Projects', label: 'Projects' });
      path.push({ type: 'project', id: proj.id, label: proj.title });
    }
  } else if (entityType === 'systemIdea') {
    const idea = db.getSystemIdea(entityId);
    if (idea) {
      const parentProject = db.getProjects(company.id).find(p => p.linkedSystemIdeas && p.linkedSystemIdeas.includes(idea.id));
      if (parentProject) {
        path.push({ type: 'tab', tab: 'Projects', label: 'Projects' });
        path.push({ type: 'project', id: parentProject.id, label: parentProject.title });
      } else {
        path.push({ type: 'tab', tab: 'System Ideas', label: 'System Ideas' });
      }
      path.push({ type: 'systemIdea', id: idea.id, label: idea.title });
    }
  } else if (entityType === 'insight') {
    const ins = db.getInsight(entityId);
    if (ins) {
      const parentIdea = db.getSystemIdeas(company.id).find(s => s.linkedInsights && s.linkedInsights.includes(ins.id));
      if (parentIdea) {
        const parentProject = db.getProjects(company.id).find(p => p.linkedSystemIdeas && p.linkedSystemIdeas.includes(parentIdea.id));
        if (parentProject) {
          path.push({ type: 'tab', tab: 'Projects', label: 'Projects' });
          path.push({ type: 'project', id: parentProject.id, label: parentProject.title });
        } else {
          path.push({ type: 'tab', tab: 'System Ideas', label: 'System Ideas' });
        }
        path.push({ type: 'systemIdea', id: parentIdea.id, label: parentIdea.title });
      } else {
        path.push({ type: 'tab', tab: 'Insights', label: 'Insights' });
      }
      path.push({ type: 'insight', id: ins.id, label: ins.title });
    }
  } else if (entityType === 'discoveryNote') {
    const note = db.getDiscoveryNote(entityId);
    if (note) {
      const parentInsight = db.getInsights(company.id).find(i => i.sourceNotes && i.sourceNotes.includes(note.id));
      if (parentInsight) {
        const parentIdea = db.getSystemIdeas(company.id).find(s => s.linkedInsights && s.linkedInsights.includes(parentInsight.id));
        if (parentIdea) {
          const parentProject = db.getProjects(company.id).find(p => p.linkedSystemIdeas && p.linkedSystemIdeas.includes(parentIdea.id));
          if (parentProject) {
            path.push({ type: 'tab', tab: 'Projects', label: 'Projects' });
            path.push({ type: 'project', id: parentProject.id, label: parentProject.title });
          } else {
            path.push({ type: 'tab', tab: 'System Ideas', label: 'System Ideas' });
          }
          path.push({ type: 'systemIdea', id: parentIdea.id, label: parentIdea.title });
        } else {
          path.push({ type: 'tab', tab: 'Insights', label: 'Insights' });
        }
        path.push({ type: 'insight', id: parentInsight.id, label: parentInsight.title });
      } else {
        path.push({ type: 'tab', tab: 'Discovery', label: 'Discovery' });
      }
      path.push({ type: 'discoveryNote', id: note.id, label: note.title });
    }
  }
  return path;
}

/**
 * Renders the breadcrumbs and back/forward navigation header.
 */
function renderDrawerNavigation(company, entityType, entityId) {
  const path = reconstructPath(company, entityType, entityId);
  const canGoBack = navHistory.canGoBack();
  const canGoForward = navHistory.canGoForward();

  const breadcrumbsHTML = path.map((item, idx) => {
    const isLast = idx === path.length - 1;
    let iconName = 'folder';
    if (item.type === 'systemIdea') iconName = 'lightbulb';
    if (item.type === 'insight') iconName = 'sparkles';
    if (item.type === 'discoveryNote') iconName = 'file-text';

    const icon = item.type === 'tab' ? '' : getIconHTML(iconName, 'width: 12px; height: 12px; margin-right: 4px; display: inline-block; vertical-align: middle;');
    
    const linkStyle = `color: var(--color-info); text-decoration: none; font-weight: 500; font-size: 11px; cursor: pointer; transition: color var(--transition-fast); display: inline-flex; align-items: center;`;
    const lastStyle = `color: var(--text-primary); font-weight: 600; font-size: 11px; display: inline-flex; align-items: center;`;

    const labelHTML = isLast 
      ? `<span style="${lastStyle}">${escapeHTML(item.label)}</span>` 
      : `<span class="breadcrumb-link" data-type="${item.type}" data-id="${item.id || ''}" data-tab="${item.tab || ''}" style="${linkStyle}">${escapeHTML(item.label)}</span>`;
      
    const separator = isLast ? '' : `<span style="margin: 0 4px; color: var(--text-muted); font-size: 10px; display: inline-flex; align-items: center; opacity: 0.6;">&gt;</span>`;
    
    return `<span style="display: inline-flex; align-items: center; gap: 2px;">${icon}${labelHTML}</span>${separator}`;
  }).join('');

  return `
    <div class="drawer-nav-header" style="margin-bottom: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px; display: flex; flex-direction: column; gap: 8px;">
      <!-- History Navigation (Back / Forward) -->
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-secondary btn-nav-back" ${canGoBack ? '' : 'disabled style="opacity: 0.4; cursor: not-allowed;"'} style="padding: 4px 8px; font-size: 11px; height: 24px; display: flex; align-items: center; gap: 4px; line-height: 1;">
            ${getIconHTML('chevron-left', 'width: 12px; height: 12px;')} Back
          </button>
          <button class="btn btn-secondary btn-nav-forward" ${canGoForward ? '' : 'disabled style="opacity: 0.4; cursor: not-allowed;"'} style="padding: 4px 8px; font-size: 11px; height: 24px; display: flex; align-items: center; gap: 4px; line-height: 1;">
            Forward ${getIconHTML('chevron-right', 'width: 12px; height: 12px;')}
          </button>
        </div>
      </div>
      
      <!-- Breadcrumbs Trail -->
      <div class="breadcrumbs-trail" style="font-size: 11px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; line-height: 1.4; color: var(--text-muted); font-family: var(--font-sans);">
        ${breadcrumbsHTML}
      </div>
    </div>
  `;
}

/**
 * Binds navigation controls event listeners in the drawer.
 */
function bindDrawerNavigationListeners(company, container) {
  const drawerBody = document.getElementById('drawer-body-content');
  if (!drawerBody) return;

  // Back button
  const backBtn = drawerBody.querySelector('.btn-nav-back');
  if (backBtn && !backBtn.disabled) {
    backBtn.addEventListener('click', () => {
      const state = navHistory.back();
      if (state) {
        navigateToState(company, state, container);
      }
    });
  }

  // Forward button
  const forwardBtn = drawerBody.querySelector('.btn-nav-forward');
  if (forwardBtn && !forwardBtn.disabled) {
    forwardBtn.addEventListener('click', () => {
      const state = navHistory.forward();
      if (state) {
        navigateToState(company, state, container);
      }
    });
  }

  // Breadcrumb links
  drawerBody.querySelectorAll('.breadcrumb-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const type = link.getAttribute('data-type');
      if (type === 'tab') {
        const tab = link.getAttribute('data-tab');
        window.location.hash = `#/workspace?id=${company.id}&tab=${encodeURIComponent(tab)}`;
        closeDrawer();
      } else {
        const id = link.getAttribute('data-id');
        if (type === 'project') {
          openProjectDrawer(company, id, container, false);
        } else if (type === 'systemIdea') {
          openIdeaDrawer(company, id, container, false);
        } else if (type === 'insight') {
          openInsightDrawer(company, id, container, false);
        } else if (type === 'discoveryNote') {
          openDiscoveryNoteDrawer(company, id, container, false);
        }
      }
    });
  });
}

/**
 * Routes drawer view to a specific history state.
 */
function navigateToState(company, state, container) {
  if (state.entityType === 'project') {
    openProjectDrawer(company, state.entityId, container, true);
  } else if (state.entityType === 'systemIdea') {
    openIdeaDrawer(company, state.entityId, container, true);
  } else if (state.entityType === 'insight') {
    openInsightDrawer(company, state.entityId, container, true);
  } else if (state.entityType === 'discoveryNote') {
    openDiscoveryNoteDrawer(company, state.entityId, container, true);
  }
}


/**
 * Main renderer for Company Workspace page
 * @param {HTMLElement} viewport 
 * @param {URLSearchParams} params 
 */
export default function renderWorkspace(viewport, params) {
  // Auto-cleanup meeting mode overlay when switching tabs or companies
  const meetingOverlay = document.getElementById('meeting-mode-overlay');
  if (meetingOverlay) {
    meetingOverlay.remove();
  }

  const companyId = params.get('id');
  const activeTab = params.get('tab') || 'Overview';
  
  const company = db.getCompany(companyId);
  if (!company) {
    viewport.innerHTML = `
      <div class="card" style="border-color: var(--color-danger)">
        <h3 style="color: var(--color-danger)">Workspace Not Found</h3>
        <p style="margin-top: 8px;">The requested company workspace does not exist or has been deleted.</p>
        <a href="#/companies" class="btn btn-secondary" style="margin-top: 12px;">Return to Companies</a>
      </div>
    `;
    return;
  }

  // Set topbar indicator
  document.getElementById('topbar-title').innerText = 'Company Workspace';
  const indicator = document.getElementById('workspace-indicator');
  indicator.style.display = 'block';
  document.getElementById('current-workspace-name').innerText = company.name;

  // Render Shell: Header & Tab Buttons
  viewport.innerHTML = `
    <div class="workspace-header">
      <div class="workspace-title-row">
        <div>
          <h2 style="font-size: 22px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 10px;">
            ${escapeHTML(company.name)}
            <span class="badge ${company.status === 'active' ? 'badge-success' : 'badge-warning'}" style="font-size:11px;">${company.status}</span>
          </h2>
          <div style="font-family: var(--font-mono); font-size: 12px; color: var(--text-muted); margin-top: 4px;">
            ${escapeHTML(company.industry)} • Onboarded ${formatDate(company.createdAt)}
          </div>
        </div>

        <!-- Stage Controller -->
        <div class="flex-row" style="gap: 8px; border: 1px solid var(--border-color); padding: 6px 12px; border-radius: var(--radius-sm); background: var(--bg-secondary);">
          <span style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono);">Current Stage:</span>
          <select id="workspace-stage-select" class="select-control" style="width: auto; padding: 2px 24px 2px 8px; height: 26px; font-size: 12px; font-family: var(--font-mono);">
            ${['Discovery', 'Assessment', 'Insights', 'System Ideas', 'Projects', 'Reports'].map(st => `
              <option value="${st}" ${company.stage === st ? 'selected' : ''}>${st}</option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="tabs-container">
        ${['Overview', 'Assessment', 'Discovery Intake', 'Discovery', 'Insights', 'System Ideas', 'Projects', 'Reports'].map(tab => `
          <a class="tab-btn ${activeTab === tab ? 'active' : ''}" 
             href="#/workspace?id=${company.id}&tab=${encodeURIComponent(tab)}">
             ${tab}
          </a>
        `).join('')}
      </div>
    </div>

    <!-- Active Tab Workspace Container -->
    <div id="workspace-tab-content"></div>
  `;

  // Bind stage selector change
  const stageSelect = viewport.querySelector('#workspace-stage-select');
  stageSelect.addEventListener('change', (e) => {
    db.updateCompany(company.id, { stage: e.target.value });
    showToast(`Engagement stage updated to ${e.target.value}`, 'success');
  });

  // Render tab content inside container
  const tabContentContainer = viewport.querySelector('#workspace-tab-content');
  
  switch (activeTab) {
    case 'Overview':
      renderOverviewTab(company, tabContentContainer);
      break;
    case 'Assessment':
      renderAssessmentTab(company, tabContentContainer);
      break;
    case 'Discovery Intake':
      renderDiscoveryIntakeTab(company, tabContentContainer);
      break;
    case 'Discovery':
      renderDiscoveryTab(company, tabContentContainer);
      break;
    case 'Insights':
      renderInsightsTab(company, tabContentContainer);
      break;
    case 'System Ideas':
      renderSystemIdeasTab(company, tabContentContainer);
      break;
    case 'Projects':
      renderProjectsTab(company, tabContentContainer);
      break;
    case 'Reports':
      renderReportsTab(company, tabContentContainer);
      break;
    default:
      renderOverviewTab(company, tabContentContainer);
  }
}

// ==========================================
// TABS RENDERERS
// ==========================================

// --- 1. OVERVIEW TAB ---
function renderOverviewTab(company, container) {
  const notesCount = db.getDiscoveryNotes(company.id).length;
  const insightsCount = db.getInsights(company.id).length;
  const ideasCount = db.getSystemIdeas(company.id).length;
  const activeProj = db.getProjects(company.id).filter(p => p.status === 'in_progress').length;
  const reportsCount = db.getReports(company.id).length;

  container.innerHTML = `
    <div class="grid-cols-3">
      <!-- Description & Metadata -->
      <div class="card flex-column" style="grid-column: span 2; margin-bottom:0;">
        <h3 class="card-title">Profile Overview</h3>
        
        <div style="font-size: 14px; line-height: 1.6; color: var(--text-secondary);">
          <strong>Strategic Description:</strong>
          <p style="margin-top: 6px; padding: 12px; border-radius: var(--radius-sm); background: var(--bg-primary); border: 1px solid var(--border-color); white-space: pre-wrap;">${escapeHTML(company.description || 'No profile description available.')}</p>
        </div>

        <div class="grid-cols-2" style="margin-top: 16px;">
          <div>
            <strong>Contact Person:</strong>
            <div style="margin-top: 4px; color: var(--text-secondary);">${escapeHTML(company.contactName || 'N/A')}</div>
          </div>
          <div>
            <strong>Contact Email:</strong>
            <div style="margin-top: 4px; color: var(--text-secondary);">${company.contactEmail ? `<a href="mailto:${escapeHTML(company.contactEmail)}">${escapeHTML(company.contactEmail)}</a>` : 'N/A'}</div>
          </div>
        </div>

        <div style="margin-top: 16px;">
          <strong>Website Reference:</strong>
          <div style="margin-top: 4px;">
            ${company.website ? `<a href="${escapeHTML(company.website)}" target="_blank" rel="noopener">${escapeHTML(company.website)}</a>` : 'N/A'}
          </div>
        </div>
        
        <div style="margin-top: 24px; border-top:1px solid var(--border-color); padding-top: 16px;">
          <button id="btn-edit-company-meta" class="btn btn-secondary">${getIconHTML('edit-3')} Edit Profile Details</button>
        </div>
      </div>

      <!-- Connected Metrics Checklist -->
      <div class="card flex-column" style="margin-bottom:0;">
        <h3 class="card-title">Intelligence Inventory</h3>
        
        <style>
          .inventory-item {
            display: flex;
            padding: 10px 14px;
            background: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-sm);
            text-decoration: none;
            color: inherit;
            cursor: pointer;
            transition: all var(--transition-fast);
          }
          .inventory-item:hover {
            background: var(--bg-tertiary);
            border-color: var(--border-focus);
            transform: translateX(4px);
          }
        </style>
        
        <div class="flex-column" style="gap: 12px; margin-top: 8px;">
          <a class="inventory-item flex-between" href="#/workspace?id=${company.id}&tab=Discovery">
            <span style="font-weight:500;">Discovery Notes</span>
            <span class="badge badge-info">${notesCount} logged</span>
          </a>
          <a class="inventory-item flex-between" href="#/workspace?id=${company.id}&tab=Insights">
            <span style="font-weight:500;">Key Insights</span>
            <span class="badge badge-success">${insightsCount} extracted</span>
          </a>
          <a class="inventory-item flex-between" href="#/workspace?id=${company.id}&tab=System%20Ideas">
            <span style="font-weight:500;">System Ideas</span>
            <span class="badge badge-warning">${ideasCount} formulated</span>
          </a>
          <a class="inventory-item flex-between" href="#/workspace?id=${company.id}&tab=Projects">
            <span style="font-weight:500;">Active Projects</span>
            <span class="badge badge-info">${activeProj} in pipeline</span>
          </a>
          <a class="inventory-item flex-between" href="#/workspace?id=${company.id}&tab=Reports">
            <span style="font-weight:500;">Generated Reports</span>
            <span class="badge badge-success">${reportsCount} built</span>
          </a>
        </div>

        <div style="margin-top: 16px; font-size:12px; color: var(--text-muted); line-height: 1.4;">
          This panel displays files and assets mapped to this company. Click rows to navigate directly.
        </div>
      </div>
    </div>
  `;

  // Bind Edit Profile Meta Button
  const btnEdit = container.querySelector('#btn-edit-company-meta');
  btnEdit.addEventListener('click', () => {
    const modalBody = `
      <form id="form-edit-company-meta" class="flex-column">
        <div class="form-group">
          <label for="edit-comp-name">Company Name *</label>
          <input type="text" id="edit-comp-name" class="input-control" required value="${escapeHTML(company.name)}">
        </div>
        <div class="grid-cols-2">
          <div class="form-group">
            <label for="edit-comp-industry">Industry *</label>
            <input type="text" id="edit-comp-industry" class="input-control" required value="${escapeHTML(company.industry)}">
          </div>
          <div class="form-group">
            <label for="edit-comp-website">Website URL</label>
            <input type="url" id="edit-comp-website" class="input-control" value="${escapeHTML(company.website || '')}">
          </div>
        </div>
        <div class="grid-cols-2">
          <div class="form-group">
            <label for="edit-comp-contact-name">Primary Contact Name</label>
            <input type="text" id="edit-comp-contact-name" class="input-control" value="${escapeHTML(company.contactName || '')}">
          </div>
          <div class="form-group">
            <label for="edit-comp-contact-email">Contact Email</label>
            <input type="email" id="edit-comp-contact-email" class="input-control" value="${escapeHTML(company.contactEmail || '')}">
          </div>
        </div>
        <div class="form-group">
          <label for="edit-comp-desc">Overview Description</label>
          <textarea id="edit-comp-desc" class="textarea-control" style="height:100px;">${escapeHTML(company.description || '')}</textarea>
        </div>
      </form>
    `;
    const modalFooter = `
      <button class="btn btn-secondary" id="modal-cancel-edit">Cancel</button>
      <button class="btn btn-primary" id="modal-save-edit">Save Profile</button>
    `;

    openModal('Edit Company Profile Details', modalBody, modalFooter);

    document.getElementById('modal-cancel-edit').addEventListener('click', closeModal);
    document.getElementById('modal-save-edit').addEventListener('click', () => {
      const form = document.getElementById('form-edit-company-meta');
      if (form.reportValidity()) {
        const updates = {
          name: document.getElementById('edit-comp-name').value,
          industry: document.getElementById('edit-comp-industry').value,
          website: document.getElementById('edit-comp-website').value,
          contactName: document.getElementById('edit-comp-contact-name').value,
          contactEmail: document.getElementById('edit-comp-contact-email').value,
          description: document.getElementById('edit-comp-desc').value
        };

        db.updateCompany(company.id, updates);
        closeModal();
        showToast('Company profile details saved', 'success');
        
        // Refresh page hash trigger (or re-render tab)
        window.dispatchEvent(new HashChangeEvent('hashchange'));
      }
    });
  });
}

// --- 2. ASSESSMENT TAB ---
function renderAssessmentTab(company, container) {
  const asm = company.assessment || { businessGoals: '', coreProblems: '', operationalBottlenecks: '', techStack: '' };
  
  container.innerHTML = `
    <div class="card" style="margin-bottom:0;">
      <div class="flex-between" style="border-bottom:1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 16px;">
        <h3 class="card-title" style="margin-bottom:0;">Structured Architecture Assessment</h3>
        <div class="flex-row" style="gap: 8px;">
          <button id="asm-btn-edit" class="btn btn-primary active">Edit Mode</button>
          <button id="asm-btn-preview" class="btn btn-secondary">Markdown Preview</button>
        </div>
      </div>

      <!-- Editor Panel -->
      <div id="asm-editor-view">
        <form id="form-assessment" class="flex-column" style="gap:16px;">
          <div class="grid-cols-2">
            <div class="form-group">
              <label for="asm-goals">Core Business Goals (Markdown)</label>
              <textarea id="asm-goals" class="textarea-control" style="height: 180px;" placeholder="What are the critical success factors or strategic goals...">${escapeHTML(asm.businessGoals)}</textarea>
            </div>
            <div class="form-group">
              <label for="asm-problems">Core Problems & Pain Points (Markdown)</label>
              <textarea id="asm-problems" class="textarea-control" style="height: 180px;" placeholder="What are the root cause issues currently being faced...">${escapeHTML(asm.coreProblems)}</textarea>
            </div>
          </div>
          
          <div class="grid-cols-2">
            <div class="form-group">
              <label for="asm-bottlenecks">Operational Bottlenecks (Markdown)</label>
              <textarea id="asm-bottlenecks" class="textarea-control" style="height: 180px;" placeholder="Process friction points, manual overheads, supply chain halts...">${escapeHTML(asm.operationalBottlenecks)}</textarea>
            </div>
            <div class="form-group">
              <label for="asm-tech">Current Technology Stack (Markdown)</label>
              <textarea id="asm-tech" class="textarea-control" style="height: 180px;" placeholder="Key software products, databases, automation configurations...">${escapeHTML(asm.techStack)}</textarea>
            </div>
          </div>

          <div style="border-top:1px solid var(--border-color); padding-top:16px; display:flex; justify-content:flex-end;">
            <button type="submit" class="btn btn-primary">${getIconHTML('save')} Save Assessment Details</button>
          </div>
        </form>
      </div>

      <!-- Preview Panel (Hidden by default) -->
      <div id="asm-preview-view" style="display:none;" class="flex-column">
        <div class="grid-cols-2">
          <div style="border: 1px solid var(--border-color); padding: 16px; border-radius: var(--radius-sm); background: var(--bg-primary)">
            <h4 style="font-size: 13px; color: var(--color-info); margin-bottom: 12px; font-family:var(--font-mono)">BUSINESS GOALS</h4>
            <div class="markdown-body">${parseMarkdown(asm.businessGoals || '*No content provided.*')}</div>
          </div>
          <div style="border: 1px solid var(--border-color); padding: 16px; border-radius: var(--radius-sm); background: var(--bg-primary)">
            <h4 style="font-size: 13px; color: var(--color-info); margin-bottom: 12px; font-family:var(--font-mono)">CORE PROBLEMS</h4>
            <div class="markdown-body">${parseMarkdown(asm.coreProblems || '*No content provided.*')}</div>
          </div>
        </div>
        <div class="grid-cols-2" style="margin-top: 16px;">
          <div style="border: 1px solid var(--border-color); padding: 16px; border-radius: var(--radius-sm); background: var(--bg-primary)">
            <h4 style="font-size: 13px; color: var(--color-info); margin-bottom: 12px; font-family:var(--font-mono)">OPERATIONAL BOTTLENECK</h4>
            <div class="markdown-body">${parseMarkdown(asm.operationalBottlenecks || '*No content provided.*')}</div>
          </div>
          <div style="border: 1px solid var(--border-color); padding: 16px; border-radius: var(--radius-sm); background: var(--bg-primary)">
            <h4 style="font-size: 13px; color: var(--color-info); margin-bottom: 12px; font-family:var(--font-mono)">TECHNOLOGY STACK</h4>
            <div class="markdown-body">${parseMarkdown(asm.techStack || '*No content provided.*')}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  const editBtn = container.querySelector('#asm-btn-edit');
  const previewBtn = container.querySelector('#asm-btn-preview');
  const editView = container.querySelector('#asm-editor-view');
  const previewView = container.querySelector('#asm-preview-view');
  const form = container.querySelector('#form-assessment');

  // Tab switching inside assessment
  editBtn.addEventListener('click', () => {
    editBtn.className = 'btn btn-primary active';
    previewBtn.className = 'btn btn-secondary';
    editView.style.display = 'block';
    previewView.style.display = 'none';
  });

  previewBtn.addEventListener('click', () => {
    previewBtn.className = 'btn btn-primary active';
    editBtn.className = 'btn btn-secondary';
    editView.style.display = 'none';
    
    // Grab latest values from form inputs for live preview
    const goalsVal = container.querySelector('#asm-goals').value;
    const problemsVal = container.querySelector('#asm-problems').value;
    const bottlenecksVal = container.querySelector('#asm-bottlenecks').value;
    const techVal = container.querySelector('#asm-tech').value;

    previewView.innerHTML = `
      <div class="grid-cols-2">
        <div style="border: 1px solid var(--border-color); padding: 16px; border-radius: var(--radius-sm); background: var(--bg-primary)">
          <h4 style="font-size: 13px; color: var(--color-info); margin-bottom: 12px; font-family:var(--font-mono)">BUSINESS GOALS</h4>
          <div class="markdown-body">${parseMarkdown(goalsVal || '*No content provided.*')}</div>
        </div>
        <div style="border: 1px solid var(--border-color); padding: 16px; border-radius: var(--radius-sm); background: var(--bg-primary)">
          <h4 style="font-size: 13px; color: var(--color-info); margin-bottom: 12px; font-family:var(--font-mono)">CORE PROBLEMS</h4>
          <div class="markdown-body">${parseMarkdown(problemsVal || '*No content provided.*')}</div>
        </div>
      </div>
      <div class="grid-cols-2" style="margin-top: 16px;">
        <div style="border: 1px solid var(--border-color); padding: 16px; border-radius: var(--radius-sm); background: var(--bg-primary)">
          <h4 style="font-size: 13px; color: var(--color-info); margin-bottom: 12px; font-family:var(--font-mono)">OPERATIONAL BOTTLENECKS</h4>
          <div class="markdown-body">${parseMarkdown(bottlenecksVal || '*No content provided.*')}</div>
        </div>
        <div style="border: 1px solid var(--border-color); padding: 16px; border-radius: var(--radius-sm); background: var(--bg-primary)">
          <h4 style="font-size: 13px; color: var(--color-info); margin-bottom: 12px; font-family:var(--font-mono)">TECHNOLOGY STACK</h4>
          <div class="markdown-body">${parseMarkdown(techVal || '*No content provided.*')}</div>
        </div>
      </div>
    `;
    previewView.style.display = 'flex';
  });

  // Save changes
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const updatedAsm = {
      businessGoals: container.querySelector('#asm-goals').value,
      coreProblems: container.querySelector('#asm-problems').value,
      operationalBottlenecks: container.querySelector('#asm-bottlenecks').value,
      techStack: container.querySelector('#asm-tech').value
    };

    db.updateCompany(company.id, { assessment: updatedAsm });
    showToast('Architecture assessment details successfully saved', 'success');
  });
}

// --- 3. DISCOVERY NOTES TAB ---
function renderDiscoveryTab(company, container) {
  const notes = db.getDiscoveryNotes(company.id);

  container.innerHTML = `
    <div class="card" style="margin-bottom:0;">
      <div class="flex-between" style="border-bottom:1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 16px;">
        <h3 class="card-title" style="margin-bottom:0;">Discovery & Shadowing Notes</h3>
        <button id="btn-add-note" class="btn btn-primary">
          ${getIconHTML('plus')} Capture Discovery Note
        </button>
      </div>

      <!-- Table of Notes -->
      <div class="table-container">
        ${notes.length === 0 ? `
          <div style="text-align: center; color: var(--text-muted); padding: 30px 0;">
            No discovery notes captured yet. Shadow operations or interview team members to capture insights.
          </div>
        ` : `
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Category</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${notes.map(note => `
                <tr class="clickable-note-row" data-id="${note.id}" style="cursor:pointer;">
                  <td style="font-family: var(--font-mono); font-size:12px;">${formatDate(note.date)}</td>
                  <td><strong style="color: var(--text-primary)">${escapeHTML(note.title)}</strong></td>
                  <td><span class="badge badge-info">${note.category}</span></td>
                  <td style="text-align:right;" class="no-click-actions">
                    <button class="btn-icon btn-edit-note" data-id="${note.id}" title="Edit Note">${getIconHTML('edit-3')}</button>
                    <button class="btn-icon btn-delete-note" data-id="${note.id}" title="Delete Note" style="color:var(--color-danger)">${getIconHTML('trash')}</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    </div>
  `;

  // Bind note row click (opens drawer)
  container.querySelectorAll('.clickable-note-row').forEach(row => {
    row.addEventListener('click', (e) => {
      // Ignore click if clicking action buttons
      if (e.target.closest('.no-click-actions')) return;
      const noteId = row.getAttribute('data-id');
      openDiscoveryNoteDrawer(company, noteId, container);
    });
  });

  // Add note action
  container.querySelector('#btn-add-note').addEventListener('click', () => {
    openNoteFormModal(company, null, () => {
      renderDiscoveryTab(company, container);
    });
  });

  // Edit Note
  container.querySelectorAll('.btn-edit-note').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const noteId = btn.getAttribute('data-id');
      openNoteFormModal(company, noteId, () => {
        renderDiscoveryTab(company, container);
      });
    });
  });

  // Delete Note
  container.querySelectorAll('.btn-delete-note').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const noteId = btn.getAttribute('data-id');
      const note = db.getDiscoveryNote(noteId);
      if (confirm(`Are you sure you want to delete the note "${note.title}"?`)) {
        db.deleteDiscoveryNote(noteId);
        showToast('Discovery note deleted', 'warning');
        renderDiscoveryTab(company, container);
      }
    });
  });
}

function openDiscoveryNoteDrawer(company, noteId, container, skipHistoryPush = false) {
  const note = db.getDiscoveryNote(noteId);
  if (!note) return;

  if (!skipHistoryPush) {
    const isDrawerActive = document.getElementById('app-drawer').classList.contains('active');
    if (!isDrawerActive) {
      navHistory.clear();
    }
    navHistory.push('discoveryNote', noteId, note.title);
  }

  const navHTML = renderDrawerNavigation(company, 'discoveryNote', noteId);

  const bodyHTML = `
    ${navHTML}
    <div class="flex-column" style="gap:16px;">
      <div class="flex-between" style="font-family: var(--font-mono); font-size:12px; color: var(--text-muted);">
        <span>Category: <span class="badge badge-info">${note.category}</span></span>
        <span>Date: ${formatDate(note.date)}</span>
      </div>
      
      <div style="border-top:1px solid var(--border-color); padding-top:12px;" class="markdown-body">
        ${parseMarkdown(note.content)}
      </div>
    </div>
  `;

  openDrawer(note.title, bodyHTML, () => {
    // On Edit click in drawer
    closeDrawer();
    openNoteFormModal(company, note.id, () => {
      renderDiscoveryTab(company, container);
      // Re-open updated drawer
      openDiscoveryNoteDrawer(company, note.id, container, true);
    });
  });

  bindDrawerNavigationListeners(company, container);
}

function openNoteFormModal(company, noteId = null, onSavedCallback) {
  const note = noteId ? db.getDiscoveryNote(noteId) : null;
  const isEdit = !!note;

  const modalBody = `
    <form id="form-note-capture" class="flex-column">
      <div class="form-group">
        <label for="note-title">Note Title *</label>
        <input type="text" id="note-title" class="input-control" required placeholder="e.g. Cleanroom Calibrations Interview" value="${isEdit ? escapeHTML(note.title) : ''}">
      </div>
      <div class="grid-cols-2">
        <div class="form-group">
          <label for="note-category">Category</label>
          <select id="note-category" class="select-control">
            <option value="interview" ${isEdit && note.category === 'interview' ? 'selected' : ''}>Interview</option>
            <option value="observation" ${isEdit && note.category === 'observation' ? 'selected' : ''}>Observation / Shadowing</option>
            <option value="document_review" ${isEdit && note.category === 'document_review' ? 'selected' : ''}>Document/Process Review</option>
            <option value="other" ${isEdit && note.category === 'other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label for="note-date">Date Mapped *</label>
          <input type="date" id="note-date" class="input-control" required value="${isEdit ? note.date : new Date().toISOString().split('T')[0]}">
        </div>
      </div>
      <div class="form-group">
        <label for="note-content">Findings Content (Markdown supported) *</label>
        <textarea id="note-content" class="textarea-control" style="height:250px;" required placeholder="Describe what you observed, quotes, telemetry metrics, bottlenecks...">${isEdit ? escapeHTML(note.content) : ''}</textarea>
      </div>
    </form>
  `;

  const modalFooter = `
    <button class="btn btn-secondary" id="modal-cancel-note">Cancel</button>
    <button class="btn btn-primary" id="modal-save-note">${isEdit ? 'Save Changes' : 'Capture Note'}</button>
  `;

  openModal(isEdit ? 'Edit Discovery Note' : 'Capture New Discovery Note', modalBody, modalFooter);

  document.getElementById('modal-cancel-note').addEventListener('click', closeModal);
  document.getElementById('modal-save-note').addEventListener('click', () => {
    const form = document.getElementById('form-note-capture');
    if (form.reportValidity()) {
      const data = {
        companyId: company.id,
        title: document.getElementById('note-title').value,
        category: document.getElementById('note-category').value,
        date: document.getElementById('note-date').value,
        content: document.getElementById('note-content').value
      };

      if (isEdit) {
        db.updateDiscoveryNote(note.id, data);
        showToast('Discovery note updated', 'success');
      } else {
        db.addDiscoveryNote(data);
        showToast('New discovery note captured', 'success');
      }
      closeModal();
      if (onSavedCallback) onSavedCallback();
    }
  });
}

// --- 4. INSIGHTS TAB ---
function renderInsightsTab(company, container) {
  const insights = db.getInsights(company.id);
  const categories = ['technology', 'process', 'people', 'data'];

  // Categorize
  const grouped = {};
  categories.forEach(cat => grouped[cat] = []);
  insights.forEach(ins => {
    if (grouped[ins.category]) {
      grouped[ins.category].push(ins);
    } else {
      // Fallback
      if (!grouped.other) grouped.other = [];
      grouped.other.push(ins);
    }
  });

  container.innerHTML = `
    <div class="flex-between" style="margin-bottom: 20px;">
      <div style="font-size:13px; color:var(--text-secondary)">
        Grouped by Architect Pillars. Click cards to view source Discovery Notes.
      </div>
      <div class="flex-row" style="gap: 10px;">
        <button id="btn-generate-insights" class="btn btn-secondary" style="display: flex; align-items: center; gap: 6px;">
          ${getIconHTML('sparkles', 'width: 14px; height: 14px;')} Generate Insights From Discovery
        </button>
        <button id="btn-add-insight" class="btn btn-primary" style="display: flex; align-items: center; gap: 6px;">
          ${getIconHTML('plus')} Extract Insight
        </button>
      </div>
    </div>

    <!-- Pillars Board -->
    <div class="kanban-board">
      ${categories.map(cat => {
        const list = grouped[cat] || [];
        return `
          <div class="kanban-column">
            <div class="kanban-column-header">
              <span>${cat}</span>
              <span class="badge badge-neutral" style="font-size:10px;">${list.length}</span>
            </div>
            
            <div class="flex-column" style="gap:10px; margin-top:8px;">
              ${list.length === 0 ? `
                <div style="font-size:11px; color: var(--text-muted); text-align:center; padding: 20px 0; border: 1px dashed var(--border-color); border-radius:var(--radius-sm)">
                  Empty Pillar
                </div>
              ` : list.map(ins => {
                let impBadge = 'badge-info';
                if (ins.impact === 'high') impBadge = 'badge-danger';
                if (ins.impact === 'medium') impBadge = 'badge-warning';

                return `
                  <div class="kanban-card btn-view-insight" data-id="${ins.id}">
                    <div class="kanban-card-title">${escapeHTML(ins.title)}</div>
                    <div style="font-size:11px; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                      ${escapeHTML(ins.description)}
                    </div>
                    <div class="kanban-card-meta">
                      <span class="badge ${impBadge}" style="font-size: 8px;">${ins.impact}</span>
                      <span>${ins.sourceNotes.length} sources</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Bind Insight cards
  container.querySelectorAll('.btn-view-insight').forEach(card => {
    card.addEventListener('click', () => {
      const insId = card.getAttribute('data-id');
      openInsightDrawer(company, insId, container);
    });
  });

  // Add Insight Modal Trigger
  container.querySelector('#btn-add-insight').addEventListener('click', () => {
    openInsightFormModal(company, null, () => {
      renderInsightsTab(company, container);
    });
  });

  // Generate Insights Trigger
  container.querySelector('#btn-generate-insights').addEventListener('click', () => {
    openGenerateInsightsModal(company, container);
  });
}

function openInsightDrawer(company, insId, container, skipHistoryPush = false) {
  const insight = db.getInsight(insId);
  if (!insight) return;

  if (!skipHistoryPush) {
    const isDrawerActive = document.getElementById('app-drawer').classList.contains('active');
    if (!isDrawerActive) {
      navHistory.clear();
    }
    navHistory.push('insight', insId, insight.title);
  }

  const navHTML = renderDrawerNavigation(company, 'insight', insId);
  const sourceNotes = insight.sourceNotes.map(nId => db.getDiscoveryNote(nId)).filter(n => !!n);

  let impBadge = 'badge-info';
  if (insight.impact === 'high') impBadge = 'badge-danger';
  if (insight.impact === 'medium') impBadge = 'badge-warning';

  const bodyHTML = `
    ${navHTML}
    <div class="flex-column" style="gap:16px;">
      <div class="flex-between" style="font-family: var(--font-mono); font-size:12px; color: var(--text-muted);">
        <span>Impact Level: <span class="badge ${impBadge}">${insight.impact}</span></span>
        <span>Pillar: <span class="badge badge-info">${insight.category}</span></span>
      </div>

      <div>
        <strong>Architect Formulation Summary:</strong>
        <p style="margin-top:6px; color: var(--text-secondary); line-height: 1.5;">${escapeHTML(insight.description)}</p>
      </div>

      <div style="border-top:1px solid var(--border-color); padding-top:12px;">
        <strong>Justifying Evidence (Linked Notes):</strong>
        <div style="margin-top:8px; display:flex; flex-direction:column; gap:8px;">
          ${sourceNotes.length === 0 ? `
            <span style="color:var(--text-muted); font-size:13px;">No justifying discovery notes linked to this insight.</span>
          ` : sourceNotes.map(note => `
            <div class="flex-between btn-goto-note" data-note-id="${note.id}" style="padding: 10px; border: 1px solid var(--border-color); border-radius:var(--radius-sm); cursor:pointer; background:var(--bg-primary);">
              <div>
                <strong style="color: var(--color-info); font-size: 13px;">${escapeHTML(note.title)}</strong>
                <div style="font-size:11px; color: var(--text-muted); margin-top:2px;">Captured ${formatDate(note.date)}</div>
              </div>
              ${getIconHTML('arrow-right', 'width:14px; color: var(--text-muted);')}
            </div>
          `).join('')}
        </div>
      </div>

      <div style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top:16px;">
        <button id="btn-delete-insight-action" class="btn btn-danger" style="width:100%">${getIconHTML('trash')} Delete Insight</button>
      </div>
    </div>
  `;

  openDrawer(insight.title, bodyHTML, () => {
    closeDrawer();
    openInsightFormModal(company, insight.id, () => {
      renderInsightsTab(company, container);
      openInsightDrawer(company, insight.id, container, true);
    });
  });

  const drawerBody = document.getElementById('drawer-body-content');
  bindDrawerNavigationListeners(company, container);

  // Action links inside Drawer: Click source note -> open note drawer
  drawerBody.querySelectorAll('.btn-goto-note').forEach(btn => {
    btn.addEventListener('click', () => {
      const noteId = btn.getAttribute('data-note-id');
      openDiscoveryNoteDrawer(company, noteId, container, false);
    });
  });

  // Delete Action from Drawer
  document.getElementById('btn-delete-insight-action').addEventListener('click', () => {
    if (confirm(`Delete this insight? All connections to system ideas will be severed.`)) {
      db.deleteInsight(insight.id);
      showToast('Insight deleted successfully', 'warning');
      closeDrawer();
      renderInsightsTab(company, container);
    }
  });
}

function openInsightFormModal(company, insightId = null, onSavedCallback) {
  const insight = insightId ? db.getInsight(insightId) : null;
  const isEdit = !!insight;
  const notes = db.getDiscoveryNotes(company.id);

  const modalBody = `
    <form id="form-insight-extract" class="flex-column">
      <div class="form-group">
        <label for="ins-title">Insight Formulation Title *</label>
        <input type="text" id="ins-title" class="input-control" required placeholder="e.g. Fragmented Microcode Registries" value="${isEdit ? escapeHTML(insight.title) : ''}">
      </div>
      
      <div class="grid-cols-2">
        <div class="form-group">
          <label for="ins-category">Architect Pillar</label>
          <select id="ins-category" class="select-control">
            <option value="technology" ${isEdit && insight.category === 'technology' ? 'selected' : ''}>Technology</option>
            <option value="process" ${isEdit && insight.category === 'process' ? 'selected' : ''}>Process</option>
            <option value="people" ${isEdit && insight.category === 'people' ? 'selected' : ''}>People</option>
            <option value="data" ${isEdit && insight.category === 'data' ? 'selected' : ''}>Data</option>
          </select>
        </div>
        <div class="form-group">
          <label for="ins-impact">Business Impact</label>
          <select id="ins-impact" class="select-control">
            <option value="high" ${isEdit && insight.impact === 'high' ? 'selected' : ''}>High Impact</option>
            <option value="medium" ${isEdit && insight.impact === 'medium' ? 'selected' : ''}>Medium Impact</option>
            <option value="low" ${isEdit && insight.impact === 'low' ? 'selected' : ''}>Low Impact</option>
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="ins-desc">Formulation Summary *</label>
        <textarea id="ins-desc" class="textarea-control" style="height:100px;" required placeholder="Draft a comprehensive synthesis of this intelligence insight...">${isEdit ? escapeHTML(insight.description) : ''}</textarea>
      </div>

      <!-- Links to Discovery Notes Checklist -->
      <div class="form-group">
        <label>Link Source Evidence (Discovery Notes)</label>
        <div class="link-selection-list">
          ${notes.length === 0 ? `
            <div style="color:var(--text-muted); font-size:12px; padding:4px;">No discovery notes exist to link.</div>
          ` : notes.map(note => {
            const isChecked = isEdit && insight.sourceNotes.includes(note.id);
            return `
              <label class="link-selection-item">
                <input type="checkbox" class="ins-source-checkbox" value="${note.id}" ${isChecked ? 'checked' : ''}>
                <span>${escapeHTML(note.title)} (${note.category})</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    </form>
  `;

  const modalFooter = `
    <button class="btn btn-secondary" id="modal-cancel-ins">Cancel</button>
    <button class="btn btn-primary" id="modal-save-ins">${isEdit ? 'Save Changes' : 'Extract Insight'}</button>
  `;

  openModal(isEdit ? 'Edit Extracted Insight' : 'Extract New Architect Insight', modalBody, modalFooter);

  document.getElementById('modal-cancel-ins').addEventListener('click', closeModal);
  document.getElementById('modal-save-ins').addEventListener('click', () => {
    const form = document.getElementById('form-insight-extract');
    if (form.reportValidity()) {
      // Collect selected notes
      const selectedNotes = [];
      document.querySelectorAll('.ins-source-checkbox:checked').forEach(cb => {
        selectedNotes.push(cb.value);
      });

      const data = {
        companyId: company.id,
        title: document.getElementById('ins-title').value,
        category: document.getElementById('ins-category').value,
        impact: document.getElementById('ins-impact').value,
        description: document.getElementById('ins-desc').value,
        sourceNotes: selectedNotes
      };

      if (isEdit) {
        db.updateInsight(insight.id, data);
        showToast('Insight updated', 'success');
      } else {
        db.addInsight(data);
        showToast('Insight successfully extracted and linked', 'success');
      }
      closeModal();
      if (onSavedCallback) onSavedCallback();
    }
  });
}

// --- 5. SYSTEM IDEAS TAB ---
function renderSystemIdeasTab(company, container) {
  const ideas = db.getSystemIdeas(company.id);
  const statuses = ['backlog', 'refining', 'approved', 'rejected'];

  const grouped = {};
  statuses.forEach(s => grouped[s] = []);
  ideas.forEach(id => {
    if (grouped[id.status]) {
      grouped[id.status].push(id);
    }
  });

  container.innerHTML = `
    <div class="flex-between" style="margin-bottom: 20px;">
      <div style="font-size:13px; color:var(--text-secondary)">
        Grouped by Solution Lifecycle. Click to review linked Justifications.
      </div>
      <div style="display:flex; gap:10px;">
        <button id="btn-generate-ideas" class="btn btn-secondary">
          ${getIconHTML('sparkles')} Generate System Ideas From Insights
        </button>
        <button id="btn-add-idea" class="btn btn-primary">
          ${getIconHTML('plus')} Formulate System Idea
        </button>
      </div>
    </div>

    <!-- Solutions Board -->
    <div class="kanban-board">
      ${statuses.map(status => {
        const list = grouped[status] || [];
        return `
          <div class="kanban-column">
            <div class="kanban-column-header">
              <span>${status.replace('_', ' ')}</span>
              <span class="badge badge-neutral" style="font-size:10px;">${list.length}</span>
            </div>
            
            <div class="flex-column" style="gap:10px; margin-top:8px;">
              ${list.length === 0 ? `
                <div style="font-size:11px; color: var(--text-muted); text-align:center; padding: 20px 0; border: 1px dashed var(--border-color); border-radius:var(--radius-sm)">
                  Empty
                </div>
              ` : list.map(idea => {
                let priorityClass = 'badge-info';
                if (idea.priority === 'high') priorityClass = 'badge-danger';
                if (idea.priority === 'medium') priorityClass = 'badge-warning';

                return `
                  <div class="kanban-card btn-view-idea" data-id="${idea.id}">
                    <div class="kanban-card-title">${escapeHTML(idea.title)}</div>
                    <div style="font-size:11px; color: var(--text-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                      ${escapeHTML(idea.description)}
                    </div>
                    <div class="kanban-card-meta">
                      <span class="badge ${priorityClass}" style="font-size: 8px;">${idea.priority}</span>
                      <span style="font-size: 10px; color:var(--text-muted); font-family:var(--font-mono)">${idea.feasibility}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Bind Idea cards click
  container.querySelectorAll('.btn-view-idea').forEach(card => {
    card.addEventListener('click', () => {
      const ideaId = card.getAttribute('data-id');
      openIdeaDrawer(company, ideaId, container);
    });
  });

  // Trigger Generate System Ideas From Insights Modal
  const genBtn = container.querySelector('#btn-generate-ideas');
  if (genBtn) {
    genBtn.addEventListener('click', () => {
      openGenerateIdeasModal(company, container);
    });
  }

  // Trigger Formulate System Idea Modal
  container.querySelector('#btn-add-idea').addEventListener('click', () => {
    openIdeaFormModal(company, null, () => {
      renderSystemIdeasTab(company, container);
    });
  });
}

function openIdeaDrawer(company, ideaId, container, skipHistoryPush = false) {
  const idea = db.getSystemIdea(ideaId);
  if (!idea) return;

  if (!skipHistoryPush) {
    const isDrawerActive = document.getElementById('app-drawer').classList.contains('active');
    if (!isDrawerActive) {
      navHistory.clear();
    }
    navHistory.push('systemIdea', ideaId, idea.title);
  }

  const navHTML = renderDrawerNavigation(company, 'systemIdea', ideaId);
  const linkedInsights = idea.linkedInsights.map(iId => db.getInsight(iId)).filter(i => !!i);

  let priBadge = 'badge-info';
  if (idea.priority === 'high') priBadge = 'badge-danger';
  if (idea.priority === 'medium') priBadge = 'badge-warning';

  const bodyHTML = `
    ${navHTML}
    <div class="flex-column" style="gap:16px;">
      <div class="grid-cols-3" style="font-family: var(--font-mono); font-size:11px; text-align:center;">
        <div style="border: 1px solid var(--border-color); padding: 4px; border-radius: 4px;">
          <div style="color:var(--text-muted)">Priority</div>
          <span class="badge ${priBadge}" style="margin-top:2px;">${idea.priority}</span>
        </div>
        <div style="border: 1px solid var(--border-color); padding: 4px; border-radius: 4px;">
          <div style="color:var(--text-muted)">Feasibility</div>
          <span style="display:inline-block; font-weight:600; margin-top:2px; text-transform:uppercase;">${idea.feasibility}</span>
        </div>
        <div style="border: 1px solid var(--border-color); padding: 4px; border-radius: 4px;">
          <div style="color:var(--text-muted)">Status</div>
          <span id="idea-drawer-status-badge" style="display:inline-block; font-weight:600; margin-top:2px; text-transform:uppercase;">${idea.status}</span>
        </div>
      </div>

      <div style="border-top: 1px solid var(--border-color); padding-top: 12px;">
        <label for="idea-drawer-status" style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); font-weight:600; display:block; margin-bottom:6px;">Lifecycle Status Control</label>
        <select id="idea-drawer-status" class="select-control" style="width:100%;">
          <option value="backlog" ${idea.status === 'backlog' ? 'selected' : ''}>Backlog</option>
          <option value="refining" ${idea.status === 'refining' ? 'selected' : ''}>Refining</option>
          <option value="approved" ${idea.status === 'approved' ? 'selected' : ''}>Approved</option>
          <option value="rejected" ${idea.status === 'rejected' ? 'selected' : ''}>Rejected</option>
        </select>
      </div>

      <div>
        <strong>System Design Concept:</strong>
        <p style="margin-top:6px; color: var(--text-secondary); line-height: 1.5;">${escapeHTML(idea.description)}</p>
      </div>

      <div style="border-top:1px solid var(--border-color); padding-top:12px;">
        <strong>Justifying Architecture Insights:</strong>
        <div style="margin-top:8px; display:flex; flex-direction:column; gap:8px;">
          ${linkedInsights.length === 0 ? `
            <span style="color:var(--text-muted); font-size:13px;">No architect insights linked to this system design proposal.</span>
          ` : linkedInsights.map(ins => `
            <div class="flex-between btn-goto-insight" data-insight-id="${ins.id}" style="padding: 10px; border: 1px solid var(--border-color); border-radius:var(--radius-sm); cursor:pointer; background:var(--bg-primary);">
              <div>
                <strong style="color: var(--color-info); font-size: 13px;">${escapeHTML(ins.title)}</strong>
                <div style="font-size:11px; color: var(--text-muted); margin-top:2px;">Pillar: ${ins.category} • Impact: ${ins.impact}</div>
              </div>
              ${getIconHTML('arrow-right', 'width:14px; color: var(--text-muted);')}
            </div>
          `).join('')}
        </div>
      </div>

      <div style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top:16px;">
        <button id="btn-delete-idea-action" class="btn btn-danger" style="width:100%">${getIconHTML('trash')} Delete Proposal</button>
      </div>
    </div>
  `;

  openDrawer(idea.title, bodyHTML, () => {
    closeDrawer();
    openIdeaFormModal(company, idea.id, () => {
      renderSystemIdeasTab(company, container);
      openIdeaDrawer(company, idea.id, container, true);
    });
  });

  const drawerBody = document.getElementById('drawer-body-content');
  bindDrawerNavigationListeners(company, container);

  // Bind lifecycle status dropdown listener
  const statusSelect = drawerBody.querySelector('#idea-drawer-status');
  if (statusSelect) {
    statusSelect.addEventListener('change', (e) => {
      const oldStatus = db.getSystemIdea(idea.id).status;
      const newStatus = e.target.value;
      console.log(
        '[Lifecycle Update]',
        idea.id,
        oldStatus,
        newStatus
      );
      
      db.updateSystemIdea(idea.id, { status: newStatus });
      showToast(`Lifecycle status updated to: ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`, 'success');
      
      const badge = drawerBody.querySelector('#idea-drawer-status-badge');
      if (badge) {
        badge.textContent = newStatus.toUpperCase();
      }
      
      renderSystemIdeasTab(company, container);
    });
  }

  drawerBody.querySelectorAll('.btn-goto-insight').forEach(btn => {
    btn.addEventListener('click', () => {
      const insId = btn.getAttribute('data-insight-id');
      openInsightDrawer(company, insId, container, false);
    });
  });

  document.getElementById('btn-delete-idea-action').addEventListener('click', () => {
    if (confirm(`Delete this system design proposal? All connections inside active projects will be severed.`)) {
      db.deleteSystemIdea(idea.id);
      showToast('System design proposal deleted', 'warning');
      closeDrawer();
      renderSystemIdeasTab(company, container);
    }
  });
}

function openIdeaFormModal(company, ideaId = null, onSavedCallback) {
  const idea = ideaId ? db.getSystemIdea(ideaId) : null;
  const isEdit = !!idea;
  const insights = db.getInsights(company.id);

  const modalBody = `
    <form id="form-idea-formulate" class="flex-column">
      <div class="form-group">
        <label for="idea-title">Design Proposal Title *</label>
        <input type="text" id="idea-title" class="input-control" required placeholder="e.g. Automated Schema CI Verification Pipeline" value="${isEdit ? escapeHTML(idea.title) : ''}">
      </div>
      
      <div class="grid-cols-3">
        <div class="form-group">
          <label for="idea-priority">Priority</label>
          <select id="idea-priority" class="select-control">
            <option value="high" ${isEdit && idea.priority === 'high' ? 'selected' : ''}>High</option>
            <option value="medium" ${isEdit && idea.priority === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="low" ${isEdit && idea.priority === 'low' ? 'selected' : ''}>Low</option>
          </select>
        </div>
        <div class="form-group">
          <label for="idea-feasibility">Feasibility</label>
          <select id="idea-feasibility" class="select-control">
            <option value="easy" ${isEdit && idea.feasibility === 'easy' ? 'selected' : ''}>Easy</option>
            <option value="moderate" ${isEdit && idea.feasibility === 'moderate' ? 'selected' : ''}>Moderate</option>
            <option value="complex" ${isEdit && idea.feasibility === 'complex' ? 'selected' : ''}>Complex</option>
          </select>
        </div>
        <div class="form-group">
          <label for="idea-status">Lifecycle Status</label>
          <select id="idea-status" class="select-control">
            <option value="backlog" ${isEdit && idea.status === 'backlog' ? 'selected' : ''}>Backlog</option>
            <option value="refining" ${isEdit && idea.status === 'refining' ? 'selected' : ''}>Refining</option>
            <option value="approved" ${isEdit && idea.status === 'approved' ? 'selected' : ''}>Approved</option>
            <option value="rejected" ${isEdit && idea.status === 'rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="idea-desc">Design Concept Description *</label>
        <textarea id="idea-desc" class="textarea-control" style="height:100px;" required placeholder="Formulate the architecture proposal and structural modifications...">${isEdit ? escapeHTML(idea.description) : ''}</textarea>
      </div>

      <!-- Links to Insights Checklist -->
      <div class="form-group">
        <label>Link Justifying Architecture Insights</label>
        <div class="link-selection-list">
          ${insights.length === 0 ? `
            <div style="color:var(--text-muted); font-size:12px; padding:4px;">No insights exist to justify this proposal.</div>
          ` : insights.map(ins => {
            const isChecked = isEdit && idea.linkedInsights.includes(ins.id);
            return `
              <label class="link-selection-item">
                <input type="checkbox" class="idea-insight-checkbox" value="${ins.id}" ${isChecked ? 'checked' : ''}>
                <span>${escapeHTML(ins.title)} (${ins.category})</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    </form>
  `;

  const modalFooter = `
    <button class="btn btn-secondary" id="modal-cancel-idea">Cancel</button>
    <button class="btn btn-primary" id="modal-save-idea">${isEdit ? 'Save Changes' : 'Formulate Proposal'}</button>
  `;

  openModal(isEdit ? 'Edit System Design Proposal' : 'Formulate System Design Proposal', modalBody, modalFooter);

  document.getElementById('modal-cancel-idea').addEventListener('click', closeModal);
  document.getElementById('modal-save-idea').addEventListener('click', () => {
    const form = document.getElementById('form-idea-formulate');
    if (form.reportValidity()) {
      const selectedInsights = [];
      document.querySelectorAll('.idea-insight-checkbox:checked').forEach(cb => {
        selectedInsights.push(cb.value);
      });

      const data = {
        companyId: company.id,
        title: document.getElementById('idea-title').value,
        priority: document.getElementById('idea-priority').value,
        feasibility: document.getElementById('idea-feasibility').value,
        status: document.getElementById('idea-status').value,
        description: document.getElementById('idea-desc').value,
        linkedInsights: selectedInsights
      };

      if (isEdit) {
        db.updateSystemIdea(idea.id, data);
        showToast('System design proposal updated', 'success');
      } else {
        db.addSystemIdea(data);
        showToast('System design proposal formulated', 'success');
      }
      closeModal();
      if (onSavedCallback) onSavedCallback();
    }
  });
}

// --- 6. PROJECTS TAB ---
function renderProjectsTab(company, container) {
  const projects = db.getProjects(company.id);

  container.innerHTML = `
    <div class="flex-between" style="margin-bottom: 20px;">
      <div style="font-size:13px; color:var(--text-secondary)">
        Track implementation of proposed architecture changes.
      </div>
      <button id="btn-add-project" class="btn btn-primary">
        ${getIconHTML('plus')} Launch Project
      </button>
    </div>

    <!-- Projects Grid -->
    ${projects.length === 0 ? `
      <div class="card" style="text-align:center; padding:30px 0; color:var(--text-muted); margin-bottom:0;">
        No active transformation projects created. Approve system ideas and initiate launch.
      </div>
    ` : `
      <div class="grid-cols-2">
        ${projects.map(proj => {
          let statusBadge = 'badge-neutral';
          if (proj.status === 'in_progress') statusBadge = 'badge-info';
          if (proj.status === 'completed') statusBadge = 'badge-success';
          if (proj.status === 'on_hold') statusBadge = 'badge-danger';

          const progress = (db && typeof db.calcProjectProgress === 'function') ? db.calcProjectProgress(proj) : proj.progress;

          return `
            <div class="card flex-column btn-view-project" data-id="${proj.id}" style="cursor:pointer; justify-content:space-between; margin-bottom:0; min-height: 180px;">
              <div>
                <div class="flex-between" style="align-items:flex-start;">
                  <h4 style="font-size:14px; font-weight:600; font-family:var(--font-mono); color: var(--text-primary);">
                    ${escapeHTML(proj.title)}
                  </h4>
                  <span class="badge ${statusBadge}">${proj.status.replace('_', ' ')}</span>
                </div>
                <p style="font-size:12px; color: var(--text-secondary); margin-top:6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                  ${escapeHTML(proj.description || 'No description provided.')}
                </p>
              </div>

              <!-- Progress and Dates footer -->
              <div style="margin-top:16px; border-top: 1px solid var(--border-color); padding-top:10px;">
                <div style="margin-bottom: 8px;">
                  <div class="flex-between" style="font-size:11px; margin-bottom:2px; font-family:var(--font-mono)">
                    <span>Execution Progress</span>
                    <span>${progress}%</span>
                  </div>
                  <div style="height:4px; background:var(--bg-tertiary); border-radius:2px; overflow:hidden;">
                    <div style="height:100%; width:${progress}%; background:var(--color-success); border-radius:2px;"></div>
                  </div>
                </div>
                
                <div class="flex-between" style="font-size:11px; color:var(--text-muted);">
                  <span>Timeline: ${formatDate(proj.startDate)} to ${formatDate(proj.endDate)}</span>
                  <span>${proj.linkedSystemIdeas.length} solutions linked</span>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;

  // Bind Projects click
  container.querySelectorAll('.btn-view-project').forEach(card => {
    card.addEventListener('click', () => {
      const projId = card.getAttribute('data-id');
      openProjectDrawer(company, projId, container);
    });
  });

  // Launch Project Button
  container.querySelector('#btn-add-project').addEventListener('click', () => {
    openProjectFormModal(company, null, () => {
      renderProjectsTab(company, container);
    });
  });
}

function openProjectDrawer(company, projId, container, skipHistoryPush = false) {
  let proj = db.getProject(projId);
  if (!proj) return;

  if (db && typeof db.ensureProjectMilestones === 'function') {
    proj = db.ensureProjectMilestones(projId) || proj;
  }

  if (!skipHistoryPush) {
    const isDrawerActive = document.getElementById('app-drawer').classList.contains('active');
    if (!isDrawerActive) {
      navHistory.clear();
    }
    navHistory.push('project', projId, proj.title);
  }

  const navHTML = renderDrawerNavigation(company, 'project', projId);
  const progress = (db && typeof db.calcProjectProgress === 'function') ? db.calcProjectProgress(proj) : proj.progress;
  const linkedIdeas = proj.linkedSystemIdeas.map(idId => db.getSystemIdea(idId)).filter(i => !!i);

  let statusBadge = 'badge-neutral';
  if (proj.status === 'in_progress') statusBadge = 'badge-info';
  if (proj.status === 'completed') statusBadge = 'badge-success';
  if (proj.status === 'on_hold') statusBadge = 'badge-danger';

  // 1. Milestones section
  const milestonesHTML = (proj.milestones && proj.milestones.length > 0) ? `
    <div style="border-top:1px solid var(--border-color); padding-top:12px;">
      <strong style="color: var(--text-primary); font-size:13px;">Project Milestones</strong>
      <div class="milestones-list" style="margin-top:8px; display:flex; flex-direction:column; gap:6px;">
        ${proj.milestones.map(ms => `
          <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-size:12px; padding:6px 10px; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px solid var(--border-color); transition:background 0.2s;">
            <input type="checkbox" class="ms-checkbox" data-ms-id="${ms.id}" ${ms.completed ? 'checked' : ''} style="cursor:pointer;">
            <span style="${ms.completed ? 'text-decoration:line-through; color:var(--text-muted);' : 'color:var(--text-secondary);'}">${escapeHTML(ms.title)}</span>
            ${ms.completedAt ? `<span style="font-size:10px; color:var(--text-muted); margin-left:auto; font-family:var(--font-mono);">${formatDate(ms.completedAt)}</span>` : ''}
          </label>
        `).join('')}
      </div>
    </div>
  ` : '';

  // 2. Traceability Chain section
  const traceabilityHTML = `
    <div style="border-top:1px solid var(--border-color); padding-top:12px;">
      <strong style="color: var(--text-primary); font-size:13px;">Traceability Chain</strong>
      <div style="margin-top:8px; display:flex; flex-direction:column; gap:8px;">
        ${linkedIdeas.length === 0 ? `
          <span style="color:var(--text-muted); font-size:12px;">No traceability records found. Link a system idea to start.</span>
        ` : linkedIdeas.map(idea => {
          const insights = idea.linkedInsights ? idea.linkedInsights.map(insId => db.getInsight(insId)).filter(Boolean) : [];
          return `
            <div style="background:var(--bg-primary); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:10px; display:flex; flex-direction:column; gap:8px;">
              <!-- System Idea -->
              <div class="flex-between btn-goto-idea" data-idea-id="${idea.id}" style="cursor:pointer; padding:4px 6px; border-radius:var(--radius-sm); background:var(--bg-secondary); border:1px solid var(--border-color); transition:background 0.2s;">
                <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
                  <span class="badge badge-warning" style="font-size:9px; padding:2px 4px;">Idea</span>
                  <span style="color:var(--color-info); font-size:12px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;">${escapeHTML(idea.title)}</span>
                </div>
                ${getIconHTML('arrow-right', 'width:12px; height:12px; color:var(--text-muted);')}
              </div>
              
              <!-- Insights -->
              ${insights.length === 0 ? `
                <div style="margin-left:12px; font-size:11px; color:var(--text-muted); font-style:italic;">No linked insights.</div>
              ` : insights.map(ins => {
                const notes = ins.sourceNotes ? ins.sourceNotes.map(nId => db.getDiscoveryNote(nId)).filter(Boolean) : [];
                return `
                  <div style="margin-left:12px; border-left:1px solid var(--border-color); padding-left:8px; display:flex; flex-direction:column; gap:6px;">
                    <div class="flex-between btn-goto-insight" data-insight-id="${ins.id}" style="cursor:pointer; padding:3px 5px; border-radius:var(--radius-sm); background:var(--bg-primary); border:1px dashed var(--border-color); transition:background 0.2s;">
                      <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
                        <span class="badge badge-success" style="font-size:8px; padding:1px 3px;">Insight</span>
                        <span style="font-size:11px; font-weight:500; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${escapeHTML(ins.title)}</span>
                      </div>
                      ${getIconHTML('arrow-right', 'width:10px; height:10px; color:var(--text-muted);')}
                    </div>
                    
                    <!-- Notes -->
                    ${notes.length === 0 ? `
                      <div style="margin-left:12px; font-size:10px; color:var(--text-muted); font-style:italic;">No source notes.</div>
                    ` : notes.map(note => `
                      <div class="flex-between btn-goto-note" data-note-id="${note.id}" style="cursor:pointer; margin-left:12px; padding:2px 4px; border-radius:var(--radius-sm); transition:background 0.2s;">
                        <div style="display:flex; align-items:center; gap:6px; overflow:hidden;">
                          <span class="badge badge-info" style="font-size:8px; padding:1px 2px;">Note</span>
                          <span style="font-size:10px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:160px;">${escapeHTML(note.title)}</span>
                        </div>
                        ${getIconHTML('arrow-right', 'width:8px; height:8px; color:var(--text-muted);')}
                      </div>
                    `).join('')}
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // 3. Activity Feed section
  const activityHTML = (proj.activityLog && proj.activityLog.length > 0) ? `
    <div style="border-top:1px solid var(--border-color); padding-top:12px;">
      <strong style="color: var(--text-primary); font-size:13px;">Activity Log</strong>
      <div style="margin-top:8px; max-height:120px; overflow-y:auto; display:flex; flex-direction:column; gap:4px; padding-right:2px;">
        ${[...proj.activityLog].reverse().map(act => `
          <div style="font-size:11px; padding:4px 6px; background:var(--bg-primary); border-radius:var(--radius-sm); border:1px solid var(--border-color);">
            <div style="display:flex; justify-content:space-between; color:var(--text-muted); font-size:9px; font-family:var(--font-mono);">
              <span>${act.type.toUpperCase().replace('_', ' ')}</span>
              <span>${formatDate(act.createdAt, true)}</span>
            </div>
            <div style="color:var(--text-secondary); margin-top:2px; line-height:1.3;">${escapeHTML(act.message)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  const bodyHTML = `
    ${navHTML}
    <div class="flex-column" style="gap:16px;">
      <div class="flex-between" style="font-family: var(--font-mono); font-size:11px;">
        <span>Status: <span class="badge ${statusBadge}">${proj.status.replace('_', ' ')}</span></span>
        <span>Progress: <strong>${progress}%</strong></span>
      </div>

      <div style="margin-bottom: 8px;">
        <div style="height:6px; background:var(--bg-tertiary); border-radius:3px; overflow:hidden;">
          <div style="height:100%; width:${progress}%; background:var(--color-success); border-radius:3px;"></div>
        </div>
      </div>

      <div>
        <strong>Implementation Strategy:</strong>
        <p style="margin-top:6px; color: var(--text-secondary); line-height: 1.5;">${escapeHTML(proj.description || 'No description provided.')}</p>
      </div>

      <div class="grid-cols-2" style="font-size:13px;">
        <div>
          <strong>Start Date:</strong>
          <div style="margin-top:2px; color: var(--text-secondary);">${formatDate(proj.startDate)}</div>
        </div>
        <div>
          <strong>End Target:</strong>
          <div style="margin-top:2px; color: var(--text-secondary);">${formatDate(proj.endDate)}</div>
        </div>
      </div>

      ${milestonesHTML}

      ${traceabilityHTML}

      ${activityHTML}

      <div style="border-top: 1px solid var(--border-color); padding-top: 16px; margin-top:16px;">
        <button id="btn-delete-project-action" class="btn btn-danger" style="width:100%">${getIconHTML('trash')} Terminate Project</button>
      </div>
    </div>
  `;

  openDrawer(proj.title, bodyHTML, () => {
    closeDrawer();
    openProjectFormModal(company, proj.id, () => {
      renderProjectsTab(company, container);
      openProjectDrawer(company, proj.id, container, true);
    });
  });

  const drawerBody = document.getElementById('drawer-body-content');
  bindDrawerNavigationListeners(company, container);
  
  // Bind milestone checkboxes
  drawerBody.querySelectorAll('.ms-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const msId = cb.getAttribute('data-ms-id');
      if (db && typeof db.toggleMilestone === 'function') {
        db.toggleMilestone(proj.id, msId);
      }
      renderProjectsTab(company, container);
      openProjectDrawer(company, proj.id, container, true);
    });
  });

  // Bind Traceability Chain navigation triggers
  drawerBody.querySelectorAll('.btn-goto-idea').forEach(btn => {
    btn.addEventListener('click', () => {
      const ideaId = btn.getAttribute('data-idea-id');
      openIdeaDrawer(company, ideaId, container, false);
    });
  });

  drawerBody.querySelectorAll('.btn-goto-insight').forEach(btn => {
    btn.addEventListener('click', () => {
      const insId = btn.getAttribute('data-insight-id');
      openInsightDrawer(company, insId, container, false);
    });
  });

  drawerBody.querySelectorAll('.btn-goto-note').forEach(btn => {
    btn.addEventListener('click', () => {
      const noteId = btn.getAttribute('data-note-id');
      openDiscoveryNoteDrawer(company, noteId, container, false);
    });
  });

  document.getElementById('btn-delete-project-action').addEventListener('click', () => {
    if (confirm(`Terminate project "${proj.title}"?`)) {
      db.deleteProject(proj.id);
      showToast('Project terminated', 'warning');
      closeDrawer();
      renderProjectsTab(company, container);
    }
  });
}

function openProjectFormModal(company, projId = null, onSavedCallback) {
  const proj = projId ? db.getProject(projId) : null;
  const isEdit = !!proj;
  const ideas = db.getSystemIdeas(company.id).filter(id => id.status === 'approved');

  if (ideas.length === 0) {
    openModal(
      isEdit ? 'Modify Project Parameters' : 'Launch System Project',
      `<div style="padding: 24px 20px; text-align: center; color: var(--text-muted);">
         <p style="font-size: 14px; margin-bottom: 0;">No approved system ideas available. Approve at least one system idea before launching a project.</p>
       </div>`,
      `<button class="btn btn-secondary" id="modal-cancel-proj">Close</button>`
    );
    document.getElementById('modal-cancel-proj').addEventListener('click', closeModal);
    return;
  }

  const modalBody = `
    <form id="form-project-launch" class="flex-column">
      <div class="form-group">
        <label for="proj-title">Project Title *</label>
        <input type="text" id="proj-title" class="input-control" required placeholder="e.g. Deploy Hardware Schema Registry" value="${isEdit ? escapeHTML(proj.title) : ''}">
      </div>
      
      <div class="grid-cols-2">
        <div class="form-group">
          <label for="proj-status">Execution Status</label>
          <select id="proj-status" class="select-control">
            <option value="not_started" ${isEdit && proj.status === 'not_started' ? 'selected' : ''}>Not Started</option>
            <option value="in_progress" ${isEdit && proj.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
            <option value="completed" ${isEdit && proj.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="on_hold" ${isEdit && proj.status === 'on_hold' ? 'selected' : ''}>On Hold</option>
          </select>
        </div>
        <div class="form-group">
          <label for="proj-progress">Progress Slider (0-100%)</label>
          <div class="flex-row" style="gap:10px;">
            <input type="range" id="proj-progress" min="0" max="100" step="5" class="input-control" style="padding:0; height:24px;" value="${isEdit ? proj.progress : 0}">
            <span id="proj-progress-num" style="font-family:var(--font-mono); font-weight:600; width:36px; text-align:right;">${isEdit ? proj.progress : 0}%</span>
          </div>
        </div>
      </div>

      <div class="grid-cols-2">
        <div class="form-group">
          <label for="proj-start">Start Date *</label>
          <input type="date" id="proj-start" class="input-control" required value="${isEdit ? proj.startDate : new Date().toISOString().split('T')[0]}">
        </div>
        <div class="form-group">
          <label for="proj-end">End Date Target *</label>
          <input type="date" id="proj-end" class="input-control" required value="${isEdit ? proj.endDate : ''}">
        </div>
      </div>
      
      <div class="form-group">
        <label for="proj-desc">Implementation Strategy Description</label>
        <textarea id="proj-desc" class="textarea-control" style="height:100px;" placeholder="Define major milestones, target metrics, team members assigned...">${isEdit ? escapeHTML(proj.description) : ''}</textarea>
      </div>

      <!-- Links to System Ideas Checklist -->
      <div class="form-group">
        <label>Link System Ideas / Design Proposals</label>
        <div class="link-selection-list">
          ${ideas.length === 0 ? `
            <div style="color:var(--text-muted); font-size:12px; padding:4px;">No approved/refining system ideas exist to link.</div>
          ` : ideas.map(idea => {
            const isChecked = isEdit && proj.linkedSystemIdeas.includes(idea.id);
            return `
              <label class="link-selection-item">
                <input type="checkbox" class="proj-idea-checkbox" value="${idea.id}" ${isChecked ? 'checked' : ''}>
                <span>${escapeHTML(idea.title)} (${idea.status})</span>
              </label>
            `;
          }).join('')}
        </div>
      </div>
    </form>
  `;

  const modalFooter = `
    <button class="btn btn-secondary" id="modal-cancel-proj">Cancel</button>
    <button class="btn btn-primary" id="modal-save-proj">${isEdit ? 'Save Changes' : 'Launch Project'}</button>
  `;

  openModal(isEdit ? 'Modify Project Parameters' : 'Launch System Project', modalBody, modalFooter);

  // Bind progress range slider number indicator
  const slider = document.getElementById('proj-progress');
  const sliderNum = document.getElementById('proj-progress-num');
  if (slider && sliderNum) {
    slider.addEventListener('input', (e) => {
      sliderNum.innerText = `${e.target.value}%`;
    });
  }

  // Auto-fill logic driven by checked ideas
  let lastPrefilledTitle = isEdit ? proj.title : '';
  let lastPrefilledDesc = isEdit ? proj.description : '';

  const checkboxes = document.querySelectorAll('.proj-idea-checkbox');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const checkedIds = [];
      document.querySelectorAll('.proj-idea-checkbox:checked').forEach(checkedCb => {
        checkedIds.push(checkedCb.value);
      });

      const selectedIdeas = checkedIds.map(id => db.getSystemIdea(id)).filter(i => !!i);

      let newTitle = '';
      let newDesc = '';

      if (selectedIdeas.length === 1) {
        const idea = selectedIdeas[0];
        newTitle = `${idea.title} Implementation`;
        newDesc = `Implement the approved “${idea.title}” system idea. This project will focus on the approved design concept, linked architecture insights, and the practical steps required to move from recommendation to implementation.\n\nApproved System Idea:\n${idea.title}\n\nDesign Concept:\n${idea.description}`;
      } else if (selectedIdeas.length >= 2) {
        newTitle = `Operational Systems Implementation Program`;
        const ideasList = selectedIdeas.map(idea => `- ${idea.title}`).join('\n');
        const conceptsList = selectedIdeas.map(idea => `${idea.title}:\n${idea.description}`).join('\n\n');
        newDesc = `Implement the selected approved system ideas as a coordinated implementation program. This project will align multiple approved design proposals into one execution plan, preserving traceability back to the approved System Ideas and their linked Insights.\n\nApproved System Ideas:\n${ideasList}\n\nDesign Concepts:\n${conceptsList}`;
      }

      const titleInput = document.getElementById('proj-title');
      const descTextarea = document.getElementById('proj-desc');

      if (titleInput) {
        titleInput.value = newTitle;
        lastPrefilledTitle = newTitle;
      }

      if (descTextarea) {
        descTextarea.value = newDesc;
        lastPrefilledDesc = newDesc;
      }
    });
  });

  document.getElementById('modal-cancel-proj').addEventListener('click', closeModal);
  document.getElementById('modal-save-proj').addEventListener('click', () => {
    const form = document.getElementById('form-project-launch');
    
    const selectedIdeas = [];
    document.querySelectorAll('.proj-idea-checkbox:checked').forEach(cb => {
      selectedIdeas.push(cb.value);
    });

    if (selectedIdeas.length === 0) {
      showToast('Please select at least one approved system idea.', 'error');
      return;
    }

    const title = document.getElementById('proj-title').value.trim();
    if (!title) {
      showToast('Project Title is required.', 'error');
      return;
    }

    const startDate = document.getElementById('proj-start').value;
    if (!startDate) {
      showToast('Start Date is required.', 'error');
      return;
    }

    const endDate = document.getElementById('proj-end').value;
    if (!endDate) {
      showToast('End Date Target is required.', 'error');
      return;
    }

    if (form.reportValidity()) {
      const data = {
        companyId: company.id,
        title: title,
        status: document.getElementById('proj-status').value,
        progress: parseInt(document.getElementById('proj-progress').value) || 0,
        startDate: startDate,
        endDate: endDate,
        description: document.getElementById('proj-desc').value,
        linkedSystemIdeas: selectedIdeas
      };

      if (isEdit) {
        db.updateProject(proj.id, data);
        showToast('Project settings updated', 'success');
      } else {
        db.addProject(data);
        showToast('New system project launched', 'success');
      }
      closeModal();
      if (onSavedCallback) onSavedCallback();
    }
  });
}

// --- 6b. DISCOVERY INTAKE TAB ---
function renderDiscoveryIntakeTab(company, container) {
  // Ensure the intake data structure exists (migration for existing companies)
  const freshCompany = db.ensureDiscoveryIntake(company.id);
  const intake = (freshCompany && freshCompany.discoveryIntake) ? freshCompany.discoveryIntake : db._defaultDiscoveryIntake();

  // ---- Completeness Engine ----
  const SECTION_FIELDS = {
    business: ['primaryGoals', 'expectedOutcomes', 'currentChallenges'],
    people:   ['decisionMakers', 'affectedTeams', 'keyStakeholders'],
    process:  ['coreProcesses', 'knownBottlenecks', 'manualWorkAreas'],
    systems:  ['currentSystems', 'integrations', 'technologyIssues'],
    data:     ['reports', 'kpis', 'dataSources']
  };

  function calcCompleteness(intakeData) {
    const result = {};
    let totalFilled = 0;
    const totalFields = 15; // 5 sections × 3 fields
    for (const [section, fields] of Object.entries(SECTION_FIELDS)) {
      const sectionData = intakeData[section] || {};
      const filled = fields.filter(f => (sectionData[f] || '').trim().length > 0).length;
      result[section] = Math.round((filled / fields.length) * 100);
      totalFilled += filled;
    }
    result.overall = Math.round((totalFilled / totalFields) * 100);
    return result;
  }

  function completenessBarColor(pct) {
    if (pct >= 70) return 'var(--color-success)';
    if (pct >= 40) return 'var(--color-warning)';
    return 'var(--color-info)';
  }

  function renderCompletenessCard(intakeData) {
    const c = calcCompleteness(intakeData);
    const isReady = c.overall >= 70;
    const sectionLabels = { business: 'Business', people: 'People', process: 'Process', systems: 'Systems', data: 'Data' };

    return `
      <div class="card" id="di-completeness-card" style="margin-bottom:0;">
        <div class="flex-between" style="margin-bottom:16px;">
          <h3 class="card-title" style="margin-bottom:0;">Discovery Completeness</h3>
          <span class="badge ${isReady ? 'badge-success' : 'badge-neutral'}" style="font-size:12px; padding: 4px 10px;">
            ${isReady ? '&#10003; Ready for Insight Extraction' : 'Discovery In Progress'}
          </span>
        </div>

        <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:12px; margin-bottom:16px;">
          ${Object.entries(sectionLabels).map(([key, label]) => `
            <div style="text-align:center; padding:10px; background:var(--bg-primary); border:1px solid var(--border-color); border-radius:var(--radius-sm);">
              <div style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">${label}</div>
              <div style="font-size:22px; font-weight:700; font-family:var(--font-mono); color:${completenessBarColor(c[key])};">${c[key]}%</div>
              <div style="margin-top:6px; height:3px; background:var(--bg-tertiary); border-radius:2px; overflow:hidden;">
                <div style="height:100%; width:${c[key]}%; background:${completenessBarColor(c[key])}; border-radius:2px; transition:width 0.3s ease;"></div>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="border-top:1px solid var(--border-color); padding-top:12px; display:flex; align-items:center; gap:16px; margin-bottom:12px;">
          <span style="font-size:12px; color:var(--text-muted); font-family:var(--font-mono);">OVERALL</span>
          <div style="flex:1; height:6px; background:var(--bg-tertiary); border-radius:3px; overflow:hidden;">
            <div style="height:100%; width:${c.overall}%; background:${completenessBarColor(c.overall)}; border-radius:3px; transition:width 0.3s ease;"></div>
          </div>
          <span style="font-size:16px; font-weight:700; font-family:var(--font-mono); color:${completenessBarColor(c.overall)};">${c.overall}%</span>
        </div>

        <div style="border-top:1px dashed var(--border-color); padding-top:12px;">
          ${isReady ? `
            <button id="btn-generate-notes-trigger" class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
              ${getIconHTML('sparkles', 'width: 16px; height: 16px;')} Generate Discovery Notes
            </button>
          ` : `
            <button class="btn btn-secondary" disabled style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; opacity: 0.6; cursor: not-allowed;">
              ${getIconHTML('sparkles', 'width: 16px; height: 16px;')} Generate Discovery Notes
            </button>
            <div style="font-size:12px; color:var(--text-muted); text-align:center; margin-top:8px;">
              Complete at least 70% of Discovery Intake before generating suggested notes.
            </div>
          `}
        </div>
      </div>
    `;
  }

  // ---- Suggested Next Actions ----
  const SUGGESTIONS = {
    business: 'Conduct a strategic alignment session to define primary goals and expected business outcomes.',
    people:   'Interview key decision makers and map the affected teams and stakeholder network.',
    process:  'Walk through core operational workflows and identify manual, high-friction work areas.',
    systems:  'Map current technology stack and document integration points and known technical issues.',
    data:     'Request existing KPI dashboards, operational reports, and identify primary data sources.'
  };

  function renderSuggestionsCard(intakeData) {
    const c = calcCompleteness(intakeData);
    const incomplete = Object.keys(SECTION_FIELDS).filter(s => c[s] < 100);
    if (incomplete.length === 0) {
      return `
        <div class="card" style="margin-bottom:0; border-color:var(--color-success);">
          <h3 class="card-title" style="margin-bottom:8px; color:var(--color-success);">Discovery Complete</h3>
          <p style="font-size:13px; color:var(--text-secondary);">All intake sections are fully completed. You are ready to proceed to Insight Extraction.</p>
        </div>
      `;
    }
    const shown = incomplete.slice(0, 5);
    return `
      <div class="card" style="margin-bottom:0;">
        <h3 class="card-title" style="margin-bottom:12px;">Suggested Next Discovery Actions</h3>
        <div class="flex-column" style="gap:10px;">
          ${shown.map((section, i) => {
            const label = { business:'Business', people:'People', process:'Process', systems:'Systems', data:'Data' }[section];
            return `
              <div style="display:flex; align-items:flex-start; gap:12px; padding:10px 14px; background:var(--bg-primary); border:1px solid var(--border-color); border-radius:var(--radius-sm);">
                <span style="font-family:var(--font-mono); font-size:10px; font-weight:700; background:var(--bg-tertiary); border:1px solid var(--border-color); padding:2px 6px; border-radius:4px; color:var(--text-muted); white-space:nowrap; margin-top:1px;">${label}</span>
                <span style="font-size:13px; color:var(--text-secondary); line-height:1.4;">${SUGGESTIONS[section]}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // ---- Section Form Renderer ----
  const SECTION_CONFIG = [
    {
      key: 'business', label: 'Business', icon: 'briefcase',
      fields: [
        { key: 'primaryGoals',       label: 'Primary Goals',       placeholder: 'What are the primary strategic goals the client wants to achieve?' },
        { key: 'expectedOutcomes',   label: 'Expected Outcomes',   placeholder: 'What measurable outcomes does the client expect from this engagement?' },
        { key: 'currentChallenges',  label: 'Current Challenges',  placeholder: 'What are the key challenges or blockers the client is currently facing?' }
      ]
    },
    {
      key: 'people', label: 'People', icon: 'users',
      fields: [
        { key: 'decisionMakers',  label: 'Decision Makers',  placeholder: 'Who holds decision-making authority for this initiative?' },
        { key: 'affectedTeams',   label: 'Affected Teams',   placeholder: 'Which teams or departments will be impacted by the proposed changes?' },
        { key: 'keyStakeholders', label: 'Key Stakeholders', placeholder: 'Who are the key stakeholders to involve or keep informed?' }
      ]
    },
    {
      key: 'process', label: 'Process', icon: 'git-branch',
      fields: [
        { key: 'coreProcesses',    label: 'Core Processes',    placeholder: 'What are the critical operational processes this engagement touches?' },
        { key: 'knownBottlenecks', label: 'Known Bottlenecks', placeholder: 'What process friction points or bottlenecks has the client already identified?' },
        { key: 'manualWorkAreas',  label: 'Manual Work Areas', placeholder: 'Where does the team perform high-volume manual or repetitive work?' }
      ]
    },
    {
      key: 'systems', label: 'Systems', icon: 'server',
      fields: [
        { key: 'currentSystems',   label: 'Current Systems',   placeholder: 'What software systems, platforms, or tools are in active use?' },
        { key: 'integrations',     label: 'Integrations',      placeholder: 'What integrations or data flows exist between systems?' },
        { key: 'technologyIssues', label: 'Technology Issues', placeholder: 'What known technical pain points or gaps exist in the current stack?' }
      ]
    },
    {
      key: 'data', label: 'Data', icon: 'database',
      fields: [
        { key: 'reports',     label: 'Reports & Dashboards', placeholder: 'What reports or dashboards does the client currently rely on?' },
        { key: 'kpis',        label: 'KPIs',                 placeholder: 'What key performance indicators are tracked? What are the targets?' },
        { key: 'dataSources', label: 'Data Sources',         placeholder: 'What are the primary data sources, databases, or warehouses in use?' }
      ]
    }
  ];

  const session = loadGuidedDiscoverySession(company.id);
  const sessionExists = session && (Object.keys(session.answers).length > 0 || session.completedQuestions.length > 0 || session.skippedQuestions.length > 0);
  
  let bannerHTML = '';
  if (sessionExists) {
    bannerHTML = `
      <div class="flex-between" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 16px 20px; border-radius: var(--radius-md); margin-bottom: 4px;">
        <div>
          <strong style="color: var(--text-primary); font-size: 14px; display: block;">Resume Discovery Session</strong>
          <span style="font-size: 12px; color: var(--text-muted); margin-top: 4px; display: block;">You have an active discovery session in progress. Would you like to resume or start fresh?</span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="btn-resume-copilot" class="btn btn-primary">Resume</button>
          <button id="btn-start-new-copilot" class="btn btn-secondary">Start New Session</button>
        </div>
      </div>
    `;
  } else {
    bannerHTML = `
      <div class="flex-between" style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 16px 20px; border-radius: var(--radius-md); margin-bottom: 4px;">
        <div>
          <strong style="color: var(--text-primary); font-size: 14px; display: block;">Guided Discovery Copilot</strong>
          <span style="font-size: 12px; color: var(--text-muted); margin-top: 4px; display: block;">Step-by-step meeting assistant to gather and analyze operational client requirements.</span>
        </div>
        <button id="btn-start-copilot" class="btn btn-primary">Start Guided Discovery</button>
      </div>
    `;
  }

  // ---- Full Page Render ----
  container.innerHTML = `
    <div class="flex-column" style="gap:20px;">

      <!-- Guided Discovery Copilot Banner -->
      ${bannerHTML}

      <!-- Completeness + Suggestions row -->
      <div class="grid-cols-2" style="align-items:start;">
        <div id="di-completeness-wrapper">
          ${renderCompletenessCard(intake)}
        </div>
        <div id="di-suggestions-wrapper">
          ${renderSuggestionsCard(intake)}
        </div>
      </div>

      <!-- Intake Form Sections -->
      ${SECTION_CONFIG.map(section => `
        <div class="card" style="margin-bottom:0;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:16px; padding-bottom:12px; border-bottom:1px solid var(--border-color);">
            ${getIconHTML(section.icon, 'width:16px; height:16px; color:var(--color-info);')}
            <h3 class="card-title" style="margin-bottom:0;">${section.label}</h3>
          </div>
          <div class="grid-cols-3" style="gap:16px;">
            ${section.fields.map(field => `
              <div class="form-group" style="margin-bottom:0;">
                <label for="di-${section.key}-${field.key}">${field.label}</label>
                <textarea
                  id="di-${section.key}-${field.key}"
                  class="textarea-control di-field"
                  style="height:120px; resize:vertical;"
                  data-section="${section.key}"
                  data-field="${field.key}"
                  placeholder="${field.placeholder}"
                >${escapeHTML((intake[section.key] && intake[section.key][field.key]) ? intake[section.key][field.key] : '')}</textarea>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}

    </div>
  `;

  // ---- Autosave with debounce ----
  let _diDebounceTimer = null;

  function refreshCompletenessUI() {
    const currentCompany = db.ensureDiscoveryIntake(company.id);
    const currentIntake = currentCompany ? currentCompany.discoveryIntake : intake;
    const completenessWrapper = container.querySelector('#di-completeness-wrapper');
    const suggestionsWrapper = container.querySelector('#di-suggestions-wrapper');
    if (completenessWrapper) completenessWrapper.innerHTML = renderCompletenessCard(currentIntake);
    if (suggestionsWrapper) suggestionsWrapper.innerHTML = renderSuggestionsCard(currentIntake);
  }

  container.querySelectorAll('.di-field').forEach(textarea => {
    textarea.addEventListener('input', () => {
      clearTimeout(_diDebounceTimer);
      _diDebounceTimer = setTimeout(() => {
        const section = textarea.getAttribute('data-section');
        const field = textarea.getAttribute('data-field');
        db.updateDiscoveryIntake(company.id, { [section]: { [field]: textarea.value } });
        refreshCompletenessUI();
      }, 300);
    });
  });

  // ---- Generate Notes Click Event ----
  container.addEventListener('click', (e) => {
    if (e.target.closest('#btn-generate-notes-trigger')) {
      openGenerateNotesModal(company, container);
    }
  });

  // Toggle Meeting Mode
  if (sessionExists) {
    const btnResume = container.querySelector('#btn-resume-copilot');
    if (btnResume) {
      btnResume.addEventListener('click', () => {
        session.minimized = false;
        saveGuidedDiscoverySession(company.id, session);
        toggleMeetingMode(company);
      });
    }
    const btnStartNew = container.querySelector('#btn-start-new-copilot');
    if (btnStartNew) {
      btnStartNew.addEventListener('click', () => {
        if (confirm('Are you sure you want to start a new session? This will clear your current session draft.')) {
          const freshSession = {
            currentIndex: 0,
            answers: {},
            suggestedCopies: {},
            analysisResults: {},
            completedQuestions: [],
            skippedQuestions: [],
            minimized: false
          };
          saveGuidedDiscoverySession(company.id, freshSession);
          toggleMeetingMode(company);
        }
      });
    }
  } else {
    const btnStart = container.querySelector('#btn-start-copilot');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        toggleMeetingMode(company);
      });
    }
  }

  // Render floating resume button if session is minimized
  if (session && session.minimized) {
    const floatBtn = document.createElement('button');
    floatBtn.id = 'btn-floating-resume-session';
    floatBtn.className = 'btn btn-primary';
    floatBtn.style.cssText = 'position: fixed; bottom: 30px; right: 30px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.5); padding: 12px 20px; border-radius: var(--radius-lg); font-weight: 600; display: flex; align-items: center; gap: 8px;';
    floatBtn.innerHTML = `${getIconHTML('play', 'width: 14px; height: 14px;')} Resume Discovery Session`;
    container.appendChild(floatBtn);
    
    floatBtn.addEventListener('click', () => {
      session.minimized = false;
      saveGuidedDiscoverySession(company.id, session);
      floatBtn.remove();
      toggleMeetingMode(company);
    });
  }
}

// ---- Discovery Note Generator Helper Functions ----

function containsKeyword(text, keywords) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function generateSuggestedNotes(company) {
  const intake = company.discoveryIntake || db._defaultDiscoveryIntake();
  const getSectionText = (section) => {
    const sec = intake[section] || {};
    return Object.values(sec).join(' ').toLowerCase();
  };

  const existingNotes = db.getDiscoveryNotes(company.id);
  const existingTitles = existingNotes.map(n => n.title.trim().toLowerCase());
  const suggestions = [];

  // Rule 1: Reporting
  const processText = getSectionText('process');
  if (containsKeyword(processText, ['reporting', 'reports', 'monthly reporting'])) {
    const p = intake.process || {};
    const s = intake.systems || {};
    const b = intake.business || {};
    const d = intake.data || {};
    const content = `### Reporting Challenges\n- **Manual Reporting Work**: ${p.manualWorkAreas || 'Repetitive reporting workflows.'}\n- **Process Bottlenecks**: ${p.knownBottlenecks || 'Manual gathering of reporting metrics.'}\n\n### Systems Involved\n- **Current Systems**: ${s.currentSystems || 'Spreadsheets and reporting dashboards.'}\n- **Integration Status**: ${s.integrations || 'No direct automated integration.'}\n\n### Expected Outcomes & KPIs\n- **Expected Outcome**: ${b.expectedOutcomes || 'Automated reporting dashboards.'}\n- **Related KPIs**: ${d.kpis || 'Time spent on reporting, data accuracy.'}`;
    
    suggestions.push({
      title: 'Production Reporting Workflow Review',
      category: 'document_review',
      content: content,
      generatedNoteType: 'reporting'
    });
  }

  // Rule 2: Maintenance
  const processSystemsText = getSectionText('process') + ' ' + getSectionText('systems');
  if (containsKeyword(processSystemsText, ['maintenance'])) {
    const p = intake.process || {};
    const pe = intake.people || {};
    const s = intake.systems || {};
    const content = `### Maintenance Workflows\n- **Core Workflow**: ${p.coreProcesses || 'Equipment maintenance scheduling and tracking.'}\n- **Manual Record Updates**: ${p.manualWorkAreas || 'Manual record updates and log entries.'}\n\n### Affected Teams & Systems\n- **Affected Teams**: ${pe.affectedTeams || 'Maintenance technicians and operations teams.'}\n- **Systems in Use**: ${s.currentSystems || 'Isolated spreadsheets or local logs.'}\n\n### Operational Risks\n- **Bottlenecks/Risks**: ${p.knownBottlenecks || 'Delayed updates, transcription errors, and lack of real-time visibility into machine downtime.'}`;

    suggestions.push({
      title: 'Maintenance Records Process Observation',
      category: 'observation',
      content: content,
      generatedNoteType: 'manual'
    });
  }

  // Rule 3: Inventory
  const dataSystemsProcessText = getSectionText('data') + ' ' + getSectionText('systems') + ' ' + getSectionText('process');
  if (containsKeyword(dataSystemsProcessText, ['inventory', 'procurement'])) {
    const d = intake.data || {};
    const s = intake.systems || {};
    const b = intake.business || {};
    const content = `### Inventory Reports & Data Sources\n- **Inventory Reports**: ${d.reports || 'Inventory status reports and trackers.'}\n- **Data Sources**: ${d.dataSources || 'ERP database or stock spreadsheets.'}\n\n### Visibility Gaps\n- **Technical Gaps**: ${s.technologyIssues || 'Data lag and lack of real-time inventory updates.'}\n- **Integration Issues**: ${s.integrations || 'Manual data synchronization between warehouse and sales systems.'}\n\n### Operational Impact\n- **Operational Impact**: ${b.currentChallenges || 'Stock discrepancies and procurement delays.'}`;

    suggestions.push({
      title: 'Inventory Data Visibility Review',
      category: 'document_review',
      content: content,
      generatedNoteType: 'inventory'
    });
  }

  // Rule 4: Systems Integration
  const systemsText = getSectionText('systems');
  if (containsKeyword(systemsText, ['excel', 'erp', 'power bi', 'integration', 'dashboard', 'duplication'])) {
    const s = intake.systems || {};
    const p = intake.process || {};
    const d = intake.data || {};
    const content = `### Current Systems & Tooling\n- **Existing Stack**: ${s.currentSystems || 'Multiple disconnected applications.'}\n- **Integration Gaps**: ${s.integrations || 'Lack of automated pipelines.'}\n\n### Duplicated Data Entry & Process Overhead\n- **Manual/Duplicate Work**: ${p.manualWorkAreas || 'Copying data manually between systems.'}\n- **Known Pain Points**: ${s.technologyIssues || 'Inconsistent data across platforms.'}\n\n### Dashboard & KPI Limitations\n- **Reporting Gaps**: ${d.reports || 'Dashboards are manually compiled and lack drill-down capability.'}`;

    suggestions.push({
      title: 'Systems Integration & Data Flow Review',
      category: 'document_review',
      content: content,
      generatedNoteType: 'systems'
    });
  }

  // Rule 5: Stakeholders
  const peopleText = getSectionText('people');
  if (peopleText.replace(/\s/g, '').length > 0) {
    const pe = intake.people || {};
    const content = `### Interview Summary & Alignment\n- **Key Decision Makers**: ${pe.decisionMakers || 'Strategic leadership and project sponsors.'}\n- **Affected Teams**: ${pe.affectedTeams || 'End users and system administrators.'}\n- **Key Stakeholders**: ${pe.keyStakeholders || 'Department heads and business analysts.'}\n\n### Suggested Stakeholder Questions\n1. What are the primary expectations and concerns of the affected teams regarding the new solution?\n2. What is the team's readiness for change, and what training support will be required?\n3. Who are the operational champions who should participate in design workshops?`;

    suggestions.push({
      title: 'Stakeholder Alignment Interview',
      category: 'interview',
      content: content,
      generatedNoteType: 'stakeholder'
    });
  }

  // De-duplicate against existing notes
  return suggestions.filter(s => !existingTitles.includes(s.title.trim().toLowerCase()));
}

function openGenerateNotesModal(company, container) {
  let suggestions = generateSuggestedNotes(company);
  
  if (suggestions.length === 0) {
    openModal(
      'Suggested Discovery Notes',
      `<div style="padding: 24px 20px; text-align: center; color: var(--text-muted);">
         <p style="font-size: 14px; margin-bottom: 0;">No strong Discovery Note suggestions found. Add more intake detail or create notes manually.</p>
       </div>`,
      `<button class="btn btn-secondary" id="modal-gen-close">Close</button>`
    );
    document.getElementById('modal-gen-close').addEventListener('click', closeModal);
    return;
  }

  // Map to local suggestion objects with UI state
  suggestions = suggestions.map((s, idx) => ({
    ...s,
    localId: `suggested_${Date.now()}_${idx}`,
    checked: true,
    isEditing: false
  }));

  function renderModalContent() {
    const bodyContent = document.getElementById('modal-body-content');
    const footerContent = document.getElementById('modal-footer-content');
    if (!bodyContent || !footerContent) return;

    let bodyHTML = `
      <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
        These are suggested Discovery Notes generated from Discovery Intake. Review before creating.
      </div>
      <div style="display: flex; flex-direction: column; gap: 16px; max-height: 50vh; overflow-y: auto; padding-right: 4px;">
        ${suggestions.map(note => {
          if (note.isEditing) {
            // Edit Mode
            return `
              <div class="card" style="margin-bottom: 0; border: 1px solid var(--color-info); background: var(--bg-secondary); padding: 16px;" data-local-id="${note.localId}">
                <div class="form-group" style="margin-bottom: 12px;">
                  <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Title</label>
                  <input type="text" class="input-control edit-title" value="${escapeHTML(note.title)}" style="font-weight: 600;">
                </div>
                
                <div class="form-group" style="margin-bottom: 12px;">
                  <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Category</label>
                  <select class="select-control edit-category">
                    <option value="interview" ${note.category === 'interview' ? 'selected' : ''}>Interview</option>
                    <option value="observation" ${note.category === 'observation' ? 'selected' : ''}>Observation / Shadowing</option>
                    <option value="document_review" ${note.category === 'document_review' ? 'selected' : ''}>Document/Process Review</option>
                    <option value="other" ${note.category === 'other' ? 'selected' : ''}>Other</option>
                  </select>
                </div>
                
                <div class="form-group" style="margin-bottom: 16px;">
                  <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Content</label>
                  <textarea class="textarea-control edit-content" style="height: 120px; font-size: 13px; line-height: 1.4; resize: vertical;">${escapeHTML(note.content)}</textarea>
                </div>
                
                <div class="flex-row" style="gap: 8px; justify-content: flex-end;">
                  <button class="btn btn-secondary btn-cancel-edit" style="padding: 6px 12px; font-size: 12px;">Cancel</button>
                  <button class="btn btn-primary btn-save-edit" style="padding: 6px 12px; font-size: 12px;">Save Changes</button>
                </div>
              </div>
            `;
          } else {
            // View Mode
            const categoryLabels = {
              interview: 'Interview',
              observation: 'Observation / Shadowing',
              document_review: 'Document/Process Review',
              other: 'Other'
            };
            
            return `
              <div class="card note-suggestion-card" style="margin-bottom: 0; display: flex; flex-direction: column; gap: 12px; ${note.checked ? '' : 'opacity: 0.6; border-color: var(--bg-tertiary);'}" data-local-id="${note.localId}">
                <div class="flex-between" style="align-items: flex-start;">
                  <div style="display: flex; align-items: flex-start; gap: 10px; flex: 1;">
                    <input type="checkbox" class="note-checkbox" ${note.checked ? 'checked' : ''} style="margin-top: 4px; cursor: pointer; width: 16px; height: 16px;">
                    <div style="flex: 1;">
                      <h4 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--text-primary);">${escapeHTML(note.title)}</h4>
                      <span class="badge badge-info" style="font-size: 10px; margin-top: 4px; display: inline-block;">
                        ${categoryLabels[note.category] || 'Other'}
                      </span>
                    </div>
                  </div>
                  
                  <div class="flex-row" style="gap: 6px;">
                    <button class="btn-icon btn-edit-note" title="Edit Note">${getIconHTML('edit-3', 'width: 14px; height: 14px;')}</button>
                    <button class="btn-icon btn-remove-note" title="Remove Note" style="color: var(--color-danger);">${getIconHTML('trash', 'width: 14px; height: 14px;')}</button>
                  </div>
                </div>
                
                <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; white-space: pre-wrap; padding: 10px; background: var(--bg-primary); border-radius: var(--radius-sm); border: 1px solid var(--border-color); max-height: 120px; overflow-y: auto;">${escapeHTML(note.content)}</div>
              </div>
            `;
          }
        }).join('')}
      </div>
    `;

    bodyContent.innerHTML = bodyHTML;

    // Bind card level listeners
    bodyContent.querySelectorAll('[data-local-id]').forEach(element => {
      const localId = element.getAttribute('data-local-id');
      const note = suggestions.find(n => n.localId === localId);
      if (!note) return;

      if (note.isEditing) {
        const cancelBtn = element.querySelector('.btn-cancel-edit');
        const saveBtn = element.querySelector('.btn-save-edit');

        cancelBtn.addEventListener('click', () => {
          note.isEditing = false;
          renderModalContent();
        });

        saveBtn.addEventListener('click', () => {
          const newTitle = element.querySelector('.edit-title').value.trim();
          const newCategory = element.querySelector('.edit-category').value;
          const newContent = element.querySelector('.edit-content').value.trim();

          if (!newTitle) {
            showToast('Note title is required', 'error');
            return;
          }
          if (!newContent) {
            showToast('Note content is required', 'error');
            return;
          }

          note.title = newTitle;
          note.category = newCategory;
          note.content = newContent;
          note.isEditing = false;
          renderModalContent();
        });
      } else {
        const checkbox = element.querySelector('.note-checkbox');
        const editBtn = element.querySelector('.btn-edit-note');
        const removeBtn = element.querySelector('.btn-remove-note');

        checkbox.addEventListener('change', () => {
          note.checked = checkbox.checked;
          renderModalContent();
        });

        editBtn.addEventListener('click', () => {
          note.isEditing = true;
          renderModalContent();
        });

        removeBtn.addEventListener('click', () => {
          suggestions = suggestions.filter(n => n.localId !== localId);
          if (suggestions.length === 0) {
            closeModal();
            showToast('All suggested notes removed', 'info');
          } else {
            renderModalContent();
          }
        });
      }
    });

    // Render footer buttons
    const checkedCount = suggestions.filter(n => n.checked).length;
    footerContent.innerHTML = `
      <button class="btn btn-secondary" id="modal-gen-cancel">Cancel</button>
      <button class="btn btn-primary" id="modal-gen-create" ${checkedCount === 0 ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : ''}>
        Create Selected Notes (${checkedCount})
      </button>
    `;

    document.getElementById('modal-gen-cancel').addEventListener('click', closeModal);
    const createBtn = document.getElementById('modal-gen-create');
    if (createBtn && checkedCount > 0) {
      createBtn.addEventListener('click', () => {
        const selectedNotes = suggestions.filter(n => n.checked);
        if (selectedNotes.length === 0) return;

        selectedNotes.forEach(n => {
          db.addDiscoveryNote({
            companyId: company.id,
            title: n.title,
            category: n.category,
            content: n.content,
            source: 'discovery_intake',
            generatedFrom: 'Discovery Intake',
            generatedNoteType: n.generatedNoteType,
            createdAt: new Date().toISOString()
          });
        });

        closeModal();
        showToast('Discovery Notes generated successfully.', 'success');

        // Navigate to Discovery tab
        window.location.hash = `#/workspace?id=${company.id}&tab=Discovery`;
      });
    }

    refreshIcons();
  }

  // Open modal initial state
  openModal('Suggested Discovery Notes', '', '');
  renderModalContent();
}

// --- 7. REPORTS TAB ---
function renderReportsTab(company, container) {
  const reports = db.getReports(company.id);

  container.innerHTML = `
    <div class="flex-between" style="margin-bottom: 20px;">
      <div style="font-size:13px; color:var(--text-secondary)">
        Reports compiled for this company. Generate new ones using the executive report builder.
      </div>
      <a href="#/reports?companyId=${company.id}" class="btn btn-primary">
        ${getIconHTML('file-plus-2')} Report Builder
      </a>
    </div>

    <!-- Reports Table -->
    <div class="table-container">
      ${reports.length === 0 ? `
        <div style="text-align:center; padding:30px 0; color:var(--text-muted); margin-bottom:0;">
          No reports generated for this company yet. Click 'Report Builder' to compile a report.
        </div>
      ` : `
        <table>
          <thead>
            <tr>
              <th>Date Compiled</th>
              <th>Report Title</th>
              <th>Status</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${reports.map(rep => `
              <tr class="clickable-report-row" data-id="${rep.id}" style="cursor:pointer;">
                <td style="font-family: var(--font-mono); font-size:12px;">${formatDate(rep.createdAt)}</td>
                <td><strong style="color:var(--text-primary);">${escapeHTML(rep.title)}</strong></td>
                <td><span class="badge ${rep.status === 'finalized' ? 'badge-success' : 'badge-neutral'}">${rep.status}</span></td>
                <td style="text-align:right;" class="no-click-actions">
                  <a href="#/reports?openId=${rep.id}" class="btn-icon" title="View/Print Report">${getIconHTML('eye')}</a>
                  <button class="btn-icon btn-delete-report" data-id="${rep.id}" title="Delete Report" style="color:var(--color-danger)">${getIconHTML('trash')}</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
    </div>
  `;

  // Row click redirects to reports viewer page
  container.querySelectorAll('.clickable-report-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.no-click-actions')) return;
      const repId = row.getAttribute('data-id');
      window.location.hash = `#/reports?openId=${repId}`;
    });
  });

  // Delete Report Button
  container.querySelectorAll('.btn-delete-report').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const rep = db.getReport(id);
      if (confirm(`Delete the report "${rep.title}"?`)) {
        db.deleteReport(id);
        showToast('Report deleted', 'warning');
        renderReportsTab(company, container);
      }
    });
  });
}

// ---- Suggested Insights Gaps & Modal Management ----

function matchesKeyword(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startBoundary = /^[a-zA-Z0-9]/.test(keyword) ? '\\b' : '';
  const endBoundary = /[a-zA-Z0-9]$/.test(keyword) ? '\\b' : '';
  const regex = new RegExp(startBoundary + escaped + endBoundary, 'i');
  return regex.test(text);
}

function generateSuggestedInsights(company) {
  const notes = db.getDiscoveryNotes(company.id);
  if (notes.length === 0) return [];
  
  const freshCompany = db.ensureDiscoveryIntake(company.id) || company;
  const intake = freshCompany.discoveryIntake || db._defaultDiscoveryIntake();

  const currentSystemsRaw = intake.systems && intake.systems.currentSystems ? intake.systems.currentSystems.trim() : '';
  const systemsText = currentSystemsRaw || 'multiple systems (not specified in Discovery Intake)';

  let suffix = '';
  if (intake.business && intake.business.currentChallenges && intake.business.currentChallenges.trim()) {
    suffix += `\n\nStated Challenge:\n${intake.business.currentChallenges.trim()}`;
  }
  if (intake.process && intake.process.knownBottlenecks && intake.process.knownBottlenecks.trim()) {
    suffix += `\n\nStated Bottleneck:\n${intake.process.knownBottlenecks.trim()}`;
  }

  const existingInsights = db.getInsights(company.id);
  const existingTitles = existingInsights.map(i => i.title.toLowerCase().trim());
  
  const themes = [
    {
      id: 'theme_reporting',
      title: 'Fragmented System Landscape Limits Real-Time Reporting',
      category: 'data',
      impact: 'high',
      affinityCategory: 'document_review',
      keywords: {
        strong: [
          'manual consolidation',
          'duplicate data entry',
          'limited integration',
          'no centralized dashboard',
          'maintenance reports',
          'maintenance record updates',
          'maintenance systems'
        ],
        normal: [
          'reporting',
          'reports',
          'excel',
          'duplicate entry',
          'dashboard',
          'power bi',
          'erp',
          'sap',
          'duplication'
        ]
      },
      descriptionBuilder: () => `Observation:\nDiscovery notes show that reporting, maintenance, and inventory information is spread across ${systemsText}.\n\nPattern:\nThe repeated pattern is that teams rely on manual consolidation and duplicate data entry instead of a unified operational data flow.\n\nBusiness Impact:\nThis can reduce reporting speed, may increase risk of inconsistent information, and can reduce leadership visibility into current operations.`
    },
    {
      id: 'theme_manual',
      title: 'Manual Reporting Workflows Create Administrative Bottlenecks',
      category: 'process',
      impact: 'high',
      affinityCategory: 'observation',
      keywords: {
        strong: [
          'manual work',
          'reporting preparation',
          'maintenance record updates',
          'manual record',
          'manually transcribe'
        ],
        normal: [
          'manually',
          'transcribe',
          'paper'
        ]
      },
      descriptionBuilder: () => `Observation:\nShadowing records show that personnel spend substantial hours drafting templates, updating logs, or transcribing maintenance updates manually.\n\nPattern:\nThe repeated pattern is that skilled operational teams perform administrative preparation and manual work updates rather than focusing on high-value tasks.\n\nBusiness Impact:\nThis can create administrative overhead, may delay strategic decisions, and may increase planning risks.`
    },
    {
      id: 'theme_inventory',
      title: 'Inventory Visibility Gaps May Affect Planning Reliability',
      category: 'data',
      impact: 'medium',
      affinityCategory: 'document_review',
      keywords: {
        strong: [
          'stock visibility',
          'stock count',
          'stock level',
          'inventory visibility'
        ],
        normal: [
          'inventory',
          'procurement',
          'warehouse',
          'materials',
          'stock',
          'parts'
        ]
      },
      descriptionBuilder: () => `Observation:\nDiscovery notes highlight discrepancies and delays in tracking spares, parts, and procurement requirements.\n\nPattern:\nThe repeated pattern is that inventory and procurement data sources are siloed and updated via periodic manual entries rather than real-time visibility.\n\nBusiness Impact:\nThis may affect planning reliability, can limit procurement predictability, and may increase risk of operational delays.`
    },
    {
      id: 'theme_stakeholder',
      title: 'Stakeholder Alignment Is Needed Before Workflow Redesign',
      category: 'people',
      impact: 'medium',
      affinityCategory: 'interview',
      keywords: {
        strong: [
          'decision makers',
          'decision maker',
          'affected teams',
          'workflow redesign',
          'stakeholder alignment',
          'department managers',
          'executive leadership',
          'reporting analysts'
        ],
        normal: [
          'people',
          'stakeholders',
          'stakeholder',
          'decision-maker'
        ]
      },
      descriptionBuilder: () => `Observation:\nInterviews with key personnel show differences in priorities across teams and interviewed staff and managers regarding software changes and process workflows.\n\nPattern:\nThe repeated pattern is that technical change initiatives are designed without a unified consensus among all affected teams and decision makers.\n\nBusiness Impact:\nThis may increase user adoption risks, can introduce organizational friction, and may delay implementation timelines.`
    }
  ];
  
  const candidates = [];
  const assignedNoteIds = new Set();
  
  // Try matching notes to themes
  themes.forEach(theme => {
    const matchedNotesWithInfo = [];
    
    notes.forEach(n => {
      const text = (n.title + ' ' + n.content).toLowerCase();
      
      const matchedStrong = theme.keywords.strong.filter(kw => matchesKeyword(text, kw));
      const matchedNormal = theme.keywords.normal.filter(kw => matchesKeyword(text, kw));
      
      const strongCount = matchedStrong.length;
      const normalCount = matchedNormal.length;
      const totalKeywordsMatched = strongCount + normalCount;
      const categoryAffinityMatched = (n.category === theme.affinityCategory);

      // Metadata-based routing for intake-generated notes
      if (n.source === 'discovery_intake' || n.generatedFrom === 'Discovery Intake') {
        let type = n.generatedNoteType;
        // Fallback inference for legacy notes
        if (!type) {
          if (n.title === 'Production Reporting Workflow Review') type = 'reporting';
          else if (n.title === 'Maintenance Records Process Observation') type = 'manual';
          else if (n.title === 'Inventory Data Visibility Review') type = 'inventory';
          else if (n.title === 'Systems Integration & Data Flow Review') type = 'systems';
          else if (n.title === 'Stakeholder Alignment Interview') type = 'stakeholder';
        }

        // Restrict theme_stakeholder exclusively to generatedNoteType === 'stakeholder'
        if (theme.id === 'theme_stakeholder') {
          if (type !== 'stakeholder') {
            return; // Skip matching this note to the stakeholder theme
          }
        }

        let allowed = false;
        if (type === 'reporting') {
          if (theme.id === 'theme_reporting') {
            allowed = true;
          } else if (theme.id === 'theme_manual' || theme.id === 'theme_inventory') {
            allowed = (strongCount >= 1);
          }
        } else if (type === 'systems') {
          if (theme.id === 'theme_reporting') {
            allowed = true;
          } else if (theme.id === 'theme_inventory' || theme.id === 'theme_manual') {
            allowed = (strongCount >= 1);
          }
        } else if (type === 'manual') {
          if (theme.id === 'theme_manual') {
            allowed = true;
          } else if (theme.id === 'theme_reporting' || theme.id === 'theme_inventory') {
            allowed = (strongCount >= 1);
          }
        } else if (type === 'inventory') {
          if (theme.id === 'theme_inventory') {
            allowed = true;
          } else if (theme.id === 'theme_reporting' || theme.id === 'theme_manual') {
            allowed = (strongCount >= 1);
          }
        } else if (type === 'stakeholder') {
          if (theme.id === 'theme_stakeholder') {
            allowed = true;
          } else if (theme.id === 'theme_reporting' || theme.id === 'theme_inventory' || theme.id === 'theme_manual') {
            allowed = (strongCount >= 1);
          }
        }

        if (!allowed) return; // Skip matching this note to the current theme
      }
      
      const isRelevant = (totalKeywordsMatched >= 2) || 
                         (strongCount >= 1) || 
                         (categoryAffinityMatched && totalKeywordsMatched >= 1);
                         
      if (isRelevant) {
        matchedNotesWithInfo.push({
          note: n,
          strongCount,
          normalCount,
          score: (strongCount * 2) + (normalCount * 1)
        });
      }
    });
    
    if (matchedNotesWithInfo.length > 0) {
      // De-duplicate evidence notes by ID
      const uniqueMatchedNotesInfo = [];
      const seenIds = new Set();
      matchedNotesWithInfo.forEach(info => {
        if (!seenIds.has(info.note.id)) {
          seenIds.add(info.note.id);
          uniqueMatchedNotesInfo.push(info);
        }
      });
      
      const noteIds = uniqueMatchedNotesInfo.map(info => info.note.id);
      noteIds.forEach(id => assignedNoteIds.add(id));
      
      candidates.push({
        title: theme.title,
        category: theme.category,
        description: theme.descriptionBuilder() + suffix,
        impact: theme.impact,
        sourceNotes: noteIds,
        evidenceConfidence: calcEvidenceConfidence(noteIds, uniqueMatchedNotesInfo)
      });
    }
  });
  
  // Leftover notes theme
  const unmatchedNotes = notes.filter(n => !assignedNoteIds.has(n.id));
  if (unmatchedNotes.length > 0) {
    const uniqueUnmatchedNotes = [];
    const seenIds = new Set();
    unmatchedNotes.forEach(n => {
      if (!seenIds.has(n.id)) {
        seenIds.add(n.id);
        uniqueUnmatchedNotes.push(n);
      }
    });
    
    const noteIds = uniqueUnmatchedNotes.map(n => n.id);
    
    candidates.push({
      title: 'Disconnected Data Sources Reduce Management Confidence',
      category: 'data',
      description: `Observation:\nProcess observations identify disconnected files, local trackers, and custom logs across operations.\n\nPattern:\nThe repeated pattern is that data sources are isolated without automatic synchronization or shared frameworks.\n\nBusiness Impact:\nThis may affect planning reliability, can create administrative overhead, and may reduce confidence in reporting.` + suffix,
      impact: 'medium',
      sourceNotes: noteIds,
      evidenceConfidence: calcEvidenceConfidence(noteIds)
    });
  }
  
  // De-duplicate candidate titles against existing insights
  return candidates.filter(c => !existingTitles.includes(c.title.toLowerCase().trim()));
}

function calcEvidenceConfidence(noteIds, relevanceInfo) {
  const count = noteIds.length;
  if (relevanceInfo && Array.isArray(relevanceInfo)) {
    const strongMatchNotesCount = relevanceInfo.filter(info => info.strongCount >= 1).length;
    if (count >= 4 || (count === 3 && strongMatchNotesCount >= 1)) {
      return 'High';
    }
    if (count >= 2) {
      return 'Medium';
    }
    return 'Low';
  }
  if (count >= 4) return 'High';
  if (count >= 2) return 'Medium';
  return 'Low';
}

function openGenerateInsightsModal(company, container) {
  const notes = db.getDiscoveryNotes(company.id);
  
  if (notes.length === 0) {
    openModal(
      'Suggested Insights',
      `<div style="padding: 24px 20px; text-align: center; color: var(--text-muted);">
         <p style="font-size: 14px; margin-bottom: 0;">Capture or generate Discovery Notes first before extracting insights.</p>
       </div>`,
      `<button class="btn btn-secondary" id="modal-ins-close">Close</button>`
    );
    document.getElementById('modal-ins-close').addEventListener('click', closeModal);
    return;
  }
  
  let suggestions = generateSuggestedInsights(company);
  
  if (suggestions.length === 0) {
    openModal(
      'Suggested Insights',
      `<div style="padding: 24px 20px; text-align: center; color: var(--text-muted);">
         <p style="font-size: 14px; margin-bottom: 0;">No new Insight suggestions found. Add more Discovery Notes or create insights manually.</p>
       </div>`,
      `<button class="btn btn-secondary" id="modal-ins-close">Close</button>`
    );
    document.getElementById('modal-ins-close').addEventListener('click', closeModal);
    return;
  }
  
  // Assign local id for UI tracking
  suggestions = suggestions.map((s, idx) => ({
    ...s,
    localId: `sug_ins_${Date.now()}_${idx}`,
    checked: true,
    isEditing: false
  }));

  function renderModalContent() {
    const bodyContent = document.getElementById('modal-body-content');
    const footerContent = document.getElementById('modal-footer-content');
    if (!bodyContent || !footerContent) return;

    let bodyHTML = `
      <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
        These are suggested Insights generated from your Discovery Notes. Review before creating.
      </div>
      <div style="display: flex; flex-direction: column; gap: 16px; max-height: 50vh; overflow-y: auto; padding-right: 4px;">
        ${suggestions.map(ins => {
          if (ins.isEditing) {
            // Edit Mode
            return `
              <div class="card" style="margin-bottom: 0; border: 1px solid var(--color-info); background: var(--bg-secondary); padding: 16px;" data-local-id="${ins.localId}">
                <div class="form-group" style="margin-bottom: 12px;">
                  <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Title</label>
                  <input type="text" class="input-control edit-title" value="${escapeHTML(ins.title)}" style="font-weight: 600;">
                </div>
                
                <div class="form-group" style="margin-bottom: 12px;">
                  <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Pillar (Category)</label>
                  <select class="select-control edit-category">
                    <option value="technology" ${ins.category === 'technology' ? 'selected' : ''}>Technology</option>
                    <option value="process" ${ins.category === 'process' ? 'selected' : ''}>Process</option>
                    <option value="people" ${ins.category === 'people' ? 'selected' : ''}>People</option>
                    <option value="data" ${ins.category === 'data' ? 'selected' : ''}>Data</option>
                  </select>
                </div>
                
                <div class="form-group" style="margin-bottom: 12px;">
                  <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Impact Level</label>
                  <select class="select-control edit-impact">
                    <option value="low" ${ins.impact === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${ins.impact === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${ins.impact === 'high' ? 'selected' : ''}>High</option>
                  </select>
                </div>
                
                <div class="form-group" style="margin-bottom: 12px;">
                  <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Evidence Confidence</label>
                  <div style="font-size: 13px; font-family: var(--font-mono); margin-top: 4px;">
                    <span class="badge ${ins.evidenceConfidence === 'High' ? 'badge-success' : (ins.evidenceConfidence === 'Medium' ? 'badge-warning' : 'badge-neutral')}">${ins.evidenceConfidence}</span>
                  </div>
                </div>

                <div class="form-group" style="margin-bottom: 16px;">
                  <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted);">Description Summary</label>
                  <textarea class="textarea-control edit-description" style="height: 120px; font-size: 13px; line-height: 1.4; resize: vertical;">${escapeHTML(ins.description)}</textarea>
                </div>
                
                <div class="flex-row" style="gap: 8px; justify-content: flex-end;">
                  <button class="btn btn-secondary btn-cancel-edit" style="padding: 6px 12px; font-size: 12px;">Cancel</button>
                  <button class="btn btn-primary btn-save-edit" style="padding: 6px 12px; font-size: 12px;">Save Changes</button>
                </div>
              </div>
            `;
          } else {
            // View Mode
            const currentCandidate = ins;
            const candidateSourceNotes = Array.from(new Set(currentCandidate.sourceNotes || []));
            const sourceNotesMatched = candidateSourceNotes.map(nId => db.getDiscoveryNote(nId)).filter(n => !!n);
            const sourceNamesList = sourceNotesMatched.map(n => escapeHTML(n.title)).join(', ');
            const linkedCount = candidateSourceNotes.length;

            let impBadge = 'badge-info';
            if (currentCandidate.impact === 'high') impBadge = 'badge-danger';
            if (currentCandidate.impact === 'medium') impBadge = 'badge-warning';
            
            return `
              <div class="card note-suggestion-card" style="margin-bottom: 0; display: flex; flex-direction: column; gap: 12px; ${currentCandidate.checked ? '' : 'opacity: 0.6; border-color: var(--bg-tertiary);'}" data-local-id="${currentCandidate.localId}">
                <div class="flex-between" style="align-items: flex-start;">
                  <div style="display: flex; align-items: flex-start; gap: 10px; flex: 1;">
                    <input type="checkbox" class="insight-checkbox" ${currentCandidate.checked ? 'checked' : ''} style="margin-top: 4px; cursor: pointer; width: 16px; height: 16px;">
                    <div style="flex: 1;">
                      <h4 style="font-size: 15px; font-weight: 700; margin: 0; color: var(--text-primary);">${escapeHTML(currentCandidate.title)}</h4>
                      <div class="flex-row" style="gap: 6px; margin-top: 6px; flex-wrap: wrap; align-items: center;">
                        <span class="badge badge-info" style="font-size: 9px;">Pillar: ${currentCandidate.category}</span>
                        <span class="badge ${impBadge}" style="font-size: 9px;">Impact: ${currentCandidate.impact}</span>
                        <span class="badge ${currentCandidate.evidenceConfidence === 'High' ? 'badge-success' : (currentCandidate.evidenceConfidence === 'Medium' ? 'badge-warning' : 'badge-neutral')}" style="font-size: 9px;">Confidence: ${currentCandidate.evidenceConfidence}</span>
                        <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); margin-left: 4px;">${linkedCount} linked sources</span>
                      </div>
                    </div>
                  </div>
                  
                  <div class="flex-row" style="gap: 6px;">
                    <button class="btn-icon btn-edit-insight" title="Edit Insight">${getIconHTML('edit-3', 'width: 14px; height: 14px;')}</button>
                    <button class="btn-icon btn-remove-insight" title="Remove Suggestion" style="color: var(--color-danger);">${getIconHTML('trash', 'width: 14px; height: 14px;')}</button>
                  </div>
                </div>
                
                <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.5; white-space: pre-wrap; padding: 10px; background: var(--bg-primary); border-radius: var(--radius-sm); border: 1px solid var(--border-color); max-height: 120px; overflow-y: auto;">${escapeHTML(currentCandidate.description)}</div>
                
                <div style="font-size: 11px; color: var(--text-muted); background: var(--bg-secondary); padding: 6px 10px; border-radius: var(--radius-sm); border-left: 2px solid var(--color-info);">
                  <strong>Evidence:</strong> ${sourceNamesList || 'None'}
                </div>
              </div>
            `;
          }
        }).join('')}
      </div>
    `;

    bodyContent.innerHTML = bodyHTML;

    // Bind card level listeners
    bodyContent.querySelectorAll('[data-local-id]').forEach(element => {
      const localId = element.getAttribute('data-local-id');
      const ins = suggestions.find(n => n.localId === localId);
      if (!ins) return;

      if (ins.isEditing) {
        const cancelBtn = element.querySelector('.btn-cancel-edit');
        const saveBtn = element.querySelector('.btn-save-edit');

        cancelBtn.addEventListener('click', () => {
          ins.isEditing = false;
          renderModalContent();
        });

        saveBtn.addEventListener('click', () => {
          const newTitle = element.querySelector('.edit-title').value.trim();
          const newCategory = element.querySelector('.edit-category').value;
          const newImpact = element.querySelector('.edit-impact').value;
          const newDescription = element.querySelector('.edit-description').value.trim();

          if (!newTitle) {
            showToast('Insight title is required', 'error');
            return;
          }
          if (!newDescription) {
            showToast('Insight description is required', 'error');
            return;
          }

          ins.title = newTitle;
          ins.category = newCategory;
          ins.impact = newImpact;
          ins.description = newDescription;
          ins.isEditing = false;
          renderModalContent();
        });
      } else {
        const checkbox = element.querySelector('.insight-checkbox');
        const editBtn = element.querySelector('.btn-edit-insight');
        const removeBtn = element.querySelector('.btn-remove-insight');

        checkbox.addEventListener('change', () => {
          ins.checked = checkbox.checked;
          renderModalContent();
        });

        editBtn.addEventListener('click', () => {
          ins.isEditing = true;
          renderModalContent();
        });

        removeBtn.addEventListener('click', () => {
          suggestions = suggestions.filter(n => n.localId !== localId);
          if (suggestions.length === 0) {
            closeModal();
            showToast('All suggested insights removed', 'info');
          } else {
            renderModalContent();
          }
        });
      }
    });

    // Render footer buttons
    const checkedCount = suggestions.filter(n => n.checked).length;
    footerContent.innerHTML = `
      <button class="btn btn-secondary" id="modal-gen-cancel">Cancel</button>
      <button class="btn btn-primary" id="modal-gen-create" ${checkedCount === 0 ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : ''}>
        Create Selected Insights (${checkedCount})
      </button>
    `;

    document.getElementById('modal-gen-cancel').addEventListener('click', closeModal);
    const createBtn = document.getElementById('modal-gen-create');
    if (createBtn && checkedCount > 0) {
      createBtn.addEventListener('click', () => {
        const selectedInsights = suggestions.filter(n => n.checked);
        if (selectedInsights.length === 0) return;

        selectedInsights.forEach(sug => {
          db.addInsight({
            companyId: company.id,
            title: sug.title,
            description: sug.description,
            sourceNotes: sug.sourceNotes,
            impact: sug.impact,
            category: sug.category,
            evidenceConfidence: sug.evidenceConfidence
          });
        });

        closeModal();
        showToast('Insights generated successfully.', 'success');

        // Re-render Insights tab
        renderInsightsTab(company, container);
      });
    }

    refreshIcons();
  }

  // Open modal initial state
  openModal('Suggested Insights', '', '');
  renderModalContent();
}

function openGenerateIdeasModal(company, container) {
  const insights = db.getInsights(company.id);

  if (insights.length === 0) {
    openModal(
      'Suggested System Ideas',
      `<div style="padding: 24px 20px; text-align: center; color: var(--text-muted);">
         <p style="font-size: 14px; margin-bottom: 0;">Create or generate Insights first before formulating system ideas.</p>
       </div>`,
      `<button class="btn btn-secondary" id="modal-ideas-close">Close</button>`
    );
    document.getElementById('modal-ideas-close').addEventListener('click', closeModal);
    return;
  }

  // Retrieve existing ideas to prevent duplicate titles
  const existingIdeas = db.getSystemIdeas(company.id);
  const existingTitles = new Set(existingIdeas.map(idea => idea.title.trim().toLowerCase()));

  // Prepare grounding context for system names
  const freshCompany = db.ensureDiscoveryIntake(company.id) || company;
  const intake = freshCompany.discoveryIntake || db._defaultDiscoveryIntake();
  const intakeText = JSON.stringify(intake).toLowerCase();
  const insightsText = insights.map(ins => ins.title + ' ' + (ins.description || '')).join(' ').toLowerCase();
  const combinedText = intakeText + ' ' + insightsText;

  // Helper to ground systems in the description based on actual text
  function getGroundedSystems(text) {
    const systemsMap = [
      { key: 'sap', label: 'SAP ERP' },
      { key: 'excel', label: 'Excel reporting files' },
      { key: 'power bi', label: 'Power BI dashboards' },
      { key: 'maintenance', label: 'maintenance records' },
      { key: 'inventory', label: 'inventory sources' }
    ];

    const matchedLabels = [];
    systemsMap.forEach(sys => {
      if (text.includes(sys.key)) {
        matchedLabels.push(sys.label);
      }
    });

    if (matchedLabels.length === 0) {
      return 'the various disconnected operational systems and files';
    } else if (matchedLabels.length === 1) {
      return matchedLabels[0];
    } else if (matchedLabels.length === 2) {
      return `${matchedLabels[0]} and ${matchedLabels[1]}`;
    } else {
      const last = matchedLabels.pop();
      return `${matchedLabels.join(', ')}, and ${last}`;
    }
  }

  // Helper to strip global repeated grounding sections and get specific core matching text
  function getInsightCoreText(insight) {
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
  }

  // Define deterministic suggestions and keywords
  const possibleSuggestions = [
    {
      title: 'Unified Operations Data Hub',
      priority: 'high',
      feasibility: 'moderate',
      status: 'backlog',
      descriptionTemplate: (text) => `Create a centralized operational data layer that consolidates key information from ${getGroundedSystems(text)}. The goal is to reduce fragmented reporting, improve data consistency, and provide a reliable foundation for operational dashboards.`,
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
      priority: 'high',
      feasibility: 'easy',
      status: 'backlog',
      descriptionTemplate: () => `Automate the weekly reporting process by reducing manual exports, copy-paste work, duplicate data entry, and manual KPI preparation. The goal is to reduce reporting preparation time and improve consistency across management reports.`,
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
      priority: 'medium',
      feasibility: 'moderate',
      status: 'backlog',
      descriptionTemplate: () => `Create a focused inventory visibility dashboard that connects inventory status, procurement lead times, and operational planning indicators. The goal is to improve planning reliability and reduce uncertainty around stock, parts, and procurement needs.`,
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
      priority: 'medium',
      feasibility: 'easy',
      status: 'backlog',
      descriptionTemplate: () => `Create a structured stakeholder alignment plan before technical implementation. This should clarify decision makers, affected teams, operational champions, concerns, training needs, and adoption risks.`,
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

  // Helper to filter matching insights for a given set of keywords
  function getMatchingInsights(keywords, filterFn) {
    return insights.filter(ins => {
      const coreText = getInsightCoreText(ins);
      const matchesKeywords = keywords.some(kw => coreText.includes(kw.toLowerCase()));
      if (!matchesKeywords) return false;
      if (filterFn) {
        return filterFn(ins, coreText);
      }
      return true;
    });
  }

  let suggestions = [];
  possibleSuggestions.forEach((sugDef, idx) => {
    // De-duplication safeguard
    if (existingTitles.has(sugDef.title.trim().toLowerCase())) return;

    // Retrieve ONLY insights that actually trigger this specific suggestion
    const matched = getMatchingInsights(sugDef.keywords, sugDef.filter);
    if (matched.length > 0) {
      suggestions.push({
        localId: `sug_idea_${Date.now()}_${idx}`,
        title: sugDef.title,
        priority: sugDef.priority,
        feasibility: sugDef.feasibility,
        status: sugDef.status,
        description: sugDef.descriptionTemplate(combinedText),
        linkedInsights: matched.map(ins => ins.id),
        linkedInsightObjects: matched,
        checked: true
      });
    }
  });

  if (suggestions.length === 0) {
    openModal(
      'Suggested System Ideas',
      `<div style="padding: 24px 20px; text-align: center; color: var(--text-muted);">
         <p style="font-size: 14px; margin-bottom: 0;">No new System Idea suggestions found. All suggested ideas are already created, or no matching insights were found.</p>
       </div>`,
      `<button class="btn btn-secondary" id="modal-ideas-close">Close</button>`
    );
    document.getElementById('modal-ideas-close').addEventListener('click', closeModal);
    return;
  }

  function renderModalContent() {
    const bodyContent = document.getElementById('modal-body-content');
    const footerContent = document.getElementById('modal-footer-content');
    if (!bodyContent || !footerContent) return;

    let bodyHTML = `
      <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
        Review and customize the suggested system design proposals generated from existing insights.
      </div>
      <div style="display: flex; flex-direction: column; gap: 16px; max-height: 50vh; overflow-y: auto; padding-right: 4px;">
        ${suggestions.map(sug => {
          return `
            <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column; gap: 12px; border: 1px solid var(--border-color); padding: 16px; ${sug.checked ? '' : 'opacity: 0.6; border-color: var(--bg-tertiary);'}" data-local-id="${sug.localId}">
              <div class="flex-between" style="align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 4px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <input type="checkbox" class="idea-checkbox" ${sug.checked ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
                  <strong style="font-size: 14px; color: var(--text-primary);">Suggested System Idea</strong>
                </div>
                <button class="btn-icon btn-remove-suggestion" title="Remove Suggestion" style="color: var(--color-danger);">${getIconHTML('trash', 'width: 14px; height: 14px;')}</button>
              </div>

              <div class="form-group" style="margin-bottom: 8px;">
                <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight:600;">Title</label>
                <input type="text" class="input-control idea-title-input" value="${escapeHTML(sug.title)}" style="font-weight: 600;">
              </div>

              <div class="grid-cols-3" style="gap: 10px;">
                <div class="form-group" style="margin-bottom: 8px;">
                  <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight:600;">Priority</label>
                  <select class="select-control idea-priority-select">
                    <option value="high" ${sug.priority === 'high' ? 'selected' : ''}>High</option>
                    <option value="medium" ${sug.priority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="low" ${sug.priority === 'low' ? 'selected' : ''}>Low</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom: 8px;">
                  <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight:600;">Feasibility</label>
                  <select class="select-control idea-feasibility-select">
                    <option value="easy" ${sug.feasibility === 'easy' ? 'selected' : ''}>Easy</option>
                    <option value="moderate" ${sug.feasibility === 'moderate' ? 'selected' : ''}>Moderate</option>
                    <option value="complex" ${sug.feasibility === 'complex' ? 'selected' : ''}>Complex</option>
                  </select>
                </div>
                <div class="form-group" style="margin-bottom: 8px;">
                  <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight:600;">Lifecycle Status</label>
                  <select class="select-control idea-status-select">
                    <option value="backlog" ${sug.status === 'backlog' ? 'selected' : ''}>Backlog</option>
                    <option value="refining" ${sug.status === 'refining' ? 'selected' : ''}>Refining</option>
                    <option value="approved" ${sug.status === 'approved' ? 'selected' : ''}>Approved</option>
                    <option value="rejected" ${sug.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                  </select>
                </div>
              </div>

              <div class="form-group" style="margin-bottom: 8px;">
                <label style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight:600;">Description</label>
                <textarea class="textarea-control idea-description-textarea" style="height: 80px; font-size: 13px; line-height: 1.4; resize: vertical;">${escapeHTML(sug.description)}</textarea>
              </div>

              <div style="font-size: 11px; color: var(--text-muted); background: var(--bg-secondary); padding: 8px 10px; border-radius: var(--radius-sm); border-left: 2px solid var(--color-info);">
                <strong style="color:var(--text-primary); display:block; margin-bottom: 4px;">Justified by Insights:</strong>
                <ul style="margin: 0 0 0 16px; padding: 0; list-style-type: disc;">
                  ${sug.linkedInsightObjects.map(ins => `
                    <li>${escapeHTML(ins.title)} (<span style="font-family:var(--font-mono)">${ins.category}</span>)</li>
                  `).join('')}
                </ul>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    bodyContent.innerHTML = bodyHTML;

    // Bind card level listeners for real-time memory synchronization
    bodyContent.querySelectorAll('[data-local-id]').forEach(element => {
      const localId = element.getAttribute('data-local-id');
      const sug = suggestions.find(n => n.localId === localId);
      if (!sug) return;

      const checkbox = element.querySelector('.idea-checkbox');
      const titleInput = element.querySelector('.idea-title-input');
      const prioritySelect = element.querySelector('.idea-priority-select');
      const feasibilitySelect = element.querySelector('.idea-feasibility-select');
      const statusSelect = element.querySelector('.idea-status-select');
      const descTextarea = element.querySelector('.idea-description-textarea');
      const removeBtn = element.querySelector('.btn-remove-suggestion');

      checkbox.addEventListener('change', () => {
        sug.checked = checkbox.checked;
        element.style.opacity = sug.checked ? '1' : '0.6';
        element.style.borderColor = sug.checked ? 'var(--border-color)' : 'var(--bg-tertiary)';
        updateFooterCount();
      });

      titleInput.addEventListener('input', () => {
        sug.title = titleInput.value;
      });

      prioritySelect.addEventListener('change', () => {
        sug.priority = prioritySelect.value;
      });

      feasibilitySelect.addEventListener('change', () => {
        sug.feasibility = feasibilitySelect.value;
      });

      statusSelect.addEventListener('change', () => {
        sug.status = statusSelect.value;
      });

      descTextarea.addEventListener('input', () => {
        sug.description = descTextarea.value;
      });

      removeBtn.addEventListener('click', () => {
        suggestions = suggestions.filter(n => n.localId !== localId);
        if (suggestions.length === 0) {
          closeModal();
          showToast('All suggested system ideas removed', 'info');
        } else {
          renderModalContent();
        }
      });
    });

    updateFooterCount();
  }

  function updateFooterCount() {
    const footerContent = document.getElementById('modal-footer-content');
    if (!footerContent) return;

    const checkedCount = suggestions.filter(n => n.checked).length;
    footerContent.innerHTML = `
      <button class="btn btn-secondary" id="modal-gen-ideas-cancel">Cancel</button>
      <button class="btn btn-primary" id="modal-gen-ideas-create" ${checkedCount === 0 ? 'disabled style="opacity: 0.6; cursor: not-allowed;"' : ''}>
        Create Selected System Ideas (${checkedCount})
      </button>
    `;

    document.getElementById('modal-gen-ideas-cancel').addEventListener('click', closeModal);
    const createBtn = document.getElementById('modal-gen-ideas-create');
    if (createBtn && checkedCount > 0) {
      createBtn.addEventListener('click', () => {
        const selected = suggestions.filter(n => n.checked);
        if (selected.length === 0) return;

        let valid = true;
        selected.forEach(sug => {
          if (!sug.title.trim()) {
            showToast('Title is required for all selected suggestions.', 'error');
            valid = false;
          }
          if (!sug.description.trim()) {
            showToast('Description is required for all selected suggestions.', 'error');
            valid = false;
          }
        });

        if (!valid) return;

        selected.forEach(sug => {
          db.addSystemIdea({
            companyId: company.id,
            title: sug.title.trim(),
            description: sug.description.trim(),
            priority: sug.priority,
            feasibility: sug.feasibility,
            status: sug.status,
            linkedInsights: sug.linkedInsights
          });
        });

        closeModal();
        showToast('System design proposals generated successfully.', 'success');
        renderSystemIdeasTab(company, container);
      });
    }
  }

  openModal('Suggested System Ideas', '', '');
  renderModalContent();
}

// ==========================================
// FULLSCREEN DISCOVERY MEETING MODE FEATURES
// ==========================================

const DISCOVERY_QUESTIONS = [
  {
    section: 'Business',
    field: 'primaryGoals',
    label: 'Business > Primary Goals',
    question: 'What are the primary strategic and operational goals the client wants to achieve?',
    why: 'To align the system design with the client\'s high-level business goals and strategic timeline.',
    goodAnswer: 'Specific goals, High-level business motivation, Timeline/measure of success.',
    criteria: [
      { text: 'Has specific business goals', words: ['goal', 'achieve', 'want', 'reduce', 'increase', 'improve', 'save', 'automate'] },
      { text: 'Mentions motivation or urgency', words: ['motivation', 'why', 'need', 'urgent', 'because', 'demand', 'drive', 'competition'] },
      { text: 'Includes target timeline or deadline', words: ['by', 'months', 'year', 'weeks', 'timeline', 'deadline', 'target', 'schedule'] }
    ],
    followUp: 'Could you specify what success looks like or when you expect to achieve this?'
  },
  {
    section: 'Business',
    field: 'expectedOutcomes',
    label: 'Business > Expected Outcomes',
    question: 'What measurable outcomes or key benefits does the client expect from this engagement?',
    why: 'To establish success criteria and identify what savings or efficiencies must be measured.',
    goodAnswer: 'Quantifiable metrics (e.g. error rate, cycle time), expected dollar/hour savings.',
    criteria: [
      { text: 'Includes measurable numbers or targets', words: ['%', 'percent', 'hour', 'day', 'week', 'dollar', 'cost', 'saving', 'kpi', 'target', 'reduction', 'accuracy'] },
      { text: 'Specifies benefits for users or customers', words: ['user', 'customer', 'client', 'experience', 'satisfaction', 'nps', 'speed', 'quality'] }
    ],
    followUp: 'What specific metrics or quantities (e.g., hours/dollars saved, error reduction) will show that this project succeeded?'
  },
  {
    section: 'Business',
    field: 'currentChallenges',
    label: 'Business > Current Challenges',
    question: 'What are the key operational challenges or pain points the client is currently facing?',
    why: 'To identify the root causes of business friction and target systems to alleviate them.',
    goodAnswer: 'Clear explanation of the problem, the operational impact, and who is affected.',
    criteria: [
      { text: 'Identifies core pain points/problems', words: ['challenge', 'issue', 'problem', 'pain', 'difficulty', 'error', 'defect', 'waste'] },
      { text: 'Explains impact on operations or costs', words: ['delay', 'cost', 'manual', 'slow', 'lost', 'waste', 'friction', 'bottleneck', 'risk'] }
    ],
    followUp: 'Could you describe which teams are most impacted by this challenge and what the direct operational impact is?'
  },
  {
    section: 'People',
    field: 'decisionMakers',
    label: 'People > Decision Makers',
    question: 'Who holds final decision-making authority and budget approval for this initiative?',
    why: 'To identify key decision-makers who will sign off on budgets, architecture, and deployment.',
    goodAnswer: 'Specific roles/titles (e.g. CFO, VP Operations) and decision process details.',
    criteria: [
      { text: 'Identifies decision-makers by role/title', words: ['sponsor', 'director', 'vp', 'manager', 'head', 'ceo', 'cfo', 'cio', 'cto', 'owner', 'leader', 'board'] },
      { text: 'Mentions budget or signing authority', words: ['budget', 'approve', 'sign', 'authority', 'fund', 'purchase', 'finance'] }
    ],
    followUp: 'Who specifically (by role or title) has the authority to sign off on budget and system changes?'
  },
  {
    section: 'People',
    field: 'affectedTeams',
    label: 'People > Affected Teams',
    question: 'Which specific teams, departments, or roles will be affected by the proposed changes?',
    why: 'To gauge the impact on human processes and plan training or change management.',
    goodAnswer: 'Impacted user groups, department names, and daily process participants.',
    criteria: [
      { text: 'Names specific teams or business units', words: ['team', 'department', 'unit', 'division', 'operations', 'finance', 'sales', 'engineering', 'warehouse', 'support'] },
      { text: 'Identifies direct system users', words: ['user', 'operator', 'staff', 'technician', 'analyst', 'worker', 'employee', 'role', 'supervisor'] }
    ],
    followUp: 'Which specific business units or daily operators will need to change their day-to-day workflow?'
  },
  {
    section: 'People',
    field: 'keyStakeholders',
    label: 'People > Key Stakeholders',
    question: 'Who are the key stakeholders or subject matter experts that need to be consulted?',
    why: 'To capture workflow details from SMEs and ensure buy-in across all involved departments.',
    goodAnswer: 'Names/roles of subject matter experts, external partners, or internal champions.',
    criteria: [
      { text: 'Mentions subject matter experts (SMEs)', words: ['expert', 'sme', 'specialist', 'champion', 'lead', 'adviser', 'consultant'] },
      { text: 'Identifies other departments to keep informed', words: ['inform', 'consult', 'participate', 'feedback', 'review', 'partner', 'stakeholder'] }
    ],
    followUp: 'Are there any subject matter experts or other department heads whose input is critical for design or implementation?'
  },
  {
    section: 'Process',
    field: 'coreProcesses',
    label: 'Process > Core Processes',
    question: 'What are the critical operational processes this engagement touches or redesigns?',
    why: 'To map out the start-to-finish steps of the processes we are automating or improving.',
    goodAnswer: 'Workflow step sequence, triggers, and the primary outputs or deliverables.',
    criteria: [
      { text: 'Outlines workflow steps or stages', words: ['process', 'workflow', 'step', 'stage', 'flow', 'sequence', 'task', 'run', 'phase'] },
      { text: 'Defines the trigger or output', words: ['trigger', 'start', 'output', 'deliverable', 'result', 'end', 'generate', 'send'] }
    ],
    followUp: 'Could you briefly trace the main steps of this process from start to finish?'
  },
  {
    section: 'Process',
    field: 'knownBottlenecks',
    label: 'Process > Known Bottlenecks',
    question: 'What process friction points or bottlenecks has the client already identified?',
    why: 'To focus automation efforts on parts of the process where delays or errors occur most frequently.',
    goodAnswer: 'Specific delay causes, hand-off errors, queue build-ups, and frequency of issue.',
    criteria: [
      { text: 'Pinpoints specific causes of delay/errors', words: ['delay', 'error', 'wait', 'friction', 'bottleneck', 'slow', 'defect', 'stuck', 'rework', 'hand-off'] },
      { text: 'Mentions frequency or occurrence rate', words: ['often', 'daily', 'weekly', 'always', 'frequent', 'time', 'percent', 'cycle'] }
    ],
    followUp: 'What is the primary cause of these delays or errors, and how often do they occur?'
  },
  {
    section: 'Process',
    field: 'manualWorkAreas',
    label: 'Process > Manual Work Areas',
    question: 'Where does the team perform high-volume manual or repetitive work today?',
    why: 'To target the highest-value areas for direct system integration and data pipeline automation.',
    goodAnswer: 'Specific manual tasks (e.g. data transcription), estimate of hours spent.',
    criteria: [
      { text: 'Details repetitive manual tasks', words: ['manual', 're-key', 'copy', 'paste', 'type', 'paper', 'transcribe', 'log', 'export', 'import'] },
      { text: 'Mentions tools or workarounds used', words: ['excel', 'spreadsheet', 'word', 'email', 'folder', 'sheet', 'file', 'clipboard'] }
    ],
    followUp: 'Which specific steps require manually transcribing, copying, or entering data from one system to another?'
  },
  {
    section: 'Systems',
    field: 'currentSystems',
    label: 'Systems > Current Systems',
    question: 'What software systems, platforms, or tools are in active use?',
    why: 'To understand the existing software stack, hosting choices, and tool compatibility.',
    goodAnswer: 'Name and version of tools/platforms, hosting (cloud/on-prem), and primary users.',
    criteria: [
      { text: 'Lists names of software programs or databases', words: ['sap', 'excel', 'power bi', 'erp', 'crm', 'database', 'sql', 'system', 'tool', 'software', 'spreadsheet', 'app'] },
      { text: 'Specifies system roles or deployment', words: ['cloud', 'on-prem', 'server', 'hosting', 'host', 'local', 'desktop', 'web'] }
    ],
    followUp: 'Could you list the specific names of the software programs, ERPs, or databases used in this workflow?'
  },
  {
    section: 'Systems',
    field: 'integrations',
    label: 'Systems > Integrations',
    question: 'What integrations or data flows currently exist between these systems?',
    why: 'To map the existing data architecture and find broken links or manual transfer steps.',
    goodAnswer: 'Type of integration (API, batch, CSV export), data directions, and update frequency.',
    criteria: [
      { text: 'Describes how systems connect', words: ['integration', 'api', 'export', 'csv', 'file', 'manual', 'transfer', 'sync', 'connect', 'bridge', 'link', 'ftp'] },
      { text: 'Specifies data flow direction or frequency', words: ['daily', 'weekly', 'real-time', 'batch', 'one-way', 'two-way', 'send', 'receive', 'pull', 'push'] }
    ],
    followUp: 'How is data moved between these systems (e.g., automated API, manual export/import, or re-typing)?'
  },
  {
    section: 'Systems',
    field: 'technologyIssues',
    label: 'Systems > Technology Issues',
    question: 'What known technical pain points or gaps exist in the current stack?',
    why: 'To address technical frustrations, performance lags, software limitations, or bugs.',
    goodAnswer: 'System speed issues, downtime, lack of accessibility, or missing critical features.',
    criteria: [
      { text: 'Describes specific technical failures or issues', words: ['performance', 'slow', 'crash', 'bug', 'gap', 'missing', 'outdated', 'limitation', 'issue', 'error', 'failure', 'downtime'] },
      { text: 'Mentions user frustration or workflow block', words: ['frustrated', 'blocked', 'can\'t', 'unable', 'wait', 'slowdown', 'delay'] }
    ],
    followUp: 'What are the main technical frustrations (e.g., slow load times, crashes, lack of access) reported by the team?'
  },
  {
    section: 'Data',
    field: 'reports',
    label: 'Data > Reports & Dashboards',
    question: 'What reports or dashboards does the client currently rely on?',
    why: 'To verify what operational data is delivered to stakeholders and management today.',
    goodAnswer: 'Report names/recipients, generation frequency, and formatting (PDF, Excel).',
    criteria: [
      { text: 'Identifies reports or dashboards by name/purpose', words: ['report', 'dashboard', 'power bi', 'excel', 'pdf', 'sheet', 'chart', 'board', 'summary', 'status'] },
      { text: 'Mentions update frequency or audience', words: ['weekly', 'monthly', 'daily', 'management', 'team', 'executive', 'director', 'meeting'] }
    ],
    followUp: 'What specific reports are generated, who receives them, and in what format (e.g., PDF, spreadsheet)?'
  },
  {
    section: 'Data',
    field: 'kpis',
    label: 'Data > KPIs',
    question: 'What key performance indicators are tracked? What are the targets?',
    why: 'To align system outputs with the operational targets and SLAs of the business.',
    goodAnswer: 'Actual KPI definitions, current value, target threshold, and business owner.',
    criteria: [
      { text: 'Identifies KPI names or performance metrics', words: ['kpi', 'target', 'threshold', 'metric', 'measure', 'sla', 'turnaround', 'rate', 'cost', 'quality', 'number'] },
      { text: 'Specifies actual numbers or target thresholds', words: ['%', 'percent', 'days', 'hours', 'under', 'over', 'minimum', 'maximum', 'target', 'sla'] }
    ],
    followUp: 'Could you specify the target values or acceptable ranges for these KPIs?'
  },
  {
    section: 'Data',
    field: 'dataSources',
    label: 'Data > Data Sources',
    question: 'What are the primary data sources, databases, or warehouses in use?',
    why: 'To locate the authoritative raw data repositories for our pipeline architecture.',
    goodAnswer: 'Raw source databases, schemas or tables used, and server environment hosting.',
    criteria: [
      { text: 'Identifies data servers or warehouses', words: ['database', 'server', 'cloud', 'sql', 'oracle', 'sap', 'postgres', 'mysql', 'warehouse', 'lake', 'storage'] },
      { text: 'Mentions raw file folders or endpoints', words: ['folder', 'sharepoint', 'drive', 'file', 's3', 'bucket', 'excel', 'csv', 'raw'] }
    ],
    followUp: 'Where does the raw data reside before it is consolidated (e.g., SQL server, local drives, ERP database)?'
  }
];

function getAssessmentContext(company) {
  const asm = company.assessment || {};
  return {
    businessGoals: asm.businessGoals || '',
    coreProblems: asm.coreProblems || '',
    operationalBottlenecks: asm.operationalBottlenecks || '',
    techStack: asm.techStack || ''
  };
}

function getDiscoveryIntakeContext(company) {
  const di = company.discoveryIntake || {};
  const context = {};
  ['business', 'people', 'process', 'systems', 'data'].forEach(sec => {
    context[sec] = di[sec] || {};
  });
  return context;
}

function buildDiscoveryPlan(company) {
  return [...DISCOVERY_QUESTIONS];
}

function getNextDiscoveryQuestion(plan, currentIndex) {
  if (currentIndex >= 0 && currentIndex < plan.length) {
    return plan[currentIndex];
  }
  return plan[0];
}

function getQuestionText(q, company) {
  const asm = company.assessment || {};
  
  const extractItems = (text) => {
    if (!text) return [];
    return text.split(/[\n;]+/)
      .map(line => line.replace(/^[\s*\-•+]+/, '').trim())
      .filter(line => line.length > 5 && line.length < 80)
      .slice(0, 3);
  };

  if (q.field === 'primaryGoals' && asm.businessGoals) {
    const items = extractItems(asm.businessGoals);
    if (items.length > 0) {
      return `Based on your assessment, you mentioned goals like: "${items.join(', ')}". Which of these is the highest priority for the next 6–12 months, and why?`;
    }
  }
  if (q.field === 'expectedOutcomes' && asm.businessGoals) {
    const items = extractItems(asm.businessGoals);
    if (items.length > 0) {
      return `You outlined goals such as: "${items.join(', ')}". What specific, measurable outcomes or metrics do you expect will show these goals are met?`;
    }
  }
  if (q.field === 'currentChallenges' && asm.coreProblems) {
    const items = extractItems(asm.coreProblems);
    if (items.length > 0) {
      return `You mentioned core problems: "${items.join(', ')}". Could you describe how these pain points affect your day-to-day operations?`;
    }
  }
  if (q.field === 'coreProcesses' && asm.operationalBottlenecks) {
    const items = extractItems(asm.operationalBottlenecks);
    if (items.length > 0) {
      return `You identified operational bottlenecks in: "${items.join(', ')}". What are the core processes or workflows that contain these bottlenecks?`;
    }
  }
  if (q.field === 'knownBottlenecks' && asm.operationalBottlenecks) {
    const items = extractItems(asm.operationalBottlenecks);
    if (items.length > 0) {
      return `Based on your assessment, you noted bottlenecks like: "${items.join(', ')}". Where exactly do these delays or errors occur, and how often?`;
    }
  }
  if (q.field === 'currentSystems' && asm.techStack) {
    const items = extractItems(asm.techStack);
    if (items.length > 0) {
      return `Your current tech stack includes: "${items.join(', ')}". Are these platforms deployed on-premises or in the cloud, and who are the primary users?`;
    }
  }
  if (q.field === 'technologyIssues' && asm.techStack) {
    const items = extractItems(asm.techStack);
    if (items.length > 0) {
      return `Regarding your tech stack ("${items.join(', ')}"), what are the most critical performance issues, crashes, or missing features the team faces?`;
    }
  }
  
  return q.question;
}

function getFriendlyCriterionLabel(text) {
  const lower = text.toLowerCase();
  if (lower.includes('specific business goals') || lower.includes('priority goal')) {
    return 'Priority Goal';
  }
  if (lower.includes('motivation') || lower.includes('urgency') || lower.includes('driver')) {
    return 'Business Driver';
  }
  if (lower.includes('timeline') || lower.includes('deadline')) {
    return 'Timeline';
  }
  if (lower.includes('measurable numbers') || lower.includes('success metrics')) {
    return 'Expected Outcome';
  }
  if (lower.includes('benefits for users') || lower.includes('user/customer benefits')) {
    return 'User/Customer Benefits';
  }
  
  return text
    .replace(/^has\s+/i, '')
    .replace(/^includes\s+/i, '')
    .replace(/^mentions\s+/i, '')
    .replace(/^specifies\s+/i, '')
    .replace(/^identifies\s+/i, '')
    .replace(/^names\s+/i, '')
    .replace(/^outlines\s+/i, '')
    .replace(/^defines\s+/i, '')
    .replace(/^pinpoints\s+/i, '')
    .replace(/^details\s+/i, '')
    .replace(/^lists\s+/i, '')
    .replace(/^describes\s+/i, '')
    .replace(/^contains\s+/i, '')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function analyzeDiscoveryAnswer(question, answer) {
  if (!answer || answer.trim().length < 10) {
    return {
      isSufficient: false,
      status: 'Insufficient',
      statusColor: '🔴',
      confidence: 0,
      identifiedTags: [],
      optionalClarifications: ['• Brief Answer (lacks sufficient details)'],
      potentialFindings: ['Notes are too brief to form a discovery finding.'],
      recommendationText: 'Type more details or click Next Question to proceed.',
      suggestedQuestion: question.followUp,
      suggestedDestination: { label: 'Business > Primary Goals', value: 'business.primaryGoals' }
    };
  }
  
  const text = answer.toLowerCase();
  const identifiedTags = [];
  const optionalClarifications = [];
  
  // Timeline indicators
  const hasTimeline = 
    /next\s+(\d+|[a-zA-Z]+)\s+months?/i.test(text) ||
    /next\s+(\d+|[a-zA-Z]+)\s+weeks?/i.test(text) ||
    /next\s+(\d+|[a-zA-Z]+)\s+years?/i.test(text) ||
    /\bby\s+q[1-4]\b/i.test(text) ||
    /\bthis\s+year\b/i.test(text) ||
    /\bnext\s+year\b/i.test(text) ||
    /within\s+(\d+|[a-zA-Z]+)\s+months?/i.test(text) ||
    /within\s+(\d+|[a-zA-Z]+)\s+weeks?/i.test(text) ||
    /\b(by|months|year|weeks|timeline|deadline|target|schedule)\b/i.test(text);

  // Urgency indicators
  const hasUrgency = 
    /\bpriority\b/i.test(text) ||
    /\burgent\b/i.test(text) ||
    /\bcritical\b/i.test(text) ||
    /\bimportant\b/i.test(text) ||
    /\bneed\s+to\b/i.test(text) ||
    /\bmust\b/i.test(text) ||
    /\brequired\b/i.test(text) ||
    /\b(motivation|why|need|because|demand|drive|competition)\b/i.test(text);
  
  question.criteria.forEach(criterion => {
    let matched = false;
    const cTextLower = criterion.text.toLowerCase();
    
    if (cTextLower.includes('timeline') || cTextLower.includes('deadline')) {
      matched = hasTimeline || hasUrgency;
    } else if (cTextLower.includes('motivation') || cTextLower.includes('urgency') || cTextLower.includes('driver')) {
      matched = hasUrgency || hasTimeline;
    } else {
      matched = criterion.words.some(word => text.includes(word));
    }
    
    const friendlyName = getFriendlyCriterionLabel(criterion.text);
    if (matched) {
      identifiedTags.push(`✓ ${friendlyName}`);
    } else {
      optionalClarifications.push(`• ${friendlyName}`);
    }
  });

  // Additional dynamic tags based on keywords
  if (text.includes('excel') || text.includes('spreadsheet') || text.includes('sheet')) {
    if (!identifiedTags.includes('✓ Excel Dependency')) identifiedTags.push('✓ Excel Dependency');
  }
  if (text.includes('manual') || text.includes('manually') || text.includes('copy') || text.includes('paste')) {
    if (!identifiedTags.includes('✓ Manual Workflow')) identifiedTags.push('✓ Manual Workflow');
  }
  if (text.includes('report') || text.includes('reporting') || text.includes('visibility')) {
    if (!identifiedTags.includes('✓ Operational Visibility')) identifiedTags.push('✓ Operational Visibility');
  }
  if (text.includes('bottleneck') || text.includes('slow') || text.includes('delay')) {
    if (!identifiedTags.includes('✓ Process Bottleneck')) identifiedTags.push('✓ Process Bottleneck');
  }

  // Potential Discovery Findings
  const potentialFindings = [];
  if (text.includes('excel') && (text.includes('manual') || text.includes('consolidate') || text.includes('compile'))) {
    potentialFindings.push("Weekly KPI reporting relies on manual Excel consolidation.");
  }
  if (text.includes('visibility') || text.includes('delay') || text.includes('slow') || text.includes('fragment')) {
    potentialFindings.push("Operational visibility is delayed by fragmented reporting processes.");
  }
  if (text.includes('real-time') || text.includes('access') || text.includes('data')) {
    potentialFindings.push("Management lacks real-time access to production data.");
  }
  if (text.includes('system') || text.includes('integrate') || text.includes('connect')) {
    potentialFindings.push("Systems lack automated integration, requiring manual data synchronization.");
  }
  
  if (potentialFindings.length === 0) {
    let clean = answer.trim();
    clean = clean.replace(/^(well|honestly|basically|currently|actually|we have|the client said|the client stated|our team|we currently|we just|so basically|in terms of that,)\s*,?\s*/i, '');
    const sentences = clean.split(/(?<=[.!?])\s+/);
    if (sentences.length > 0 && sentences[0].trim().length > 5) {
      let f = sentences[0].trim();
      f = f.charAt(0).toUpperCase() + f.slice(1);
      if (!/[.!?]$/.test(f)) f += '.';
      potentialFindings.push(f);
    } else {
      potentialFindings.push(`Consultant observed details regarding ${question.label.toLowerCase()}.`);
    }
  }

  // Recommendation & suggested question
  let recommendationText = "I identified a standard operational workflow. Before moving on, I recommend capturing client observations.";
  let suggestedQuestion = question.followUp;
  
  if (optionalClarifications.some(c => c.includes('Timeline'))) {
    recommendationText = "I identified business goals, but the target timeline is undefined. Before moving on, I recommend clarifying the strategic schedule.";
    suggestedQuestion = "What is the target launch date or deadline for these system improvements?";
  } else if (optionalClarifications.some(c => c.includes('Outcome') || c.includes('Metrics'))) {
    recommendationText = "I identified a strong operational visibility initiative. Before moving on, I recommend clarifying success metrics.";
    suggestedQuestion = "What measurable business outcome would indicate this initiative was successful?";
  } else if (optionalClarifications.some(c => c.includes('Decision') || c.includes('Budget'))) {
    recommendationText = "I identified system stakeholders, but budget ownership is unclear. Before moving on, I recommend clarifying budget lines.";
    suggestedQuestion = "Who holds final budget approval, and what is the estimated budget range?";
  }

  const numCriteria = question.criteria.length;
  const metCriteria = question.criteria.filter(criterion => {
    const friendlyName = getFriendlyCriterionLabel(criterion.text);
    return identifiedTags.includes(`✓ ${friendlyName}`);
  }).length;
  let baseConf = numCriteria > 0 ? (metCriteria / numCriteria) * 100 : 100;
  
  let lengthModifier = 0;
  const len = answer.trim().length;
  if (len < 40) {
    lengthModifier = -15;
  } else if (len < 80) {
    lengthModifier = -5;
  } else if (len > 150) {
    lengthModifier = 10;
  } else if (len > 100) {
    lengthModifier = 5;
  }
  
  let confidence = Math.round(baseConf + lengthModifier);
  
  let status = 'Insufficient';
  let statusColor = '🔴';
  
  if (metCriteria === numCriteria) {
    status = 'Sufficient';
    statusColor = '🟢';
    confidence = Math.max(80, Math.min(100, confidence));
  } else if (metCriteria > 0) {
    status = 'Partial';
    statusColor = '🟡';
    confidence = Math.max(40, Math.min(79, confidence));
  } else {
    status = 'Insufficient';
    statusColor = '🔴';
    confidence = Math.max(0, Math.min(39, confidence));
  }
  
  const isSufficient = status === 'Sufficient';

  const destinationMap = {
    primaryGoals: { label: 'Business > Primary Goals', value: 'business.primaryGoals' },
    expectedOutcomes: { label: 'Business > Expected Outcomes', value: 'business.expectedOutcomes' },
    currentChallenges: { label: 'Business > Current Challenges', value: 'business.currentChallenges' },
    decisionMakers: { label: 'People > Decision Makers', value: 'people.decisionMakers' },
    affectedTeams: { label: 'People > Affected Teams', value: 'people.affectedTeams' },
    keyStakeholders: { label: 'People > Key Stakeholders', value: 'people.keyStakeholders' },
    coreProcesses: { label: 'Process > Core Processes', value: 'process.coreProcesses' },
    knownBottlenecks: { label: 'Process > Known Bottlenecks', value: 'process.knownBottlenecks' },
    manualWorkAreas: { label: 'Process > Manual Work Areas', value: 'process.manualWorkAreas' },
    currentSystems: { label: 'Systems > Current Systems', value: 'systems.currentSystems' },
    integrations: { label: 'Systems > Integrations', value: 'systems.integrations' },
    technologyIssues: { label: 'Systems > Technology Issues', value: 'systems.technologyIssues' },
    reports: { label: 'Data > Reports & Dashboards', value: 'data.reports' },
    kpis: { label: 'Data > KPIs', value: 'data.kpis' },
    dataSources: { label: 'Data > Data Sources', value: 'data.dataSources' }
  };
  const suggestedDestination = destinationMap[question.field] || { label: 'Business > Primary Goals', value: 'business.primaryGoals' };
  
  return {
    isSufficient,
    status,
    statusColor,
    confidence,
    identifiedTags,
    optionalClarifications,
    potentialFindings,
    recommendationText,
    suggestedQuestion,
    suggestedDestination
  };
}

function generateSuggestedCopy(question, answer) {
  if (!answer || answer.trim().length === 0) return '';
  
  let text = answer.trim();
  text = text.replace(/^(well|honestly|basically|currently|actually|we have|the client said|the client stated|our team|we currently|we just|so basically|in terms of that,)\s*,?\s*/i, '');
  
  const sentences = text.split(/(?<=[.!?])\s+/);
  const bullets = [];
  
  for (let s of sentences) {
    s = s.trim();
    if (!s) continue;
    s = s.charAt(0).toUpperCase() + s.slice(1);
    if (!/[.!?]$/.test(s)) {
      s += '.';
    }
    bullets.push(`- ${s}`);
  }
  
  return bullets.join('\n');
}

function saveGuidedDiscoverySession(companyId, session) {
  localStorage.setItem(`oios_studio_copilot_session_${companyId}`, JSON.stringify(session));
}

function loadGuidedDiscoverySession(companyId) {
  const stored = localStorage.getItem(`oios_studio_copilot_session_${companyId}`);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        const needsAnswersMigration = !parsed.answers && parsed.answeredQuestions;
        const needsCompletedMigration = !parsed.completedQuestions && (parsed.answers || parsed.answeredQuestions);
        const needsSkippedMigration = !Array.isArray(parsed.skippedQuestions);
        
        const answers = parsed.answers || parsed.answeredQuestions || {};
        const completedQuestions = parsed.completedQuestions || Object.keys(answers).filter(k => !!answers[k]);
        
        const migrated = {
          currentIndex: typeof parsed.currentIndex === 'number' ? parsed.currentIndex : 0,
          answers: answers,
          suggestedCopies: parsed.suggestedCopies || {},
          analysisResults: parsed.analysisResults || {},
          completedQuestions: completedQuestions,
          skippedQuestions: Array.isArray(parsed.skippedQuestions) ? parsed.skippedQuestions : [],
          minimized: typeof parsed.minimized === 'boolean' ? parsed.minimized : false,
          guidanceExpanded: typeof parsed.guidanceExpanded === 'boolean' ? parsed.guidanceExpanded : false,
          capturedFindings: Array.isArray(parsed.capturedFindings) ? parsed.capturedFindings : []
        };
        
        if (needsAnswersMigration || needsCompletedMigration || needsSkippedMigration || !('minimized' in parsed) || !('guidanceExpanded' in parsed) || !('capturedFindings' in parsed)) {
          localStorage.setItem(`oios_studio_copilot_session_${companyId}`, JSON.stringify(migrated));
        }
        return migrated;
      }
    } catch (e) {
      console.error('Error parsing copilot session state', e);
    }
  }
  return {
    currentIndex: 0,
    answers: {},
    suggestedCopies: {},
    analysisResults: {},
    completedQuestions: [],
    skippedQuestions: [],
    minimized: false,
    guidanceExpanded: false,
    capturedFindings: []
  };
}

function extractDetectedInformation(answer, question) {
  const text = (answer || '').toLowerCase();
  const detected = [];
  
  // Systems
  if (text.includes('excel')) {
    detected.push({ label: 'System', value: 'Excel' });
  } else if (text.includes('sap')) {
    detected.push({ label: 'System', value: 'SAP ERP' });
  } else if (text.includes('power bi')) {
    detected.push({ label: 'System', value: 'Power BI' });
  } else if (question.field === 'currentSystems') {
    detected.push({ label: 'System', value: 'Legacy Systems' });
  }
  
  // Pain Points
  if (text.includes('manual') || text.includes('manually') || text.includes('consolidate') || text.includes('compile') || text.includes('reporting')) {
    detected.push({ label: 'Pain Point', value: 'Manual Reporting' });
  } else if (text.includes('fragmented') || text.includes('split') || text.includes('silo')) {
    detected.push({ label: 'Pain Point', value: 'Fragmented Data' });
  } else if (text.includes('slow') || text.includes('delay') || text.includes('wait')) {
    detected.push({ label: 'Pain Point', value: 'Operational Bottlenecks' });
  }
  
  // Stakeholder
  if (text.includes('operations') || text.includes('supervisor') || text.includes('manager')) {
    detected.push({ label: 'Stakeholder', value: 'Operations Manager' });
  } else if (text.includes('finance') || text.includes('cfo')) {
    detected.push({ label: 'Stakeholder', value: 'CFO / Finance Team' });
  } else if (text.includes('user') || text.includes('staff') || text.includes('operator')) {
    detected.push({ label: 'Stakeholder', value: 'Daily System Users' });
  }
  
  // Process
  if (text.includes('report') || text.includes('reporting') || text.includes('compile') || text.includes('consolidate')) {
    detected.push({ label: 'Process', value: 'Production Reporting' });
  } else if (text.includes('inventory') || text.includes('warehouse')) {
    detected.push({ label: 'Process', value: 'Inventory Management' });
  }
  
  // Potential Insights
  if (text.includes('excel') || text.includes('manual') || text.includes('consolidate') || text.includes('manually')) {
    detected.push({ label: 'Potential Insight', value: 'Reporting workflow depends on manual consolidation' });
  } else {
    detected.push({ label: 'Potential Insight', value: 'Process automation can eliminate manual entry' });
  }
  
  return detected;
}

function renderDiscoveryMapProgress(plan, session, company, activeQuestion) {
  const pillars = ['Business', 'People', 'Process', 'Systems', 'Data'];
  return pillars.map(pillar => {
    const pillarQuestions = plan.filter(q => q.section.toLowerCase() === pillar.toLowerCase());
    const answeredCount = pillarQuestions.filter(q => {
      const secKey = q.section.toLowerCase();
      const hasSessionAnswer = !!(session.answers?.[q.field] || '').trim();
      const hasIntakeAnswer = !!(company.discoveryIntake?.[secKey]?.[q.field] || '').trim();
      return hasSessionAnswer || hasIntakeAnswer;
    }).length;
    
    const isActive = activeQuestion && activeQuestion.section.toLowerCase() === pillar.toLowerCase();
    
    let statusText = '○ Not Started';
    let statusStyle = 'color: var(--text-muted);';
    if (isActive) {
      statusText = '⏳ In Progress';
      statusStyle = 'color: var(--color-warning); font-weight: 600;';
    } else if (answeredCount === 3) {
      statusText = '✓ Completed';
      statusStyle = 'color: var(--color-success); font-weight: 600;';
    } else if (answeredCount > 0) {
      statusText = '⏳ In Progress';
      statusStyle = 'color: var(--color-warning); font-weight: 600;';
    }
    
    return `
      <div class="flex-between" style="padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.02);">
        <span style="color: var(--text-primary); font-weight: 500;">${pillar}</span>
        <span style="${statusStyle}">${statusText}</span>
      </div>
    `;
  }).join('');
}

function renderCapturedFindings(plan, session, company) {
  const findings = session.capturedFindings || [];
  
  if (findings.length === 0) {
    return `<div style="color: var(--text-muted); font-style: italic; font-size: 11px; padding: 4px 0;">No findings captured yet.</div>`;
  }
  
  return findings.map(finding => {
    const fieldParts = finding.targetField.split('.');
    const fieldName = fieldParts[1] || finding.targetField;
    const label = fieldName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    
    return `
      <div style="font-size: 11.5px; padding: 6px 0; border-bottom: 1px dashed var(--border-color); display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <strong style="color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHTML(label)}</strong>
          <span style="color: var(--color-success); font-weight: 600; flex-shrink: 0;">✓ Captured</span>
        </div>
        <div style="color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font-style: italic;">
          ${escapeHTML(finding.suggestedCopy)}
        </div>
      </div>
    `;
  }).join('');
}

function extractSessionThemes(session) {
  const themes = new Set();
  const allText = Object.values(session.answers || {}).join(' ').toLowerCase();
  
  if (allText.includes('excel') || allText.includes('spreadsheet') || allText.includes('sheet')) {
    themes.add('Excel Dependency');
  }
  if (allText.includes('manual') || allText.includes('paper') || allText.includes('copy') || allText.includes('paste')) {
    themes.add('Manual Reporting');
  }
  if (allText.includes('visibility') || allText.includes('track') || allText.includes('see') || allText.includes('real-time')) {
    themes.add('Operational Visibility');
  }
  if (allText.includes('inventory') || allText.includes('stock') || allText.includes('planning') || allText.includes('warehouse')) {
    themes.add('Inventory Planning');
  }
  if (allText.includes('integrate') || allText.includes('api') || allText.includes('connect') || allText.includes('sync')) {
    themes.add('System Integration');
  }
  if (allText.includes('fragment') || allText.includes('silo') || allText.includes('separate')) {
    themes.add('Data Fragmentation');
  }
  if (allText.includes('decision') || allText.includes('approve') || allText.includes('owner') || allText.includes('sign')) {
    themes.add('Stakeholder Alignment');
  }
  if (allText.includes('slow') || allText.includes('delay') || allText.includes('wait') || allText.includes('bottleneck')) {
    themes.add('Process Bottleneck');
  }
  
  return Array.from(themes);
}

function renderDiscoveryThemes(session) {
  const themes = extractSessionThemes(session);
  if (themes.length === 0) {
    return `<div style="color: var(--text-muted); font-style: italic; font-size: 11px; padding: 4px 0;">No themes identified yet.</div>`;
  }
  
  return themes.map(theme => `
    <div style="font-size: 12px; display: flex; align-items: center; gap: 6px; color: var(--text-secondary); padding: 2px 0;">
      <span style="color: var(--color-success); font-weight: bold;">✓</span>
      <span>${escapeHTML(theme)}</span>
    </div>
  `).join('');
}

function renderMeetingMode(company, overlay) {
  const session = loadGuidedDiscoverySession(company.id);
  const plan = buildDiscoveryPlan(company);
  
  if (session.currentIndex >= plan.length) {
    session.currentIndex = 0;
  }
  
  const activeQuestion = getNextDiscoveryQuestion(plan, session.currentIndex);
  const questionText = getQuestionText(activeQuestion, company);
  
  overlay.innerHTML = `
    <div class="meeting-topbar">
      <div>
        <strong style="font-size: 16px; color: var(--text-primary);">${escapeHTML(company.name)}</strong>
        <span style="font-size: 12px; color: var(--text-muted); display: block; margin-top: 2px;">Discovery Session</span>
      </div>
      <div class="meeting-window-controls">
        <button id="btn-minimize-meeting" class="meeting-window-btn" title="Minimize Session">
          ${getIconHTML('minus', 'width: 16px; height: 16px;')}
        </button>
        <button id="btn-exit-meeting" class="meeting-window-btn exit-btn" title="Exit Session">
          ${getIconHTML('x', 'width: 16px; height: 16px;')}
        </button>
      </div>
    </div>
    
    <div class="meeting-container">
      <div class="meeting-grid-layout">
        
        <!-- LEFT PANEL (70%) -->
        <div class="meeting-main-panel">
          <!-- Section metadata -->
          <div class="meeting-question-header" style="display: flex; gap: 8px; align-items: center;">
            <span class="badge badge-info" style="font-size: 10px; padding: 2px 8px;">${escapeHTML(activeQuestion.section.toUpperCase())}</span>
            <span style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">${escapeHTML(activeQuestion.field)}</span>
          </div>
          
          <!-- Large readable question -->
          <div class="meeting-question-text" id="meeting-question-display" style="font-size: 20px; font-weight: 600; color: var(--text-primary); line-height: 1.4; margin: 8px 0;">
            ${escapeHTML(questionText)}
          </div>
          
          <!-- Discovery Guidance Accordion -->
          <div style="margin-bottom: 12px;">
            <details id="details-discovery-guidance" style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; background: var(--bg-primary);" ${session.guidanceExpanded ? 'open' : ''}>
              <summary style="font-size: 13px; font-weight: 600; cursor: pointer; color: var(--text-primary); list-style: none; display: flex; align-items: center; gap: 6px; user-select: none;">
                <span class="accordion-arrow" style="font-size: 10px; width: 12px; display: inline-block;">${session.guidanceExpanded ? '▼' : '▶'}</span> Discovery Guidance
              </summary>
              <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 12px; font-size: 13px; line-height: 1.4;">
                <div>
                  <strong style="color: var(--text-muted); display: block; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; font-family: var(--font-mono);">Why am I asking this?</strong>
                  <div style="color: var(--text-secondary);">${escapeHTML(activeQuestion.why)}</div>
                </div>
                <div>
                  <strong style="color: var(--text-muted); display: block; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; font-family: var(--font-mono);">What should a good answer include?</strong>
                  <ul style="padding-left: 16px; margin: 0; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px; margin-bottom: 0;">
                    ${activeQuestion.criteria.map(c => `<li>${escapeHTML(c.text)}</li>`).join('')}
                  </ul>
                </div>
              </div>
            </details>
          </div>
          
          <!-- Large Textarea -->
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label for="meeting-answer-input" style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted); text-transform: uppercase; display: block;">Client Answer / Meeting Note</label>
            <textarea id="meeting-answer-input" class="meeting-textarea" placeholder="Type the client's response here..." style="min-height: 120px;">${escapeHTML(session.answers[activeQuestion.field] || '')}</textarea>
          </div>
          
          <!-- Results Card container -->
          <div id="meeting-result-container"></div>
          
          <!-- Action Bar -->
          <div class="meeting-action-bar" style="margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <div>
              <button id="btn-meeting-analyze" class="btn btn-secondary" style="padding: 8px 16px; height: 38px;">Analyze Answer</button>
            </div>
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
              <button id="btn-meeting-skip" class="btn btn-secondary" style="padding: 8px 16px; height: 38px;">Skip</button>
              <button id="btn-meeting-complete" class="btn btn-primary" style="padding: 8px 16px; height: 38px;">Capture Finding</button>
              <button id="btn-meeting-prev" class="btn btn-secondary" style="padding: 8px 16px; height: 38px;">Previous Question</button>
              <button id="btn-meeting-next" class="btn btn-secondary" style="padding: 8px 16px; height: 38px;">Next Question</button>
              <button id="btn-meeting-finish" class="btn btn-danger" style="padding: 8px 16px; height: 38px;">Finish Session</button>
            </div>
          </div>
        </div>
        
        <!-- RIGHT PANEL (30%) -->
        <div class="meeting-sidebar-panel">
          <!-- Card 1: Client Snapshot -->
          <div class="meeting-sidebar-card">
            <h3 style="font-size: 13px; margin: 0; color: var(--text-primary); text-transform: uppercase; font-family: var(--font-mono); letter-spacing: 0.5px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Client Snapshot</h3>
            <div style="font-size: 12px; display: flex; flex-direction: column; gap: 10px; line-height: 1.4;">
              <div><strong>Industry:</strong> <span style="color: var(--text-secondary); display: block; margin-top: 2px;">${escapeHTML(company.industry || 'N/A')}</span></div>
              <div><strong>Company Size:</strong> <span style="color: var(--text-secondary); display: block; margin-top: 2px;">${escapeHTML(company.size || company.companySize || 'N/A')}</span></div>
              <div><strong>Business Goals:</strong> <span style="color: var(--text-secondary); display: block; margin-top: 2px;">${escapeHTML(company.assessment?.businessGoals || 'N/A')}</span></div>
              <div><strong>Pain Points:</strong> <span style="color: var(--text-secondary); display: block; margin-top: 2px;">${escapeHTML(company.assessment?.coreProblems || 'N/A')}</span></div>
              <div><strong>Tech Stack:</strong> <span style="color: var(--text-secondary); display: block; margin-top: 2px;">${escapeHTML(company.assessment?.techStack || 'N/A')}</span></div>
            </div>
          </div>
          
          <!-- Card 2: Discovery Map -->
          <div class="meeting-sidebar-card">
            <h3 style="font-size: 13px; margin: 0; color: var(--text-primary); text-transform: uppercase; font-family: var(--font-mono); letter-spacing: 0.5px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Discovery Progress Map</h3>
            <div style="font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
              ${renderDiscoveryMapProgress(plan, session, company, activeQuestion)}
            </div>
          </div>
          
          <!-- Card 3: Captured Findings -->
          <div class="meeting-sidebar-card">
            <h3 style="font-size: 13px; margin: 0; color: var(--text-primary); text-transform: uppercase; font-family: var(--font-mono); letter-spacing: 0.5px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Captured Findings</h3>
            <div style="font-size: 12px; display: flex; flex-direction: column; gap: 8px; max-height: 250px; overflow-y: auto;">
              ${renderCapturedFindings(plan, session, company)}
            </div>
          </div>

          <!-- Card 4: Discovery Themes -->
          <div class="meeting-sidebar-card">
            <h3 style="font-size: 13px; margin: 0; color: var(--text-primary); text-transform: uppercase; font-family: var(--font-mono); letter-spacing: 0.5px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">Discovery Themes</h3>
            <div style="font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
              ${renderDiscoveryThemes(session)}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  `;
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
  
  const textarea = overlay.querySelector('#meeting-answer-input');
  
  // Save answer on input
  textarea.addEventListener('input', () => {
    session.answers[activeQuestion.field] = textarea.value;
    saveGuidedDiscoverySession(company.id, session);
  });
  
  // Bind toggle listener for guidance accordion to persist expand/collapse state
  const detailsGuidance = overlay.querySelector('#details-discovery-guidance');
  if (detailsGuidance) {
    detailsGuidance.addEventListener('toggle', () => {
      session.guidanceExpanded = detailsGuidance.open;
      saveGuidedDiscoverySession(company.id, session);
      const arrow = detailsGuidance.querySelector('.accordion-arrow');
      if (arrow) arrow.textContent = detailsGuidance.open ? '▼' : '▶';
    });
  }
  
  // Display cached result if any
  const cachedResult = session.analysisResults[activeQuestion.field];
  if (cachedResult && textarea.value.trim().length > 0) {
    showMeetingAnalysisResult(activeQuestion, cachedResult, overlay, session, company);
  }
  
  // Analyze button handler
  overlay.querySelector('#btn-meeting-analyze').addEventListener('click', () => {
    const val = textarea.value;
    const res = analyzeDiscoveryAnswer(activeQuestion, val);
    
    session.answers[activeQuestion.field] = val;
    session.analysisResults[activeQuestion.field] = res;
    
    if (res.isSufficient) {
      session.suggestedCopies[activeQuestion.field] = generateSuggestedCopy(activeQuestion, val);
    }
    
    saveGuidedDiscoverySession(company.id, session);
    showMeetingAnalysisResult(activeQuestion, res, overlay, session, company);
  });
  
  // Skip button handler
  overlay.querySelector('#btn-meeting-skip').addEventListener('click', () => {
    if (!session.skippedQuestions.includes(activeQuestion.field)) {
      session.skippedQuestions.push(activeQuestion.field);
    }
    session.completedQuestions = session.completedQuestions.filter(f => f !== activeQuestion.field);
    
    advanceMeetingQuestion(plan, session, company, overlay);
  });
  
  // Complete button handler (renamed to Capture Finding in UI)
  overlay.querySelector('#btn-meeting-complete').addEventListener('click', () => {
    const val = textarea.value;
    session.answers[activeQuestion.field] = val;
    saveGuidedDiscoverySession(company.id, session);

    // Run analysis to get confidence and potential findings
    const res = analyzeDiscoveryAnswer(activeQuestion, val);
    openCaptureFindingModal(activeQuestion, res, session, company, overlay, res.potentialFindings[0] || '');
  });
  
  // Previous button handler
  overlay.querySelector('#btn-meeting-prev').addEventListener('click', () => {
    const val = textarea.value;
    session.answers[activeQuestion.field] = val;
    session.currentIndex = (session.currentIndex - 1 + plan.length) % plan.length;
    saveGuidedDiscoverySession(company.id, session);
    renderMeetingMode(company, overlay);
  });
  
  // Next button handler
  overlay.querySelector('#btn-meeting-next').addEventListener('click', () => {
    const val = textarea.value;
    session.answers[activeQuestion.field] = val;
    session.currentIndex = (session.currentIndex + 1) % plan.length;
    saveGuidedDiscoverySession(company.id, session);
    renderMeetingMode(company, overlay);
  });
  
  // Minimize button handler
  overlay.querySelector('#btn-minimize-meeting').addEventListener('click', () => {
    session.minimized = true;
    saveGuidedDiscoverySession(company.id, session);
    overlay.remove();
    
    // Create floating resume button
    let floatBtn = document.getElementById('btn-floating-resume-session');
    if (!floatBtn) {
      floatBtn = document.createElement('button');
      floatBtn.id = 'btn-floating-resume-session';
      floatBtn.className = 'btn btn-primary';
      floatBtn.style.cssText = 'position: fixed; bottom: 30px; right: 30px; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.5); padding: 12px 20px; border-radius: var(--radius-lg); font-weight: 600; display: flex; align-items: center; gap: 8px;';
      floatBtn.innerHTML = `${getIconHTML('play', 'width: 14px; height: 14px;')} Resume Discovery Session`;
      
      const workspaceContainer = document.getElementById('workspace-tab-content') || document.body;
      workspaceContainer.appendChild(floatBtn);
      
      floatBtn.addEventListener('click', () => {
        session.minimized = false;
        saveGuidedDiscoverySession(company.id, session);
        floatBtn.remove();
        toggleMeetingMode(company);
      });
    }
  });

  // Exit session handler
  overlay.querySelector('#btn-exit-meeting').addEventListener('click', () => {
    if (confirm('Are you sure you want to exit this discovery session?')) {
      saveGuidedDiscoverySession(company.id, session);
      overlay.remove();
      const floatBtn = document.getElementById('btn-floating-resume-session');
      if (floatBtn) floatBtn.remove();
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  });
  
  // Finish session handler
  overlay.querySelector('#btn-meeting-finish').addEventListener('click', () => {
    renderMeetingReview(company, overlay);
  });
}

function advanceMeetingQuestion(plan, session, company, overlay) {
  let nextIdx = session.currentIndex + 1;
  let found = false;
  
  while (nextIdx < plan.length) {
    const q = plan[nextIdx];
    const isQClosed = session.completedQuestions.includes(q.field) || !!(company.discoveryIntake?.[q.section.toLowerCase()]?.[q.field] || '').trim();
    if (!isQClosed) {
      session.currentIndex = nextIdx;
      found = true;
      break;
    }
    nextIdx++;
  }
  
  if (!found) {
    nextIdx = 0;
    while (nextIdx < session.currentIndex) {
      const q = plan[nextIdx];
      const isQClosed = session.completedQuestions.includes(q.field) || !!(company.discoveryIntake?.[q.section.toLowerCase()]?.[q.field] || '').trim();
      if (!isQClosed) {
        session.currentIndex = nextIdx;
        found = true;
        break;
      }
      nextIdx++;
    }
  }
  
  if (!found) {
    renderMeetingReview(company, overlay);
    return;
  }
  
  saveGuidedDiscoverySession(company.id, session);
  renderMeetingMode(company, overlay);
}

function openCaptureFindingModal(activeQuestion, res, session, company, overlay, defaultSuggestedCopy = '') {
  const originalAnswer = session.answers[activeQuestion.field] || '';
  const suggestedCopy = defaultSuggestedCopy || res.potentialFindings[0] || generateSuggestedCopy(activeQuestion, originalAnswer);
  const plan = buildDiscoveryPlan(company);

  const destinationMap = {
    'business.primaryGoals': 'Business > Primary Goals',
    'business.expectedOutcomes': 'Business > Expected Outcomes',
    'business.currentChallenges': 'Business > Current Challenges',
    'people.decisionMakers': 'People > Decision Makers',
    'people.affectedTeams': 'People > Affected Teams',
    'people.keyStakeholders': 'People > Key Stakeholders',
    'process.coreProcesses': 'Process > Core Processes',
    'process.knownBottlenecks': 'Process > Known Bottlenecks',
    'process.manualWorkAreas': 'Process > Manual Work Areas',
    'systems.currentSystems': 'Systems > Current Systems',
    'systems.integrations': 'Systems > Integrations',
    'systems.technologyIssues': 'Systems > Technology Issues',
    'data.reports': 'Data > Reports & Dashboards',
    'data.kpis': 'Data > KPIs',
    'data.dataSources': 'Data > Data Sources'
  };

  const optionsHTML = Object.entries(destinationMap).map(([val, label]) => {
    const isSelected = val === res.suggestedDestination?.value ? 'selected' : '';
    return `<option value="${val}" ${isSelected}>${escapeHTML(label)}</option>`;
  }).join('');

  const modalBody = `
    <div style="display: flex; flex-direction: column; gap: 12px; font-size: 13px;">
      <div>
        <label style="display: block; font-weight: 600; margin-bottom: 4px;">Source Type</label>
        <select id="modal-finding-source-type" class="form-control" style="width: 100%;">
          <option value="Meeting Note" selected>Meeting Note</option>
          <option value="Interview">Interview</option>
          <option value="Assessment">Assessment</option>
          <option value="Observation">Observation</option>
          <option value="Other">Other</option>
        </select>
      </div>
      <div>
        <label style="display: block; font-weight: 600; margin-bottom: 4px;">Target Discovery Field</label>
        <select id="modal-finding-target-field" class="form-control" style="width: 100%;">
          ${optionsHTML}
        </select>
      </div>
      <div>
        <label style="display: block; font-weight: 600; margin-bottom: 4px;">Original Answer (Read-Only)</label>
        <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 8px; border-radius: var(--radius-sm); max-height: 100px; overflow-y: auto; color: var(--text-secondary); white-space: pre-wrap;">${escapeHTML(originalAnswer)}</div>
      </div>
      <div>
        <label style="display: block; font-weight: 600; margin-bottom: 4px;">Suggested Copy</label>
        <textarea id="modal-finding-suggested-copy" class="form-control" style="width: 100%; min-height: 80px; font-family: var(--font-sans);">${escapeHTML(suggestedCopy)}</textarea>
      </div>
      <div>
        <label style="display: block; font-weight: 600; margin-bottom: 4px;">AI Observation / Consultant Note</label>
        <textarea id="modal-finding-note" class="form-control" style="width: 100%; min-height: 60px;" placeholder="Add any details, context, or AI recommendations here...">${escapeHTML(res.recommendationText || '')}</textarea>
      </div>
    </div>
  `;

  const modalFooter = `
    <button class="btn btn-secondary" id="modal-cancel-finding">Cancel</button>
    <button class="btn btn-primary" id="modal-save-finding">Save Finding</button>
  `;

  openModal('Capture Discovery Finding', modalBody, modalFooter);

  document.getElementById('modal-cancel-finding').addEventListener('click', closeModal);
  document.getElementById('modal-save-finding').addEventListener('click', () => {
    const sourceType = document.getElementById('modal-finding-source-type').value;
    const targetField = document.getElementById('modal-finding-target-field').value;
    const editedSuggestedCopy = document.getElementById('modal-finding-suggested-copy').value;
    const note = document.getElementById('modal-finding-note').value;

    const newFinding = {
      id: generateUUID(),
      sourceType,
      targetField,
      originalAnswer,
      suggestedCopy: editedSuggestedCopy,
      note,
      timestamp: new Date().toISOString()
    };

    if (!session.capturedFindings) {
      session.capturedFindings = [];
    }
    session.capturedFindings.push(newFinding);

    // Also mark the current question field as completed
    if (!session.completedQuestions.includes(activeQuestion.field)) {
      session.completedQuestions.push(activeQuestion.field);
    }
    session.skippedQuestions = session.skippedQuestions.filter(f => f !== activeQuestion.field);

    saveGuidedDiscoverySession(company.id, session);
    showToast('Discovery finding captured successfully!', 'success');
    closeModal();

    // Re-render meeting mode to show the updated captured findings sidebar card
    renderMeetingMode(company, overlay);

    // Automatically advance to the next question
    advanceMeetingQuestion(plan, session, company, overlay);
  });
}

function showMeetingAnalysisResult(activeQuestion, res, overlay, session, company) {
  const container = overlay.querySelector('#meeting-result-container');
  if (!container) return;
  
  const detected = extractDetectedInformation(session.answers[activeQuestion.field], activeQuestion);
  const detectedHTML = `
    <div class="meeting-detected-info-panel" style="margin-top: 12px; padding: 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
      <strong style="display: block; font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; font-family: var(--font-mono);">Detected Information:</strong>
      <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px;">
        ${detected.map(item => `
          <li style="font-size: 12px; display: flex; align-items: center; gap: 6px; color: var(--text-secondary);">
            <span style="color: var(--color-success); font-weight: 600;">✓</span> 
            <strong>${escapeHTML(item.label)}:</strong> <span>${escapeHTML(item.value)}</span>
          </li>
        `).join('')}
      </ul>
    </div>
  `;

  // Build Identified tags (Captured details) list
  const identifiedTagsHTML = res.identifiedTags.length > 0
    ? res.identifiedTags.map(tag => `<span class="badge badge-success" style="font-size: 11px; padding: 4px 8px; border-radius: 4px;">${escapeHTML(tag)}</span>`).join(' ')
    : `<span style="color: var(--text-muted); font-style: italic; font-size: 12px;">None identified</span>`;
     
  // Build Optional clarifications list
  const optionalClarificationsHTML = res.optionalClarifications.length > 0
    ? res.optionalClarifications.map(c => `<li style="color: var(--text-secondary); display: flex; align-items: center; gap: 6px;"><span style="color: var(--text-muted);">•</span> ${escapeHTML(c.replace(/^•\s*/, ''))}</li>`).join('')
    : `<li style="color: var(--text-muted); font-style: italic;">All criteria met</li>`;

  // Recommendation Card (Always displayed in the Copilot layer)
  const recommendationCardHTML = `
    <div class="meeting-recommendation-box" style="margin-top: 12px; padding: 12px; background: var(--bg-primary); border: 1px dashed rgba(66, 153, 225, 0.3); border-radius: var(--radius-md); font-size: 13px;">
      <strong style="display: block; font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; font-family: var(--font-mono);">Copilot Recommendation:</strong>
      <span style="color: var(--text-primary); line-height: 1.4; display: block; margin-bottom: 8px;">${escapeHTML(res.recommendationText)}</span>
      
      <div style="font-style: italic; color: var(--text-secondary); margin-bottom: 8px; border-left: 2px solid var(--border-color); padding-left: 8px;">
        Suggested Follow-up: "${escapeHTML(res.suggestedQuestion)}"
      </div>
      
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button id="btn-use-follow-up" class="btn btn-secondary" style="font-size: 11px; padding: 4px 10px; display: flex; align-items: center; gap: 4px; height: 26px;">
          ${getIconHTML('plus', 'width: 12px; height: 12px;')} Use Follow-up Question
        </button>
        <button id="btn-card-capture-finding" class="btn btn-primary" style="font-size: 11px; padding: 4px 10px; display: flex; align-items: center; gap: 4px; height: 26px;">
          ${getIconHTML('check', 'width: 12px; height: 12px;')} Capture Current Finding
        </button>
      </div>
    </div>
  `;

  // Suggested Copy Card
  let suggestedCopy = session.suggestedCopies[activeQuestion.field] || generateSuggestedCopy(activeQuestion, session.answers[activeQuestion.field]);
  session.suggestedCopies[activeQuestion.field] = suggestedCopy;
  
  let copyCardHTML = '';
  if (suggestedCopy) {
    copyCardHTML = `
      <div class="meeting-suggested-copy-box" style="margin-top: 12px; padding: 12px; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
        <strong style="font-size: 12px; color: var(--text-primary); display: block; margin-bottom: 6px;">
          Suggested Copy for: ${escapeHTML(activeQuestion.section)} > ${escapeHTML(activeQuestion.field)}
          ${res.isSufficient ? `<span style="display:none;" id="test-sufficient-check">Answer is sufficient</span>` : ''}
        </strong>
        <div id="meeting-suggested-text" style="font-family: var(--font-sans); font-size: 13px; color: var(--text-secondary); background: var(--bg-secondary); border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-md); white-space: pre-wrap; margin-top: 6px; line-height: 1.5;">${escapeHTML(suggestedCopy)}</div>
        <button id="btn-meeting-copy-text" class="btn btn-secondary" style="margin-top: 8px; font-size: 12px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 6px; height: 32px;">
          ${getIconHTML('copy', 'width: 14px; height: 14px;')} Copy Suggested Text
        </button>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="meeting-result-card" style="margin-top: 12px; padding: 16px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-lg); display: flex; flex-direction: column; gap: 12px;">
      <div style="font-size: 14px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
        <strong style="font-size: 15px; color: var(--text-primary); display: block; margin-bottom: 6px;">AI Discovery Copilot Review</strong>
        <div style="margin-bottom: 4px;">Confidence: <span style="font-weight: 600; color: var(--text-primary);">${res.confidence}%</span></div>
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <strong style="display: block; font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; font-family: var(--font-mono);">Identified Tags:</strong>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${identifiedTagsHTML}
          </div>
        </div>
        <div>
          <strong style="display: block; font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px; font-family: var(--font-mono);">Optional Clarifications:</strong>
          <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; font-size: 12px;">
            ${optionalClarificationsHTML}
          </ul>
        </div>
      </div>
    </div>
    
    ${detectedHTML}
    ${recommendationCardHTML}
    ${copyCardHTML}
  `;

  // Bind copy button if it exists
  const copyBtn = container.querySelector('#btn-meeting-copy-text');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(suggestedCopy).then(() => {
        showToast('Copied suggested text to clipboard!', 'success');
      }).catch(() => {
        const textArea = document.createElement("textarea");
        textArea.value = suggestedCopy;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
        showToast('Copied suggested text to clipboard!', 'success');
      });
    });
  }

  // Bind follow-up button if it exists
  const useFollowUpBtn = container.querySelector('#btn-use-follow-up');
  if (useFollowUpBtn) {
    useFollowUpBtn.addEventListener('click', () => {
      const input = overlay.querySelector('#meeting-answer-input');
      if (input) {
        const separator = input.value.trim().length > 0 ? '\n\n' : '';
        input.value += `${separator}Follow-up: ${res.suggestedQuestion}`;
        input.dispatchEvent(new Event('input'));
        overlay.querySelector('#btn-meeting-analyze').click();
      }
    });
  }

  // Bind card capture finding button
  const cardCaptureBtn = container.querySelector('#btn-card-capture-finding');
  if (cardCaptureBtn) {
    cardCaptureBtn.addEventListener('click', () => {
      openCaptureFindingModal(activeQuestion, res, session, company, overlay, res.potentialFindings[0] || '');
    });
  }
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function renderMeetingReview(company, overlay) {
  const session = loadGuidedDiscoverySession(company.id);
  const findings = session.capturedFindings || [];
  
  // Group findings by pillar
  const grouped = {
    Business: [],
    People: [],
    Process: [],
    Systems: [],
    Data: []
  };
  
  findings.forEach(f => {
    const fieldParts = f.targetField.split('.');
    const pillarKey = fieldParts[0];
    const pillarName = pillarKey.charAt(0).toUpperCase() + pillarKey.slice(1);
    if (grouped[pillarName]) {
      grouped[pillarName].push(f);
    } else {
      grouped.Business.push(f); // Default fallback
    }
  });

  const destinationMap = {
    'business.primaryGoals': 'Primary Goals',
    'business.expectedOutcomes': 'Expected Outcomes',
    'business.currentChallenges': 'Current Challenges',
    'people.decisionMakers': 'Decision Makers',
    'people.affectedTeams': 'Affected Teams',
    'people.keyStakeholders': 'Key Stakeholders',
    'process.coreProcesses': 'Core Processes',
    'process.knownBottlenecks': 'Known Bottlenecks',
    'process.manualWorkAreas': 'Manual Work Areas',
    'systems.currentSystems': 'Current Systems',
    'systems.integrations': 'Integrations',
    'systems.technologyIssues': 'Technology Issues',
    'data.reports': 'Reports & Dashboards',
    'data.kpis': 'KPIs',
    'data.dataSources': 'Data Sources'
  };

  // Prepare Copy All Content
  let allContentText = '';
  Object.entries(grouped).forEach(([pillar, list]) => {
    if (list.length > 0) {
      allContentText += `=== ${pillar.toUpperCase()} FINDINGS ===\n\n`;
      list.forEach(f => {
        const fieldLabel = destinationMap[f.targetField] || f.targetField;
        allContentText += `--- ${fieldLabel} (Source: ${f.sourceType}) ---\n`;
        allContentText += `Suggested Copy:\n${f.suggestedCopy}\n`;
        if (f.note) {
          allContentText += `AI Observation / Consultant Note:\n${f.note}\n`;
        }
        allContentText += `\n`;
      });
    }
  });
  allContentText = allContentText.trim();

  overlay.innerHTML = `
    <div class="meeting-topbar">
      <div>
        <strong style="font-size: 16px; color: var(--text-primary);">${escapeHTML(company.name)}</strong>
        <span style="font-size: 12px; color: var(--text-muted); display: block; margin-top: 2px;">Session Findings Review</span>
      </div>
      <div style="font-size: 14px; font-weight: 600; color: var(--color-success); font-family: var(--font-mono);">
        Captured Findings: ${findings.length}
      </div>
      <div>
        <button id="btn-close-review" class="btn btn-primary" style="padding: 6px 12px; font-size: 12px; height: 32px; display: inline-flex; align-items: center;">
          ${getIconHTML('check', 'width: 14px; height: 14px; margin-right: 4px;')} Close & Return
        </button>
      </div>
    </div>
    
    <div class="meeting-container">
      <div class="meeting-review-screen">
        <div class="flex-between" style="border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 16px;">
          <div>
            <h3 style="font-size: 18px; margin: 0; color: var(--text-primary);">Captured Discovery Findings</h3>
            <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px; margin-bottom: 0;">Grouped by architectural pillars. Copy suggested text to insert manually into the main Intake form.</p>
          </div>
          ${allContentText ? `
            <button id="btn-copy-all-review" class="btn btn-secondary" style="padding: 8px 16px; display: inline-flex; align-items: center; gap: 6px; height: 38px;">
              ${getIconHTML('copy', 'width: 14px; height: 14px;')} Copy All Findings
            </button>
          ` : ''}
        </div>
        
        <div class="meeting-review-grid" style="display: flex; flex-direction: column; gap: 24px;">
          ${Object.entries(grouped).map(([pillarName, list]) => {
            if (list.length === 0) return '';
            
            const listHTML = list.map(f => {
              const fieldLabel = destinationMap[f.targetField] || f.targetField;
              return `
                <div class="meeting-review-field" style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; display: flex; flex-direction: column; gap: 10px;">
                  <div class="flex-between" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px;">
                    <div>
                      <strong style="font-size: 14px; color: var(--text-primary);">${escapeHTML(fieldLabel)}</strong>
                      <span class="badge badge-info" style="font-size: 10px; margin-left: 8px; vertical-align: middle;">Source: ${escapeHTML(f.sourceType)}</span>
                    </div>
                    <div style="display: flex; gap: 8px;">
                      <button class="btn btn-secondary btn-copy-finding-copy" data-id="${f.id}" style="padding: 4px 10px; font-size: 11px; height: 26px; display: inline-flex; align-items: center; gap: 4px;">
                        ${getIconHTML('copy', 'width: 12px; height: 12px;')} Copy Copy Text
                      </button>
                      <button class="btn btn-secondary btn-copy-finding-note" data-id="${f.id}" style="padding: 4px 10px; font-size: 11px; height: 26px; display: inline-flex; align-items: center; gap: 4px;">
                        ${getIconHTML('file-text', 'width: 12px; height: 12px;')} Copy Note
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <strong style="display: block; font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; font-family: var(--font-mono);">Suggested Copy:</strong>
                    <div style="font-family: var(--font-sans); font-size: 13px; color: var(--text-primary); background: var(--bg-primary); border: 1px solid var(--border-color); padding: 12px; border-radius: var(--radius-sm); white-space: pre-wrap; line-height: 1.4;">${escapeHTML(f.suggestedCopy)}</div>
                  </div>
                  
                  ${f.note ? `
                    <div>
                      <strong style="display: block; font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px; font-family: var(--font-mono);">AI Observation / Consultant Note:</strong>
                      <div style="font-size: 13px; color: var(--text-secondary); background: var(--bg-primary); border: 1px dashed var(--border-color); padding: 12px; border-radius: var(--radius-sm); line-height: 1.4;">${escapeHTML(f.note)}</div>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('');
            
            return `
              <div class="meeting-review-section">
                <h4 style="font-size: 12px; font-family: var(--font-mono); color: var(--text-primary); text-transform: uppercase; margin-bottom: 12px; border-bottom: 2px solid var(--border-color); padding-bottom: 6px; letter-spacing: 0.5px; font-weight: 700;">
                  ${escapeHTML(pillarName)} Pillar
                </h4>
                <div style="display: flex; flex-direction: column; gap: 16px;">
                  ${listHTML}
                </div>
              </div>
            `;
          }).filter(html => html !== '').join('') || `
            <div style="text-align: center; color: var(--text-muted); padding: 40px 0; background: var(--bg-secondary); border: 1px dashed var(--border-color); border-radius: var(--radius-lg);">
              No findings were captured during this session.
            </div>
          `}
        </div>
      </div>
    </div>
  `;
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
  
  // Bind close button
  overlay.querySelector('#btn-close-review').addEventListener('click', () => {
    overlay.remove();
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  
  // Bind copy all button
  const copyAllBtn = overlay.querySelector('#btn-copy-all-review');
  if (copyAllBtn) {
    copyAllBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(allContentText).then(() => {
        showToast('Copied all session findings to clipboard!', 'success');
      }).catch(() => {
        const textArea = document.createElement("textarea");
        textArea.value = allContentText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
        showToast('Copied all session findings to clipboard!', 'success');
      });
    });
  }

  // Bind individual copy finding copy buttons
  overlay.querySelectorAll('.btn-copy-finding-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const finding = findings.find(f => f.id === id);
      if (finding) {
        const text = finding.suggestedCopy;
        navigator.clipboard.writeText(text).then(() => {
          showToast('Copied suggested copy text!', 'success');
        }).catch(() => {
          const textArea = document.createElement("textarea");
          textArea.value = text;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          textArea.remove();
          showToast('Copied suggested copy text!', 'success');
        });
      }
    });
  });

  // Bind individual copy finding note buttons
  overlay.querySelectorAll('.btn-copy-finding-note').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const finding = findings.find(f => f.id === id);
      if (finding && finding.note) {
        const text = finding.note;
        navigator.clipboard.writeText(text).then(() => {
          showToast('Copied observation note!', 'success');
        }).catch(() => {
          const textArea = document.createElement("textarea");
          textArea.value = text;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand("copy");
          textArea.remove();
          showToast('Copied observation note!', 'success');
        });
      }
    });
  });
}

function toggleMeetingMode(company) {
  let overlay = document.getElementById('meeting-mode-overlay');
  if (overlay) {
    overlay.remove();
  } else {
    overlay = document.createElement('div');
    overlay.id = 'meeting-mode-overlay';
    overlay.className = 'meeting-overlay';
    
    document.body.appendChild(overlay);
    renderMeetingMode(company, overlay);
  }
}

