/* Reports Page View & Builder Controller */

import { db } from '../state.js';
import { getIconHTML, formatDate, escapeHTML, parseMarkdown, showToast } from '../utils.js';

/**
 * Main renderer for Reports page
 * @param {HTMLElement} viewport 
 * @param {URLSearchParams} params 
 */
export default function renderReports(viewport, params) {
  document.getElementById('workspace-indicator').style.display = 'none';

  const companyId = params.get('companyId');
  const openId = params.get('openId');

  if (openId) {
    // 1. Report Viewer
    renderReportViewer(viewport, openId);
  } else if (companyId) {
    // 2. Report Builder
    renderReportBuilder(viewport, companyId);
  } else {
    // 3. Global Reports Listing
    renderReportsList(viewport);
  }
}

// ==========================================
// 1. REPORTS LIST VIEW
// ==========================================
function renderReportsList(viewport) {
  const reports = db.getReports();
  const companies = db.getCompanies();

  viewport.innerHTML = `
    <div class="flex-between" style="margin-bottom: 20px;">
      <div style="font-size:13px; color:var(--text-secondary)">
        Global document store for finalized client dossiers and analysis.
      </div>
      
      <div class="flex-row">
        <!-- Quick builder select -->
        <select id="builder-select-company" class="select-control" style="width: auto; height: 38px;">
          <option value="">Select Company for Report...</option>
          ${companies.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('')}
        </select>
        <button id="btn-launch-builder" class="btn btn-primary" disabled>
          ${getIconHTML('file-plus-2')} Open Report Builder
        </button>
      </div>
    </div>

    <!-- Reports Grid/List -->
    <div class="card" style="margin-bottom:0;">
      <h3 class="card-title">Generated Architecture Reports</h3>
      <div class="table-container" style="margin-top:12px;">
        ${reports.length === 0 ? `
          <div style="text-align: center; color: var(--text-muted); padding: 40px 0;">
            ${getIconHTML('file-bar-chart-2', 'width: 48px; height: 48px; margin-bottom: 12px; opacity:0.5;')}
            <h3>No Reports Available</h3>
            <p style="margin-top:4px;">Use the dropdown above to select a company and compile a report.</p>
          </div>
        ` : `
          <table>
            <thead>
              <tr>
                <th>Date Compiled</th>
                <th>Report Title</th>
                <th>Company Workspace</th>
                <th>Status</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${reports.map(rep => {
                const comp = db.getCompany(rep.companyId);
                return `
                  <tr class="clickable-report-row" data-id="${rep.id}" style="cursor:pointer;">
                    <td style="font-family: var(--font-mono); font-size:12px;">${formatDate(rep.createdAt)}</td>
                    <td><strong style="color:var(--text-primary);">${escapeHTML(rep.title)}</strong></td>
                    <td>${escapeHTML(comp ? comp.name : 'Global / Cross-Portfolio')}</td>
                    <td><span class="badge ${rep.status === 'finalized' ? 'badge-success' : 'badge-neutral'}">${rep.status}</span></td>
                    <td style="text-align:right;" class="no-click-actions">
                      <a href="#/reports?openId=${rep.id}" class="btn btn-secondary" style="padding:4px 8px; font-size:12px;">Open</a>
                      <button class="btn-icon btn-delete-report" data-id="${rep.id}" title="Delete Report" style="color:var(--color-danger)">${getIconHTML('trash')}</button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}
      </div>
    </div>
  `;

  // Bind dropdown & builder launch button
  const select = viewport.querySelector('#builder-select-company');
  const launchBtn = viewport.querySelector('#btn-launch-builder');
  
  select.addEventListener('change', () => {
    launchBtn.disabled = !select.value;
  });

  launchBtn.addEventListener('click', () => {
    if (select.value) {
      window.location.hash = `#/reports?companyId=${select.value}`;
    }
  });

  // Row selection
  viewport.querySelectorAll('.clickable-report-row').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('.no-click-actions')) return;
      const repId = row.getAttribute('data-id');
      window.location.hash = `#/reports?openId=${repId}`;
    });
  });

  // Delete Report
  viewport.querySelectorAll('.btn-delete-report').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const rep = db.getReport(id);
      if (confirm(`Are you sure you want to delete report "${rep.title}"?`)) {
        db.deleteReport(id);
        showToast('Report deleted', 'warning');
        renderReportsList(viewport);
      }
    });
  });
}

