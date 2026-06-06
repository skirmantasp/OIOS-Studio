/* Company Workspace Page View */

import { db } from '../state.js';
import { getIconHTML, formatDate, escapeHTML, parseMarkdown, showToast, openModal, closeModal, openDrawer, closeDrawer } from '../utils.js';

/**
 * Main renderer for Company Workspace page
 * @param {HTMLElement} viewport 
 * @param {URLSearchParams} params 
 */
export default function renderWorkspace(viewport, params) {
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

function openDiscoveryNoteDrawer(company, noteId, container) {
  const note = db.getDiscoveryNote(noteId);
  if (!note) return;

  const bodyHTML = `
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
      openDiscoveryNoteDrawer(company, note.id, container);
    });
  });
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
      <button id="btn-add-insight" class="btn btn-primary">
        ${getIconHTML('plus')} Extract Insight
      </button>
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
}

function openInsightDrawer(company, insId, container) {
  const insight = db.getInsight(insId);
  if (!insight) return;

  const sourceNotes = insight.sourceNotes.map(nId => db.getDiscoveryNote(nId)).filter(n => !!n);

  let impBadge = 'badge-info';
  if (insight.impact === 'high') impBadge = 'badge-danger';
  if (insight.impact === 'medium') impBadge = 'badge-warning';

  const bodyHTML = `
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
      openInsightDrawer(company, insight.id, container);
    });
  });

  // Action links inside Drawer: Click source note -> open note drawer
  const drawerBody = document.getElementById('drawer-body-content');
  drawerBody.querySelectorAll('.btn-goto-note').forEach(btn => {
    btn.addEventListener('click', () => {
      const noteId = btn.getAttribute('data-note-id');
      closeDrawer();
      openDiscoveryNoteDrawer(company, noteId, container);
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
      <button id="btn-add-idea" class="btn btn-primary">
        ${getIconHTML('plus')} Formulate System Idea
      </button>
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

  // Trigger Formulate System Idea Modal
  container.querySelector('#btn-add-idea').addEventListener('click', () => {
    openIdeaFormModal(company, null, () => {
      renderSystemIdeasTab(company, container);
    });
  });
}

function openIdeaDrawer(company, ideaId, container) {
  const idea = db.getSystemIdea(ideaId);
  if (!idea) return;

  const linkedInsights = idea.linkedInsights.map(iId => db.getInsight(iId)).filter(i => !!i);

  let priBadge = 'badge-info';
  if (idea.priority === 'high') priBadge = 'badge-danger';
  if (idea.priority === 'medium') priBadge = 'badge-warning';

  const bodyHTML = `
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
          <span style="display:inline-block; font-weight:600; margin-top:2px; text-transform:uppercase;">${idea.status}</span>
        </div>
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
      openIdeaDrawer(company, idea.id, container);
    });
  });

  const drawerBody = document.getElementById('drawer-body-content');
  drawerBody.querySelectorAll('.btn-goto-insight').forEach(btn => {
    btn.addEventListener('click', () => {
      const insId = btn.getAttribute('data-insight-id');
      closeDrawer();
      openInsightDrawer(company, insId, container);
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

function openProjectDrawer(company, projId, container) {
  let proj = db.getProject(projId);
  if (!proj) return;

  if (db && typeof db.ensureProjectMilestones === 'function') {
    proj = db.ensureProjectMilestones(projId) || proj;
  }

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
      openProjectDrawer(company, proj.id, container);
    });
  });

  const drawerBody = document.getElementById('drawer-body-content');
  
  // Bind milestone checkboxes
  drawerBody.querySelectorAll('.ms-checkbox').forEach(cb => {
    cb.addEventListener('change', () => {
      const msId = cb.getAttribute('data-ms-id');
      if (db && typeof db.toggleMilestone === 'function') {
        db.toggleMilestone(proj.id, msId);
      }
      renderProjectsTab(company, container);
      openProjectDrawer(company, proj.id, container);
    });
  });

  // Bind Traceability Chain navigation triggers
  drawerBody.querySelectorAll('.btn-goto-idea').forEach(btn => {
    btn.addEventListener('click', () => {
      const ideaId = btn.getAttribute('data-idea-id');
      closeDrawer();
      openIdeaDrawer(company, ideaId, container);
    });
  });

  drawerBody.querySelectorAll('.btn-goto-insight').forEach(btn => {
    btn.addEventListener('click', () => {
      const insId = btn.getAttribute('data-insight-id');
      closeDrawer();
      openInsightDrawer(company, insId, container);
    });
  });

  drawerBody.querySelectorAll('.btn-goto-note').forEach(btn => {
    btn.addEventListener('click', () => {
      const noteId = btn.getAttribute('data-note-id');
      closeDrawer();
      openDiscoveryNoteDrawer(company, noteId, container);
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
  const ideas = db.getSystemIdeas(company.id).filter(id => id.status === 'approved' || id.status === 'refining');

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
  slider.addEventListener('input', (e) => {
    sliderNum.innerText = `${e.target.value}%`;
  });

  document.getElementById('modal-cancel-proj').addEventListener('click', closeModal);
  document.getElementById('modal-save-proj').addEventListener('click', () => {
    const form = document.getElementById('form-project-launch');
    if (form.reportValidity()) {
      const selectedIdeas = [];
      document.querySelectorAll('.proj-idea-checkbox:checked').forEach(cb => {
        selectedIdeas.push(cb.value);
      });

      const data = {
        companyId: company.id,
        title: document.getElementById('proj-title').value,
        status: document.getElementById('proj-status').value,
        progress: parseInt(document.getElementById('proj-progress').value) || 0,
        startDate: document.getElementById('proj-start').value,
        endDate: document.getElementById('proj-end').value,
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

        <div style="border-top:1px solid var(--border-color); padding-top:12px; display:flex; align-items:center; gap:16px;">
          <span style="font-size:12px; color:var(--text-muted); font-family:var(--font-mono);">OVERALL</span>
          <div style="flex:1; height:6px; background:var(--bg-tertiary); border-radius:3px; overflow:hidden;">
            <div style="height:100%; width:${c.overall}%; background:${completenessBarColor(c.overall)}; border-radius:3px; transition:width 0.3s ease;"></div>
          </div>
          <span style="font-size:16px; font-weight:700; font-family:var(--font-mono); color:${completenessBarColor(c.overall)};">${c.overall}%</span>
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

  // ---- Full Page Render ----
  container.innerHTML = `
    <div class="flex-column" style="gap:20px;">

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
