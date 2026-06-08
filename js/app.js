import { refreshIcons, showToast, closeModal, closeDrawer } from './utils.js';
import { db } from './state.js';

import renderDashboard from './pages/dashboard.js';
import renderCompanies from './pages/companies.js';
import renderWorkspace from './pages/workspace.js';
import renderReports from './pages/reports.js';
import renderSettings from './pages/settings.js';

// Signal to the HTML fallback detector that the module loaded successfully
window._oiosModuleLoaded = true;

// Route Registry
const ROUTES = {
  '#/dashboard': { renderer: renderDashboard, title: 'Dashboard' },
  '#/companies': { renderer: renderCompanies, title: 'Companies' },
  '#/workspace': { renderer: renderWorkspace, title: 'Company Workspace' },
  '#/reports':   { renderer: renderReports,   title: 'Reports' },
  '#/settings':  { renderer: renderSettings,  title: 'Settings' }
};

/**
 * Parses current location hash into route and query params
 */
function getRouteInfo() {
  const hash = window.location.hash || '#/dashboard';
  const [route, queryString] = hash.split('?');
  const params = new URLSearchParams(queryString || '');
  return { route, params };
}

/**
 * Page router — matches hash to renderer, updates topbar title and sidebar state
 */
async function router() {
  const { route, params } = getRouteInfo();
  const viewport = document.getElementById('app-viewport');
  const topbarTitle = document.getElementById('topbar-title');

  if (!viewport) return;

  closeModal();
  closeDrawer();

  // Update sidebar active state
  document.querySelectorAll('#sidebar-nav .nav-item').forEach(item => {
    const pageAttr = item.getAttribute('data-page');
    const activePage = (route === '#/workspace') ? 'companies' : route.replace('#/', '');
    item.classList.toggle('active', pageAttr === activePage);
  });

  // Match route or fall back to dashboard
  const routeConfig = ROUTES[route] || ROUTES['#/dashboard'];

  // Update topbar title
  if (topbarTitle) topbarTitle.innerText = routeConfig.title;

  // Hide workspace indicator for non-workspace routes
  const workspaceIndicator = document.getElementById('workspace-indicator');
  if (workspaceIndicator && route !== '#/workspace') {
    workspaceIndicator.style.display = 'none';
  }

  try {
    await routeConfig.renderer(viewport, params);
  } catch (error) {
    viewport.innerHTML = `
      <div class="card" style="border-color: var(--color-danger)">
        <h3 style="color: var(--color-danger)">Page Render Error</h3>
        <p style="margin-top: 8px;">An error occurred loading <strong>${route}</strong>:</p>
        <pre style="margin-top:8px; font-size:12px; color:var(--color-danger); background:var(--bg-primary); padding:12px; border-radius:6px; white-space:pre-wrap; word-break:break-all;">${error.message}\n\n${error.stack || ''}</pre>
        <button class="btn btn-secondary" style="margin-top:12px;" onclick="window.location.hash = '#/dashboard'">Return to Dashboard</button>
      </div>
    `;
  }

  refreshIcons();
}

// --- Theme Management ---
function initTheme() {
  const savedTheme = localStorage.getItem('oios_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  const themeToggle = document.getElementById('theme-toggle');
  if (!themeToggle) return;

  themeToggle.innerHTML = savedTheme === 'dark'
    ? '<i data-lucide="sun"></i>'
    : '<i data-lucide="moon"></i>';

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('oios_theme', newTheme);

    themeToggle.innerHTML = newTheme === 'dark'
      ? '<i data-lucide="sun"></i>'
      : '<i data-lucide="moon"></i>';

    refreshIcons();
    showToast(`Switched to ${newTheme} mode`, 'info');
  });
}

// --- App Initialization ---
async function initApp() {
  initTheme();

  const modalClose = document.getElementById('modal-close');
  const drawerClose = document.getElementById('drawer-close');
  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);

  const appModal = document.getElementById('app-modal');
  const appDrawer = document.getElementById('app-drawer');
  if (appModal) appModal.addEventListener('click', e => { if (e.target.id === 'app-modal') closeModal(); });
  if (appDrawer) appDrawer.addEventListener('click', e => { if (e.target.id === 'app-drawer') closeDrawer(); });

  try {
    await db.init();
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }

  window.addEventListener('hashchange', router);
  router();
}

// Module scripts are deferred — DOMContentLoaded may have already fired.
// Check readyState and run immediately if DOM is already parsed.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
