/* Settings Page View */

import { db } from '../state.js';
import { getIconHTML, showToast } from '../utils.js';

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
          All data within OIOS Studio is stored client-side in the browser cache (localStorage). To prevent data loss or migrate workspaces, use the backup tools below.
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
          <div>
            <strong>Storage Provider:</strong> Browser Local Storage
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

    </div>
  `;

  // Bind Events
  bindSettingsEvents(viewport);
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
            // Reload page hash
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
}