// ==========================================
// 2. REPORT BUILDER VIEW
// ==========================================
function renderReportBuilder(viewport, companyId) {
  const company = db.getCompany(companyId);
  if (!company) {
    viewport.innerHTML = `<div class="card">Company not found.</div>`;
    return;
  }

  const notes = db.getDiscoveryNotes(companyId);
  const insights = db.getInsights(companyId);
  const ideas = db.getSystemIdeas(companyId).filter(i => i.status === 'approved' || i.status === 'refining');
  const projects = db.getProjects(companyId);

  viewport.innerHTML = `
    <div style="margin-bottom: 20px;">
      <a href="#/workspace?id=${company.id}&tab=Reports" class="btn btn-secondary" style="margin-bottom: 12px;">
        ${getIconHTML('arrow-left')} Back to Workspace
      </a>
      <h2 style="font-size:22px; font-weight:700;">Executive Report Builder</h2>
      <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">Compiling intelligence files for <strong>${escapeHTML(company.name)}</strong>.</p>
    </div>

    <div class="grid-cols-3">
      
      <!-- Builder Controls Form -->
      <div class="card flex-column" style="grid-column: span 2; margin-bottom:0;">
        <h3 class="card-title">Compilation Parameters</h3>
        
        <form id="form-report-builder" class="flex-column" style="gap:16px;">
          <div class="form-group">
            <label for="rep-title">Document Title *</label>
            <input type="text" id="rep-title" class="input-control" required value="${escapeHTML(company.name)}: Organizational Intelligence Architecture Report">
          </div>
          
          <div class="form-group">
            <label for="rep-summary">Executive Summary Overview (Brief description in Markdown/Text)</label>
            <textarea id="rep-summary" class="textarea-control" style="height: 120px;" placeholder="Summarize the core engagement and main objectives of the transformation recommendations..."></textarea>
          </div>

          <div style="border-top:1px solid var(--border-color); padding-top:12px;">
            <h4 style="font-size:12px; font-weight:600; color:var(--text-secondary); margin-bottom:8px; text-transform:uppercase; font-family:var(--font-mono)">Include Target Assets</h4>
            
            <!-- 1. Discovery Notes -->
            <div style="margin-bottom:12px;">
              <strong style="font-size:12px; color:var(--text-primary)">Findings Appendix (Discovery Notes)</strong>
              <div class="link-selection-list" style="margin-top:6px;">
                ${notes.length === 0 ? `<div style="color:var(--text-muted); padding:4px; font-size:12px;">No notes captured.</div>` : notes.map(n => `
                  <label class="link-selection-item">
                    <input type="checkbox" class="build-note-cb" value="${n.id}" checked>
                    <span>${escapeHTML(n.title)} (${n.category})</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- 2. Insights -->
            <div style="margin-bottom:12px;">
              <strong style="font-size:12px; color:var(--text-primary)">Pillars Analysis (Extracted Insights)</strong>
              <div class="link-selection-list" style="margin-top:6px;">
                ${insights.length === 0 ? `<div style="color:var(--text-muted); padding:4px; font-size:12px;">No insights extracted.</div>` : insights.map(i => `
                  <label class="link-selection-item">
                    <input type="checkbox" class="build-insight-cb" value="${i.id}" checked>
                    <span>${escapeHTML(i.title)} (Impact: ${i.impact})</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- 3. System Ideas -->
            <div style="margin-bottom:12px;">
              <strong style="font-size:12px; color:var(--text-primary)">System Design Recommendations (System Ideas)</strong>
              <div class="link-selection-list" style="margin-top:6px;">
                ${ideas.length === 0 ? `<div style="color:var(--text-muted); padding:4px; font-size:12px;">No approved/refining system ideas formulated.</div>` : ideas.map(id => `
                  <label class="link-selection-item">
                    <input type="checkbox" class="build-idea-cb" value="${id.id}" checked>
                    <span>${escapeHTML(id.title)} (${id.status})</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- 4. Projects -->
            <div style="margin-bottom:12px;">
              <strong style="font-size:12px; color:var(--text-primary)">Transformation Roadmap (Projects)</strong>
              <div class="link-selection-list" style="margin-top:6px;">
                ${projects.length === 0 ? `<div style="color:var(--text-muted); padding:4px; font-size:12px;">No projects launched.</div>` : projects.map(p => `
                  <label class="link-selection-item">
                    <input type="checkbox" class="build-proj-cb" value="${p.id}" checked>
                    <span>${escapeHTML(p.title)} (Status: ${p.status})</span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>

          <div style="border-top:1px solid var(--border-color); padding-top:16px; display:flex; justify-content:flex-end;">
            <button type="submit" class="btn btn-primary">${getIconHTML('settings')} Compile & Finalize Dossier</button>
          </div>
        </form>
      </div>

      <!-- Builder Info Tip Card -->
      <div class="card flex-column" style="margin-bottom:0;">
        <h3 class="card-title">Compilation Info</h3>
        <p style="font-size:13px; color: var(--text-secondary); line-height: 1.5;">
          The report builder extracts structured data files from the selected company's database and compiles them into a cohesive Markdown document.
        </p>
        <div style="border-left: 3px solid var(--color-info); padding-left: 12px; font-size:12px; color: var(--text-muted); margin-top:10px;">
          The generated dossier is saved directly in local records under the company's reports history, allowing you to load, print, or review it anytime.
        </div>
      </div>

    </div>
  `;

  // Handle Form Submit (Compile Report)
  const form = viewport.querySelector('#form-report-builder');
  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = viewport.querySelector('#rep-title').value;
    const summary = viewport.querySelector('#rep-summary').value;

    // Compile Markdown Content
    let markdown = `# ${title}\n\n`;
    markdown += `**Company Target:** ${company.name}\n`;
    markdown += `**Industry:** ${company.industry}\n`;
    markdown += `**Lead Architect:** Organizational Intelligence Architect\n`;
    markdown += `**Date Compiled:** ${formatDate(new Date())}\n\n`;

    if (summary) {
      markdown += `## Executive Overview\n${summary}\n\n`;
    }

    // 1. Incorporate Assessment details
    const asm = company.assessment;
    if (asm && (asm.businessGoals || asm.coreProblems || asm.operationalBottlenecks || asm.techStack)) {
      markdown += `## 1. Architectural Assessment\n\n`;
      if (asm.businessGoals) markdown += `### Core Strategic Goals\n${asm.businessGoals}\n\n`;
      if (asm.coreProblems) markdown += `### Primary Pain Points\n${asm.coreProblems}\n\n`;
      if (asm.operationalBottlenecks) markdown += `### Operational Bottlenecks\n${asm.operationalBottlenecks}\n\n`;
      if (asm.techStack) markdown += `### Current Technology Stack\n${asm.techStack}\n\n`;
    }

    // 2. Incorporate Selected Insights
    const selectedInsIds = [];
    viewport.querySelectorAll('.build-insight-cb:checked').forEach(cb => selectedInsIds.push(cb.value));
    if (selectedInsIds.length > 0) {
      markdown += `## 2. Extracted Organizational Insights\n\n`;
      selectedInsIds.forEach(id => {
        const ins = db.getInsight(id);
        if (ins) {
          markdown += `### ${ins.title}\n`;
          markdown += `* **Pillar:** ${ins.category.toUpperCase()} | **Impact:** ${ins.impact.toUpperCase()}\n`;
          markdown += `* **Description:** ${ins.description}\n\n`;
        }
      });
    }

    // 3. Incorporate Selected System Ideas
    const selectedIdeaIds = [];
    viewport.querySelectorAll('.build-idea-cb:checked').forEach(cb => selectedIdeaIds.push(cb.value));
    if (selectedIdeaIds.length > 0) {
      markdown += `## 3. Recommended System Solutions\n\n`;
      selectedIdeaIds.forEach(id => {
        const idea = db.getSystemIdea(id);
        if (idea) {
          markdown += `### ${idea.title}\n`;
          markdown += `* **Feasibility:** ${idea.feasibility.toUpperCase()} | **Priority:** ${idea.priority.toUpperCase()}\n`;
          markdown += `* **Design Concept:** ${idea.description}\n\n`;
        }
      });
    }

    // 4. Incorporate Selected Projects
    const selectedProjIds = [];
    viewport.querySelectorAll('.build-proj-cb:checked').forEach(cb => selectedProjIds.push(cb.value));
    if (selectedProjIds.length > 0) {
      markdown += `## 4. Transformation Roadmap & Execution\n\n`;
      selectedProjIds.forEach(id => {
        const proj = db.getProject(id);
        if (proj) {
          markdown += `### Project: ${proj.title}\n`;
          markdown += `* **Execution Status:** ${proj.status.replace('_', ' ').toUpperCase()} | **Progress:** ${proj.progress}%\n`;
          markdown += `* **Timeline:** ${proj.startDate} to ${proj.endDate}\n`;
          markdown += `* **Strategy:** ${proj.description}\n\n`;
        }
      });
    }

    // 5. Append Discovery Notes Findings
    const selectedNoteIds = [];
    viewport.querySelectorAll('.build-note-cb:checked').forEach(cb => selectedNoteIds.push(cb.value));
    if (selectedNoteIds.length > 0) {
      markdown += `## Appendix: Raw Discovery Notes & Findings\n\n`;
      selectedNoteIds.forEach(id => {
        const note = db.getDiscoveryNote(id);
        if (note) {
          markdown += `### note: ${note.title}\n`;
          markdown += `* **Date Captured:** ${note.date} | **Category:** ${note.category}\n`;
          markdown += `* **Findings Notes:**\n${note.content}\n\n`;
        }
      });
    }

    // Save report in state database
    const newReport = db.addReport({
      companyId: company.id,
      title,
      summary: summary || title,
      content: markdown,
      status: 'finalized'
    });

    showToast('Dossier successfully compiled', 'success');
    window.location.hash = `#/reports?openId=${newReport.id}`;
  });
}

// ==========================================
// 3. REPORT VIEWER VIEW
// ==========================================
function renderReportViewer(viewport, openId) {
  const report = db.getReport(openId);
  if (!report) {
    viewport.innerHTML = `<div class="card">Report not found.</div>`;
    return;
  }

  const company = db.getCompany(report.companyId);

  viewport.innerHTML = `
    <!-- Top toolbar header: hidden during printing -->
    <div class="flex-between no-print" style="margin-bottom: 24px;">
      <div class="flex-row">
        <a href="#/workspace?id=${report.companyId || ''}&tab=Reports" class="btn btn-secondary">
          ${getIconHTML('arrow-left')} Back
        </a>
        <span class="badge ${report.status === 'finalized' ? 'badge-success' : 'badge-neutral'}">${report.status}</span>
      </div>

      <div class="flex-row" style="gap:8px;">
        <button id="btn-edit-compiled-report" class="btn btn-secondary">
          ${getIconHTML('edit-2')} Edit Content
        </button>
        <button id="btn-print-report" class="btn btn-primary">
          ${getIconHTML('printer')} Print Report / Export PDF
        </button>
      </div>
    </div>

    <!-- Main Dossier Container -->
    <div class="card" style="padding: 40px; margin-bottom: 0; min-height: 80vh; max-width:800px; margin: 0 auto; background: var(--bg-secondary);">
      <!-- Printable Document Wrapper -->
      <article id="dossier-print-content" class="markdown-body">
        ${parseMarkdown(report.content)}
      </article>

      <!-- Edit Textarea View (Hidden by default) -->
      <div id="dossier-edit-container" class="flex-column" style="display:none; margin-top:20px; border-top: 1px solid var(--border-color); padding-top:20px;">
        <h3 class="card-title">Manual Dossier Editor</h3>
        <textarea id="report-raw-editor" class="textarea-control" style="height: 450px; font-family: var(--font-mono); font-size:12px; line-height: 1.4;">${escapeHTML(report.content)}</textarea>
        <div class="flex-row" style="justify-content: flex-end; gap:8px;">
          <button id="btn-cancel-report-edit" class="btn btn-secondary">Cancel</button>
          <button id="btn-save-report-edit" class="btn btn-primary">${getIconHTML('save')} Save Updates</button>
        </div>
      </div>
    </div>
  `;

  // Bind print event
  viewport.querySelector('#btn-print-report').addEventListener('click', () => {
    window.print();
  });

  // Bind Editor Switcher
  const btnEdit = viewport.querySelector('#btn-edit-compiled-report');
  const btnPrint = viewport.querySelector('#btn-print-report');
  const displayArea = viewport.querySelector('#dossier-print-content');
  const editArea = viewport.querySelector('#dossier-edit-container');

  btnEdit.addEventListener('click', () => {
    if (editArea.style.display === 'none') {
      editArea.style.display = 'flex';
      displayArea.style.opacity = '0.3';
      btnEdit.classList.add('active');
    } else {
      editArea.style.display = 'none';
      displayArea.style.opacity = '1';
      btnEdit.classList.remove('active');
    }
  });

  viewport.querySelector('#btn-cancel-report-edit').addEventListener('click', () => {
    editArea.style.display = 'none';
    displayArea.style.opacity = '1';
    btnEdit.classList.remove('active');
  });

  viewport.querySelector('#btn-save-report-edit').addEventListener('click', () => {
    const updatedContent = viewport.querySelector('#report-raw-editor').value;
    db.updateReport(report.id, { content: updatedContent });
    
    // Re-parse and update print view
    displayArea.innerHTML = parseMarkdown(updatedContent);
    
    editArea.style.display = 'none';
    displayArea.style.opacity = '1';
    btnEdit.classList.remove('active');
    showToast('Report dossier updated successfully', 'success');
  });
}
