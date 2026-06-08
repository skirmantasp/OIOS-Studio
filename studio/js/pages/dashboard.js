/* Dashboard Page View */

import { db } from '../state.js';
import { getIconHTML, formatDate, escapeHTML, showToast, openDrawer, closeDrawer, refreshIcons } from '../utils.js';

/**
 * Renders the dashboard in the viewport container
 * @param {HTMLElement} viewport 
 * @param {URLSearchParams} params 
 */
export default function renderDashboard(viewport, params) {
  document.getElementById('workspace-indicator').style.display = 'none';

  const companies = db.getCompanies();
  const projects = db.getProjects();
  const systemIdeas = db.getSystemIdeas();
  const reports = db.getReports();
  const nextActions = db.getNextActions();

  // 1. Calculate Metrics
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.status === 'active').length;
  const activeProjectsCount = projects.filter(p => p.status === 'in_progress').length;
  const highPriorityIdeasCount = systemIdeas.filter(i => i.priority === 'high' && i.status !== 'rejected').length;

  // 2. Stage Breakdown Calculations
  const stages = ['Discovery', 'Assessment', 'Insights', 'System Ideas', 'Projects', 'Reports'];
  const stageCounts = {};
  stages.forEach(s => stageCounts[s] = 0);
  companies.forEach(c => {
    if (stageCounts[c.stage] !== undefined) {
      stageCounts[c.stage]++;
    }
  });

  // Render Layout
  viewport.innerHTML = `
    <!-- Top KPI Grid -->
    <div class="metric-grid">
      <div class="metric-card clickable" id="kpi-total-companies" title="View all companies">
        <div class="metric-label">Total Companies</div>
        <div class="metric-value">${totalCompanies}</div>
        <div class="metric-footer">${getIconHTML('building-2')} Active Workspace Targets ${getIconHTML('arrow-right')}</div>
      </div>
      <div class="metric-card clickable" id="kpi-active-accounts" title="View active companies">
        <div class="metric-label">Active Accounts</div>
        <div class="metric-value" style="color: var(--color-success)">${activeCompanies}</div>
        <div class="metric-footer">${getIconHTML('check-circle')} Engagement Active ${getIconHTML('arrow-right')}</div>
      </div>
      <div class="metric-card clickable" id="kpi-running-projects" title="View running projects">
        <div class="metric-label">Running Projects</div>
        <div class="metric-value" style="color: var(--color-info)">${activeProjectsCount}</div>
        <div class="metric-footer">${getIconHTML('activity')} Systems Implementing ${getIconHTML('arrow-right')}</div>
      </div>
      <div class="metric-card clickable" id="kpi-high-priority-ideas" title="View high-priority ideas">
        <div class="metric-label">High-Priority Ideas</div>
        <div class="metric-value" style="color: var(--color-warning)">${highPriorityIdeasCount}</div>
        <div class="metric-footer">${getIconHTML('zap')} Awaiting Action ${getIconHTML('arrow-right')}</div>
      </div>
    </div>

    <!-- Middle Split: Stages & Next Actions -->
    <div class="grid-cols-2" style="margin-bottom: 20px;">
      
      <!-- Company Stage Progression -->
      <div class="card">
        <h3 class="card-title">Companies By Stage</h3>
        <div class="flex-column" style="gap: 16px; margin-top: 12px;">
          ${stages.map(stage => {
            const count = stageCounts[stage];
            const percent = totalCompanies > 0 ? (count / totalCompanies) * 100 : 0;
            return `
              <div class="dashboard-stage-item clickable" data-stage="${stage}" title="View companies in ${stage} stage">
                <div class="flex-between" style="font-size: 13px; margin-bottom: 4px;">
                  <span style="font-weight: 500;">${stage}</span>
                  <span style="font-family: var(--font-mono); font-weight: 600; color: var(--text-secondary)">${count}</span>
                </div>
                <div style="height: 6px; background-color: var(--bg-tertiary); border-radius: 3px; overflow: hidden;">
                  <div style="height: 100%; width: ${percent}%; background-color: var(--color-info); border-radius: 3px; transition: width 0.5s ease;"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Next Actions Checklist -->
      <div class="card" id="todo-container-card">
        <div class="flex-between" style="margin-bottom: 12px;">
          <h3 class="card-title" style="margin-bottom: 0;">Next Actions</h3>
          <span class="badge badge-info" style="font-size:10px;">${nextActions.filter(t => !t.completed).length} pending</span>
        </div>
        
        <div id="todo-list" style="max-height: 220px; overflow-y: auto; margin-bottom: 12px;">
          ${nextActions.length === 0 ? `
            <div style="text-align: center; color: var(--text-muted); padding: 20px 0;">
              No pending actions. Add one below to stay organized.
            </div>
          ` : nextActions.map(action => `
            <div class="todo-item" data-id="${action.id}">
              <div style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" class="todo-checkbox" ${action.completed ? 'checked' : ''}>
                <span class="todo-text ${action.completed ? 'done' : ''}">${escapeHTML(action.text)}</span>
              </div>
              <button class="btn-icon todo-delete" title="Delete Task" style="padding: 2px;">
                ${getIconHTML('trash', 'color-danger')}
              </button>
            </div>
          `).join('')}
        </div>

        <form id="todo-form" class="flex-row">
          <input type="text" id="todo-input" class="input-control" placeholder="Add custom action/reminder..." required style="flex-grow:1; padding: 6px 12px; font-size:13px;">
          <button type="submit" class="btn btn-primary" style="padding: 6px 12px; font-size:13px;">Add</button>
        </form>
      </div>

    </div>

    <!-- Bottom Split: Running Projects & Recent Activity -->
    <div class="grid-cols-2">
      
      <!-- Active Projects tracker -->
      <div class="card">
        <h3 class="card-title">Active Projects</h3>
        <div class="table-container" style="margin-top: 12px;">
          ${projects.filter(p => p.status === 'in_progress').length === 0 ? `
            <div style="color: var(--text-muted); padding: 12px 0;">No active projects in execution phase.</div>
          ` : `
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Company</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                ${projects.filter(p => p.status === 'in_progress').map(proj => {
                  const comp = db.getCompany(proj.companyId);
                  return `
                    <tr>
                      <td>
                        <a href="#/workspace?id=${proj.companyId}&tab=Projects" style="font-weight: 500; font-family: var(--font-mono);">
                          ${escapeHTML(proj.title)}
                        </a>
                      </td>
                      <td>${escapeHTML(comp ? comp.name : 'Unknown')}</td>
                      <td>
                        <div class="flex-row" style="gap: 8px;">
                          <div style="width: 60px; height: 6px; background-color: var(--bg-tertiary); border-radius: 3px; overflow: hidden; display:inline-block;">
                            <div style="height: 100%; width: ${proj.progress}%; background-color: var(--color-success); border-radius: 3px;"></div>
                          </div>
                          <span style="font-family: var(--font-mono); font-size: 11px;">${proj.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>

      <!-- High-Priority Ideas & Recent Reports -->
      <div class="card">
        <h3 class="card-title">Recent Intelligence Reports</h3>
        <div class="flex-column" style="gap: 10px; margin-top: 12px;">
          ${reports.length === 0 ? `
            <div style="color: var(--text-muted); padding: 8px 0;">No reports created yet.</div>
          ` : reports.slice(-3).reverse().map(rep => {
            const comp = db.getCompany(rep.companyId);
            return `
              <div class="flex-between" style="padding: 10px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background-color: var(--bg-primary);">
                <div>
                  <a href="#/reports" style="font-weight: 500; font-size: 13px;">${escapeHTML(rep.title)}</a>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                    ${escapeHTML(comp ? comp.name : 'Global')} • Created ${formatDate(rep.createdAt)}
                  </div>
                </div>
                <span class="badge ${rep.status === 'finalized' ? 'badge-success' : 'badge-neutral'}">${rep.status}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

    </div>
  `;

  // Bind Next Actions list interactivity
  bindTodoEvents(viewport);

  // Bind KPI card click navigation
  bindKpiCardEvents(viewport);

  // Bind Stage row click navigation
  bindStageEvents(viewport);
}

/**
 * Binds click handlers to KPI metric cards
 */
function bindKpiCardEvents(container) {
  // 1. Total Companies → navigate to Companies page
  const totalCard = container.querySelector('#kpi-total-companies');
  if (totalCard) {
    totalCard.addEventListener('click', () => {
      window.location.hash = '#/companies';
    });
  }

  // 2. Active Accounts → navigate to Companies page filtered to active
  const activeCard = container.querySelector('#kpi-active-accounts');
  if (activeCard) {
    activeCard.addEventListener('click', () => {
      window.location.hash = '#/companies?filterStatus=active';
    });
  }

  // 3. Running Projects → open drawer with active project list
  const projectsCard = container.querySelector('#kpi-running-projects');
  if (projectsCard) {
    projectsCard.addEventListener('click', () => {
      const activeProjects = db.getProjects().filter(p => p.status === 'in_progress');

      if (activeProjects.length === 0) {
        showToast('No running projects', 'info');
        return;
      }

      const bodyHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${activeProjects.map(proj => {
            const comp = db.getCompany(proj.companyId);
            const compName = comp ? escapeHTML(comp.name) : 'Unknown';
            return `
              <div style="padding:12px; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-primary);">
                <div style="font-weight:600; color:var(--text-primary); margin-bottom:4px;">${escapeHTML(proj.title)}</div>
                <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">${compName}</div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                  <span class="badge badge-info">${proj.status.replace('_', ' ')}</span>
                  <div style="flex:1; height:6px; background:var(--bg-tertiary); border-radius:3px; overflow:hidden;">
                    <div style="height:100%; width:${proj.progress}%; background:var(--color-success); border-radius:3px;"></div>
                  </div>
                  <span style="font-family:var(--font-mono); font-size:11px; color:var(--text-secondary);">${proj.progress}%</span>
                </div>
                <a href="#/workspace?id=${proj.companyId}&tab=Projects" class="btn btn-secondary" style="padding:4px 10px; font-size:12px;">
                  ${getIconHTML('external-link')} Open Project
                </a>
              </div>
            `;
          }).join('')}
        </div>
      `;

      openDrawer('Running Projects', bodyHTML);
      refreshIcons();
    });
  }

  // 4. High-Priority Ideas → open drawer with high-priority ideas list
  const ideasCard = container.querySelector('#kpi-high-priority-ideas');
  if (ideasCard) {
    ideasCard.addEventListener('click', () => {
      const highPriorityIdeas = db.getSystemIdeas().filter(i => i.priority === 'high' && i.status !== 'rejected');

      if (highPriorityIdeas.length === 0) {
        showToast('No high-priority ideas', 'info');
        return;
      }

      const bodyHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${highPriorityIdeas.map(idea => {
            const comp = db.getCompany(idea.companyId);
            const compName = comp ? escapeHTML(comp.name) : 'Unknown';
            const statusBadge = idea.status === 'approved' ? 'badge-success'
              : idea.status === 'refining' ? 'badge-warning'
              : 'badge-neutral';
            return `
              <div style="padding:12px; border:1px solid var(--border-color); border-radius:var(--radius-sm); background:var(--bg-primary);">
                <div style="font-weight:600; color:var(--text-primary); margin-bottom:4px;">${escapeHTML(idea.title)}</div>
                <div style="font-size:12px; color:var(--text-muted); margin-bottom:8px;">${compName}</div>
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
                  <span class="badge badge-warning">high priority</span>
                  <span class="badge ${statusBadge}">${idea.status}</span>
                </div>
                <div style="font-size:12px; color:var(--text-secondary); margin-bottom:8px; line-height:1.4;">${escapeHTML(idea.description).substring(0, 120)}${idea.description.length > 120 ? '...' : ''}</div>
                <a href="#/workspace?id=${idea.companyId}&tab=System Ideas" class="btn btn-secondary" style="padding:4px 10px; font-size:12px;">
                  ${getIconHTML('external-link')} Open Idea
                </a>
              </div>
            `;
          }).join('')}
        </div>
      `;

      openDrawer('High-Priority System Ideas', bodyHTML);
      refreshIcons();
    });
  }
}

/**
 * Binds interactivity to the Todo checklist
 * @param {HTMLElement} container 
 */
function bindTodoEvents(container) {
  const form = container.querySelector('#todo-form');
  const input = container.querySelector('#todo-input');
  
  // Submit new task
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (text) {
      db.addNextAction(text);
      showToast('Action item added', 'success');
      // Re-render dashboard page
      renderDashboard(container);
    }
  });

  // Toggle checklist checkboxes
  container.querySelectorAll('.todo-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const todoItem = e.target.closest('.todo-item');
      const id = todoItem.getAttribute('data-id');
      db.toggleNextAction(id);
      
      const textSpan = todoItem.querySelector('.todo-text');
      if (e.target.checked) {
        textSpan.classList.add('done');
        showToast('Task marked as completed', 'success');
      } else {
        textSpan.classList.remove('done');
      }
      
      // Dynamic updates to the badge count
      const activeCount = db.getNextActions().filter(t => !t.completed).length;
      container.querySelector('#todo-container-card .badge-info').innerText = `${activeCount} pending`;
    });
  });

  // Delete task
  container.querySelectorAll('.todo-delete').forEach(button => {
    button.addEventListener('click', (e) => {
      const todoItem = e.target.closest('.todo-item');
      const id = todoItem.getAttribute('data-id');
      db.deleteNextAction(id);
      showToast('Action item removed', 'warning');
      renderDashboard(container);
    });
  });
}

