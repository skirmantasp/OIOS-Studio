/* Settings Page View */

import { db } from '../state.js';
import { getIconHTML, showToast, escapeHTML, refreshIcons } from '../utils.js';

/**
 * Renders the settings view in the viewport container
 * @param {HTMLElement} viewport 
 * @param {URLSearchParams} params 
 */
export default function renderSettings(viewport, params) {
  document.getElementById('topbar-title').innerText = 'Settings';
  document.getElementById('workspace-indicator').style.display = 'none';

  viewport.innerHTML = `
    <div class="grid-cols-2">
      
      <!-- Database Management Card -->
      <div class="card flex-column" style="margin-bottom:0;">
        <h3 class="card-title">Database Administration</h3>
        
        <p style="font-size:13px; color:var(--text-secondary); line-height: 1.5;">
          All data within OIOS Studio is stored client-side in the browser cache (localStorage) and synced with your cloud database.
        </p>

        <!-- Actions -->
        <div class="flex-column" style="gap:16px; margin-top:12px; border-top:1px solid var(--border-color); padding-top:16px;">
          
          <!-- Export -->
          <div>
            <strong>1. Backup Data (JSON Export)</strong>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">Download your entire workspace ledger as a text file.</div>
            <button id="btn-export-db" class="btn btn-secondary">
              ${getIconHTML('download')} Export Database Ledger
            </button>
          </div>

          <!-- Import -->
          <div>
            <strong>2. Restore Data (JSON Import)</strong>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">Upload a previously saved .json database file. WARNING: This replaces all current data.</div>
            
            <div class="flex-row" style="gap:8px;">
              <input type="file" id="import-db-file" accept=".json" style="display:none;">
              <button id="btn-trigger-import" class="btn btn-secondary">
                ${getIconHTML('upload')} Select File & Import
              </button>
              <span id="import-filename-status" style="font-family:var(--font-mono); font-size:12px; color:var(--text-muted);">No file selected</span>
            </div>
          </div>

          <!-- Reset -->
          <div style="border-top:1px dashed var(--border-color); padding-top:16px; margin-top:8px;">
            <strong>3. System Reset</strong>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">Wipe all custom modifications and restore the baseline industrial mock templates.</div>
            <button id="btn-reset-db" class="btn btn-danger">
              ${getIconHTML('refresh-cw')} Reset to Baseline Mock Templates
            </button>
          </div>

          <!-- Log Out -->
          <div style="border-top:1px dashed var(--border-color); padding-top:16px; margin-top:8px;">
            <strong>4. Workspace Access</strong>
            <div style="font-size:11px; color:var(--text-muted); margin-bottom:8px;">Securely close your current active session. You will need the password to re-enter.</div>
            <button id="btn-logout" class="btn btn-secondary" style="border-color: var(--color-danger); color: var(--color-danger);">
              ${getIconHTML('log-out')} Log Out of Workspace
            </button>
          </div>

        </div>
      </div>

      <!-- Application metadata and guides -->
      <div class="card flex-column" style="margin-bottom:0;">
        <h3 class="card-title">OIOS Workspace Metadata</h3>
        
        <div class="flex-column" style="gap:10px; font-size:13px;">
          <div>
            <strong>App Target Name:</strong> OIOS Studio (Organizational Intelligence OS)
          </div>
          <div>
            <strong>Release Status:</strong> V1.0 Internal Operations Mode
          </div>
          <div id="metadata-storage-provider">
            <strong>Storage Provider:</strong> Loading...
          </div>
          <div>
            <strong>System Frameworks:</strong> HTML5 / Vanilla CSS / ES6 Modules
          </div>
        </div>

        <div style="border-top:1px solid var(--border-color); padding-top:12px; margin-top:16px;">
          <strong>Core Operations Workflow:</strong>
          <ol style="margin-left: 20px; margin-top: 8px; color: var(--text-secondary); line-height: 1.6;">
            <li>Onboard a <strong>Company Profile</strong></li>
            <li>Conduct a structured <strong>Architecture Assessment</strong></li>
            <li>Capture raw logs in <strong>Discovery Notes</strong></li>
            <li>Extract core findings into <strong>Pillars Insights</strong></li>
            <li>Formulate <strong>System Design Proposals</strong></li>
            <li>Launch <strong>Implementation Projects</strong></li>
            <li>Compile executive PDF-ready <strong>Dossier Reports</strong></li>
          </ol>
        </div>
      </div>

      <!-- System Status / Logs Card -->
      <div class="card flex-column" style="grid-column: span 2; margin-top: 20px; margin-bottom: 0;">
        <div class="flex-between">
          <h3 class="card-title" style="margin-bottom:0;">Sistemos būsena (System Logs)</h3>
          <div class="flex-row" style="gap:8px;">
            <!-- Filter Dropdown -->
            <select id="log-filter" class="select-control" style="width:auto; padding: 4px 8px; font-size: 12px; height: 28px; line-height: 1;">
              <option value="all">Visi lygiai (All)</option>
              <option value="error">Klaidos (Error)</option>
              <option value="warn">Įspėjimai (Warn)</option>
              <option value="info">Informacija (Info)</option>
            </select>
            <!-- Refresh Button -->
            <button id="btn-refresh-logs" class="btn btn-secondary" style="padding: 4px 10px; font-size:12px; height:28px;">
              ${getIconHTML('refresh-cw')} Atnaujinti
            </button>
            <!-- Clear Button -->
            <button id="btn-clear-logs" class="btn btn-danger" style="padding: 4px 10px; font-size:12px; height:28px;">
              ${getIconHTML('trash-2')} Išvalyti
            </button>
          </div>
        </div>
        
        <p style="font-size:13px; color:var(--text-secondary); line-height: 1.5; margin-bottom:8px;">
          Sistemos veiklos ir klaidų žurnalas. Čia registruojami visi serverio bei naršyklės įvykiai.
        </p>

        <!-- Console Viewport -->
        <div id="log-console" style="background-color: #080c14; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; font-family: var(--font-mono); font-size: 12px; max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; box-shadow: inset 0 2px 8px rgba(0,0,0,0.8);">
          <div style="color: var(--text-muted); text-align: center; padding: 20px 0;">Kraunamas žurnalas...</div>
        </div>
      </div>

    </div>
  `;

  // Bind Events
  bindSettingsEvents(viewport);
  
  // Load Status and Logs
  loadStatusAndLogs(viewport);
}

