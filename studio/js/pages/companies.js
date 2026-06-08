/* Companies Page View */

import { db } from '../state.js';
import { getIconHTML, formatDate, escapeHTML, showToast, openModal, closeModal } from '../utils.js';

let currentFilterStatus = 'all';
let currentFilterStage = 'all';
let currentSearchQuery = '';

/**
 * Renders the companies listing view
 * @param {HTMLElement} viewport 
 * @param {URLSearchParams} params 
 */
export default function renderCompanies(viewport, params) {
  document.getElementById('topbar-title').innerText = 'Companies';
  document.getElementById('workspace-indicator').style.display = 'none';

  // Support incoming filter from query params (e.g. from dashboard KPI click)
  const filterParam = params.get('filterStatus');
  if (filterParam) {
    currentFilterStatus = filterParam;
  }

  renderLayout(viewport);
  bindEvents(viewport);
}

function renderLayout(viewport) {
  const companies = db.getCompanies();

  // Filter & Search Logic
  const filtered = companies.filter(c => {
    const matchesStatus = currentFilterStatus === 'all' || c.status === currentFilterStatus;
    const matchesStage = currentFilterStage === 'all' || c.stage === currentFilterStage;
    
    const term = currentSearchQuery.toLowerCase();
    const matchesSearch = !term || 
      c.name.toLowerCase().includes(term) || 
      c.industry.toLowerCase().includes(term) ||
      (c.description && c.description.toLowerCase().includes(term));
      
    return matchesStatus && matchesStage && matchesSearch;
  });

  const stages = ['Discovery', 'Assessment', 'Insights', 'System Ideas', 'Projects', 'Reports'];

  viewport.innerHTML = `
    <!-- Action controls header -->
    <div class="flex-between" style="margin-bottom: 20px; gap: 16px; flex-wrap: wrap;">
      
      <!-- Filters and Search -->
      <div class="flex-row" style="gap: 12px; flex-wrap: wrap; flex-grow: 1;">
        <!-- Search bar -->
        <div style="position: relative; min-width: 240px;">
          <input type="text" id="company-search" class="input-control" placeholder="Search name, industry..." value="${escapeHTML(currentSearchQuery)}" style="padding-left: 36px;">
          <span style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">
            ${getIconHTML('search', 'width:16px; height:16px;')}
          </span>
        </div>
        
        <!-- Status Filter -->
        <select id="filter-status" class="select-control" style="width: auto; height: 38px;">
          <option value="all" ${currentFilterStatus === 'all' ? 'selected' : ''}>All Statuses</option>
          <option value="active" ${currentFilterStatus === 'active' ? 'selected' : ''}>Active</option>
          <option value="lead" ${currentFilterStatus === 'lead' ? 'selected' : ''}>Lead</option>
          <option value="inactive" ${currentFilterStatus === 'inactive' ? 'selected' : ''}>Inactive</option>
        </select>
        
        <!-- Stage Filter -->
        <select id="filter-stage" class="select-control" style="width: auto; height: 38px;">
          <option value="all" ${currentFilterStage === 'all' ? 'selected' : ''}>All Stages</option>
          ${stages.map(st => `
            <option value="${st}" ${currentFilterStage === st ? 'selected' : ''}>${st}</option>
          `).join('')}
        </select>
      </div>

      <!-- Add Company Button -->
      <button id="btn-add-company" class="btn btn-primary">
        ${getIconHTML('plus')} Onboard Company
      </button>

    </div>

    <!-- Companies Count Display -->
    <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
      Showing ${filtered.length} of ${companies.length} companies
    </div>

    <!-- Companies Grid -->
    ${filtered.length === 0 ? `
      <div class="card" style="text-align: center; padding: 40px; color: var(--text-muted)">
        ${getIconHTML('building-2', 'width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.5;')}
        <h3>No Companies Found</h3>
        <p style="margin-top: 4px;">Adjust filters or onboard a new company to get started.</p>
      </div>
    ` : `
      <div class="grid-cols-3">
        ${filtered.map(comp => {
          let badgeClass = 'badge-info';
          if (comp.status === 'active') badgeClass = 'badge-success';
          if (comp.status === 'inactive') badgeClass = 'badge-danger';
          if (comp.status === 'lead') badgeClass = 'badge-warning';

          return `
            <div class="card flex-column" style="margin-bottom: 0; justify-content: space-between; min-height: 240px;">
              <div>
                <!-- Company Header -->
                <div class="flex-between" style="align-items: flex-start;">
                  <h3 style="font-size: 16px; font-weight: 600;">
                    <a href="#/workspace?id=${comp.id}">${escapeHTML(comp.name)}</a>
                  </h3>
                  <span class="badge ${badgeClass}">${comp.status}</span>
                </div>
                
                <!-- Industry & Web -->
                <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  ${escapeHTML(comp.industry)} ${comp.website ? `• <a href="${escapeHTML(comp.website)}" target="_blank" rel="noopener" style="color:var(--text-muted)">${comp.website.replace('https://', '')}</a>` : ''}
                </div>
                
                <!-- Description -->
                <p style="font-size: 13px; color: var(--text-secondary); margin-top: 12px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">
                  ${escapeHTML(comp.description || 'No description provided.')}
                </p>
              </div>

              <!-- Footer Metadata and Actions -->
              <div style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 12px;">
                <div class="flex-between">
                  <div style="font-size: 11px; color: var(--text-muted)">
                    Stage: <span class="badge badge-info" style="font-size: 9px; padding: 0px 6px;">${comp.stage}</span>
                  </div>
                  
                  <div class="flex-row" style="gap: 6px;">
                    <button class="btn-icon btn-delete-company" data-id="${comp.id}" title="Remove Company" style="color: var(--color-danger)">
                      ${getIconHTML('trash')}
                    </button>
                    <a href="#/workspace?id=${comp.id}" class="btn btn-secondary" style="padding: 6px 12px; font-size:12px;">
                      Open Workspace ${getIconHTML('arrow-right', 'width: 14px; height: 14px;')}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}
  `;
}

function bindEvents(viewport) {
  // Search
  const searchInput = viewport.querySelector('#company-search');
  searchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value;
    renderLayout(viewport);
    // Bind deletes and creations again
    bindEvents(viewport);
  });

  // Status Filter
  const filterStatus = viewport.querySelector('#filter-status');
  filterStatus.addEventListener('change', (e) => {
    currentFilterStatus = e.target.value;
    renderLayout(viewport);
    bindEvents(viewport);
  });

  // Stage Filter
  const filterStage = viewport.querySelector('#filter-stage');
  filterStage.addEventListener('change', (e) => {
    currentFilterStage = e.target.value;
    renderLayout(viewport);
    bindEvents(viewport);
  });

  // Open Add Company Modal
  const btnAdd = viewport.querySelector('#btn-add-company');
  btnAdd.addEventListener('click', () => {
    const modalBody = `
      <form id="form-onboard-company" class="flex-column">
        <div class="form-group">
          <label for="company-name">Company Name *</label>
          <input type="text" id="company-name" class="input-control" required placeholder="e.g. Acme Corp">
        </div>
        <div class="grid-cols-2">
          <div class="form-group">
            <label for="company-industry">Industry *</label>
            <input type="text" id="company-industry" class="input-control" required placeholder="e.g. Logistics">
          </div>
          <div class="form-group">
            <label for="company-website">Website URL</label>
            <input type="url" id="company-website" class="input-control" placeholder="https://example.com">
          </div>
        </div>
        <div class="grid-cols-2">
          <div class="form-group">
            <label for="company-contact-name">Primary Contact Name</label>
            <input type="text" id="company-contact-name" class="input-control" placeholder="e.g. John Doe">
          </div>
          <div class="form-group">
            <label for="company-contact-email">Contact Email</label>
            <input type="email" id="company-contact-email" class="input-control" placeholder="john@example.com">
          </div>
        </div>
        <div class="grid-cols-2">
          <div class="form-group">
            <label for="company-status">Status</label>
            <select id="company-status" class="select-control">
              <option value="active">Active Engagement</option>
              <option value="lead" selected>Lead</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div class="form-group">
            <label for="company-stage">Engagement Stage</label>
            <select id="company-stage" class="select-control">
              <option value="Discovery" selected>Discovery</option>
              <option value="Assessment">Assessment</option>
              <option value="Insights">Insights</option>
              <option value="System Ideas">System Ideas</option>
              <option value="Projects">Projects</option>
              <option value="Reports">Reports</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label for="company-desc">Overview Description</label>
          <textarea id="company-desc" class="textarea-control" placeholder="Brief outline of company background, goals, and focus..."></textarea>
        </div>
      </form>
    `;
    const modalFooter = `
      <button class="btn btn-secondary" id="modal-cancel-company">Cancel</button>
      <button class="btn btn-primary" id="modal-save-company">Onboard Account</button>
    `;

    openModal('Onboard New Company', modalBody, modalFooter);

    // Bind modal actions
    document.getElementById('modal-cancel-company').addEventListener('click', closeModal);
    document.getElementById('modal-save-company').addEventListener('click', () => {
      const form = document.getElementById('form-onboard-company');
      if (form.reportValidity()) {
        const newComp = {
          name: document.getElementById('company-name').value,
          industry: document.getElementById('company-industry').value,
          website: document.getElementById('company-website').value,
          contactName: document.getElementById('company-contact-name').value,
          contactEmail: document.getElementById('company-contact-email').value,
          status: document.getElementById('company-status').value,
          stage: document.getElementById('company-stage').value,
          description: document.getElementById('company-desc').value
        };

        db.addCompany(newComp);
        closeModal();
        showToast(`Successfully onboarded ${newComp.name}`, 'success');
        
        // Reload list view
        renderLayout(viewport);
        bindEvents(viewport);
      }
    });
  });

  // Delete Company Event
  viewport.querySelectorAll('.btn-delete-company').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = e.target.closest('.btn-delete-company').getAttribute('data-id');
      const comp = db.getCompany(id);
      
      if (confirm(`Are you absolutely sure you want to delete "${comp.name}"?\nThis will permanently delete all associated Discovery Notes, Insights, System Ideas, Projects, and Reports. This action CANNOT be undone.`)) {
        db.deleteCompany(id);
        showToast(`Deleted company "${comp.name}" and all nested data`, 'warning');
        renderLayout(viewport);
        bindEvents(viewport);
      }
    });
  });
}