/**
 * Binds click events to Company By Stage list items
 */
function bindStageEvents(container) {
  container.querySelectorAll('.dashboard-stage-item.clickable').forEach(item => {
    item.addEventListener('click', () => {
      const stage = item.getAttribute('data-stage');
      const companies = db.getCompanies().filter(c => c.stage === stage);

      if (companies.length === 0) {
        showToast(`No companies in ${stage} stage`, 'info');
        return;
      }

      // Compile body HTML for the side drawer
      const bodyHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
          ${companies.map(comp => {
            let badgeClass = 'badge-info';
            if (comp.status === 'active') badgeClass = 'badge-success';
            if (comp.status === 'inactive') badgeClass = 'badge-danger';
            if (comp.status === 'lead') badgeClass = 'badge-warning';

            return `
              <div style="padding:14px; border:1px solid var(--border-color); border-radius:var(--radius-md); background:var(--bg-primary); display:flex; flex-direction:column; gap:8px;">
                <div class="flex-between">
                  <h4 style="font-size:15px; font-weight:600; color:var(--text-primary); margin:0;">${escapeHTML(comp.name)}</h4>
                  <span class="badge ${badgeClass}">${comp.status}</span>
                </div>
                <div style="font-family:var(--font-mono); font-size:11px; color:var(--text-muted);">
                  ${escapeHTML(comp.industry)}
                </div>
                ${comp.description ? `
                  <p style="font-size:12px; color:var(--text-secondary); margin:4px 0 8px 0; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                    ${escapeHTML(comp.description)}
                  </p>
                ` : ''}
                <div style="margin-top:4px;">
                  <a href="#/workspace?id=${comp.id}&tab=${encodeURIComponent(stage)}" class="btn btn-secondary drawer-workspace-link" style="padding:6px 12px; font-size:12px; display:inline-flex; align-items:center; gap:6px;">
                    ${getIconHTML('external-link', 'width:12px; height:12px;')} Open Stage Workspace
                  </a>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      openDrawer(`Companies in ${stage} Stage`, bodyHTML);
      refreshIcons();

      // Bind dynamic click events to close the drawer on navigation
      const drawer = document.getElementById('app-drawer');
      if (drawer) {
        drawer.querySelectorAll('.drawer-workspace-link').forEach(link => {
          link.addEventListener('click', () => {
            closeDrawer();
          });
        });
      }
    });
  });
}