function bindSettingsEvents(container) {
  // Export Database
  const btnExport = container.querySelector('#btn-export-db');
  btnExport.addEventListener('click', () => {
    const rawData = db.exportData();
    const blob = new Blob([rawData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `oios_studio_db_export_${dateStr}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Database exported successfully', 'success');
  });

  // Import Database Trigger
  const fileInput = container.querySelector('#import-db-file');
  const btnTrigger = container.querySelector('#btn-trigger-import');
  const filenameStatus = container.querySelector('#import-filename-status');

  btnTrigger.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    filenameStatus.innerText = file.name;

    if (confirm(`Import data from file "${file.name}"?\nThis will overwrite all current companies, notes, and records.`)) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const jsonContent = event.target.result;
        const success = db.importData(jsonContent);
        
        if (success) {
          showToast('Database imported successfully. Reloading...', 'success');
          setTimeout(() => {
            window.location.hash = '#/dashboard';
            window.location.reload();
          }, 1000);
        } else {
          showToast('Import failed. Invalid JSON database schema.', 'danger');
          filenameStatus.innerText = 'Import Error';
        }
      };
      reader.readAsText(file);
    }
  });

  // Reset Database
  const btnReset = container.querySelector('#btn-reset-db');
  btnReset.addEventListener('click', () => {
    if (confirm('Are you absolutely sure you want to reset the database?\nThis will delete all custom entries and restore the baseline industrial transformation mock data.')) {
      db.resetData();
      showToast('Database reset successful. Reloading...', 'success');
      setTimeout(() => {
        window.location.hash = '#/dashboard';
        window.location.reload();
      }, 1000);
    }
  });

  // Log Out
  const btnLogout = container.querySelector('#btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      if (confirm('Are you sure you want to log out of your workspace?')) {
        try {
          const res = await fetch('/api/logout', { method: 'POST' });
          if (res.ok) {
            window.location.href = '/login.html';
          } else {
            showToast('Failed to log out', 'danger');
          }
        } catch (e) {
          showToast('Network error during log out', 'danger');
        }
      }
    });
  }
}

async function loadStatusAndLogs(container) {
  const metadataStorage = container.querySelector('#metadata-storage-provider');
  const logConsole = container.querySelector('#log-console');
  const filterSelect = container.querySelector('#log-filter');
  const btnRefresh = container.querySelector('#btn-refresh-logs');
  const btnClear = container.querySelector('#btn-clear-logs');
  
  let allLogs = [];

  // 1. Fetch system status
  try {
    const statusRes = await fetch('/api/status');
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (metadataStorage) {
        metadataStorage.innerHTML = `<strong>Storage Provider:</strong> ${escapeHTML(statusData.storageProvider)}`;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch system status:', err);
    if (metadataStorage) {
      metadataStorage.innerHTML = `<strong>Storage Provider:</strong> Offline (localStorage)`;
    }
  }

  // 2. Fetch and render logs
  async function fetchLogs() {
    logConsole.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 20px 0;">Kraunamas žurnalas...</div>`;
    try {
      const logsRes = await fetch('/api/logs');
      if (logsRes.ok) {
        allLogs = await logsRes.json();
        renderLogsList();
      } else {
        logConsole.innerHTML = `<div style="color: var(--color-danger); text-align: center; padding: 20px 0;">Nepavyko įkelti klaidų žurnalo (HTTP ${logsRes.status})</div>`;
      }
    } catch (err) {
      console.warn('Failed to fetch system logs:', err);
      logConsole.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 20px 0;">Programa veikia offline režimu (žurnalas nepasiekiamas)</div>`;
    }
  }

  function formatLogTimestamp(ts) {
    if (!ts) return '';
    const date = new Date(ts);
    if (isNaN(date.getTime())) return ts;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }

  function getBadgeType(level) {
    const lvl = String(level).toLowerCase();
    if (lvl === 'error' || lvl === 'danger') return 'danger';
    if (lvl === 'warn' || lvl === 'warning') return 'warning';
    return 'info';
  }

  function getMessageColor(level) {
    const lvl = String(level).toLowerCase();
    if (lvl === 'error' || lvl === 'danger') return '#f87171';
    if (lvl === 'warn' || lvl === 'warning') return '#fbbf24';
    return 'var(--text-primary)';
  }

  function renderLogsList() {
    const selectedLevel = filterSelect.value;
    const filtered = allLogs.filter(log => {
      if (selectedLevel === 'all') return true;
      return String(log.level).toLowerCase() === selectedLevel;
    });

    if (filtered.length === 0) {
      logConsole.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 20px 0;">Žurnalų įrašų nerasta.</div>`;
      return;
    }

    logConsole.innerHTML = filtered.map(log => {
      const badgeType = getBadgeType(log.level);
      const msgColor = getMessageColor(log.level);
      const hasStack = log.stack && log.stack.trim().length > 0;
      
      return `
        <div class="log-row" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; display:flex; flex-direction:column; gap:4px;">
          <div class="flex-row" style="gap:8px; align-items: flex-start; justify-content: space-between;">
            <div class="flex-row" style="gap:8px; align-items: flex-start; flex-wrap: wrap;">
              <span style="color: var(--text-muted); font-size: 11px;">[${formatLogTimestamp(log.timestamp)}]</span>
              <span class="badge badge-${badgeType}" style="padding: 1px 6px; font-size: 9px; border-radius: 4px; line-height:1.2;">${log.level.toUpperCase()}</span>
              <span style="color: ${msgColor}; font-weight: 500; word-break: break-all;">${escapeHTML(log.message)}</span>
            </div>
            ${hasStack ? `
              <button class="btn-icon btn-log-expand" style="padding: 2px; height: 18px; width: 18px;" title="Rodyti klaidos detales">
                ${getIconHTML('chevron-down')}
              </button>
            ` : ''}
          </div>
          ${hasStack ? `
            <pre class="log-stack" style="display:none; background: #0c1220; border: 1px solid rgba(255,255,255,0.08); padding: 8px; border-radius: 4px; color: #f87171; font-size: 11px; overflow-x: auto; margin-top: 4px; white-space: pre-wrap; word-break: break-all; font-family: var(--font-mono);">${escapeHTML(log.stack)}</pre>
          ` : ''}
          ${log.context ? `
            <div style="font-size: 10px; color: var(--text-muted); margin-left: 20px; word-break: break-all;">
              <strong>Context:</strong> ${escapeHTML(log.context)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Bind stack trace expansions
    logConsole.querySelectorAll('.log-row').forEach(row => {
      const expandBtn = row.querySelector('.btn-log-expand');
      const stackPre = row.querySelector('.log-stack');
      if (expandBtn && stackPre) {
        expandBtn.addEventListener('click', () => {
          const isHidden = stackPre.style.display === 'none';
          stackPre.style.display = isHidden ? 'block' : 'none';
          expandBtn.innerHTML = isHidden ? getIconHTML('chevron-up') : getIconHTML('chevron-down');
          refreshIcons();
        });
      }
    });

    refreshIcons();
  }

  // Bind Actions
  btnRefresh.addEventListener('click', fetchLogs);
  filterSelect.addEventListener('change', renderLogsList);

  btnClear.addEventListener('click', async () => {
    if (confirm('Ar tikrai norite ištrinti visus sistemos žurnalus?')) {
      try {
        const clearRes = await fetch('/api/logs', { method: 'DELETE' });
        if (clearRes.ok) {
          showToast('Žurnalas išvalytas', 'success');
          allLogs = [];
          renderLogsList();
        } else {
          showToast('Nepavyko išvalyti žurnalo', 'danger');
        }
      } catch (e) {
        showToast('Klaida siunčiant užklausą', 'danger');
      }
    }
  });

  // Initial Fetch
  fetchLogs();
}
