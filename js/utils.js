/* OIOS Studio Utility Functions */

/**
 * Generates a unique ID
 * @returns {string}
 */
export function generateUUID() {
  return 'oios_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Formats a Date string into a human-readable format
 * @param {string|Date} dateVal 
 * @param {boolean} includeTime
 * @returns {string}
 */
export function formatDate(dateVal, includeTime = false) {
  if (!dateVal) return 'N/A';
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return String(dateVal);
  
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  return date.toLocaleDateString('en-US', options);
}

/**
 * Escapes HTML characters to prevent XSS
 * @param {string} text 
 * @returns {string}
 */
export function escapeHTML(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render an HTML icon placeholder for Lucide
 * @param {string} iconName 
 * @param {string} classes 
 * @returns {string}
 */
export function getIconHTML(iconName, classes = '') {
  return `<i data-lucide="${iconName}" class="${classes}"></i>`;
}

/**
 * Triggers a Lucide icon rendering sweep in the document
 */
export function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Formats markdown into HTML. Uses Marked CDN if loaded, otherwise falls back.
 * @param {string} text 
 * @returns {string}
 */
export function parseMarkdown(text) {
  if (!text) return '';
  if (window.marked && typeof window.marked.parse === 'function') {
    return window.marked.parse(text);
  }
  
  // Custom minimal parser fallback
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Bold
  html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*)\*/gim, '<em>$1</em>');
  
  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
  
  // Lists
  html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/gim, '');
  
  // Paragraphs
  const blocks = html.split('\n\n');
  const formatted = blocks.map(block => {
    const trimmed = block.trim();
    if (trimmed.startsWith('<h') || trimmed.startsWith('<ul') || trimmed.startsWith('<block')) {
      return trimmed;
    }
    return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
  });
  
  return formatted.join('\n');
}

/**
 * Creates dynamic toast notifications
 * @param {string} message 
 * @param {'info'|'success'|'warning'|'danger'} type 
 */
export function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '2000';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `badge badge-${type}`;
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = 'var(--radius-md)';
  toast.style.background = 'var(--bg-secondary)';
  toast.style.border = '1px solid var(--border-color)';
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  toast.style.color = `var(--text-primary)`;
  toast.style.fontSize = '13px';
  toast.style.pointerEvents = 'auto';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(20px)';
  toast.style.transition = 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
  
  // Left border highlight
  const accentColor = `var(--color-${type === 'info' ? 'info' : type})`;
  toast.style.borderLeft = `4px solid ${accentColor}`;

  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'warning') iconName = 'alert-triangle';
  if (type === 'danger') iconName = 'x-circle';

  toast.innerHTML = `<span style="display:inline-flex; align-items:center; gap:8px;">
    ${getIconHTML(iconName)}
    <span>${escapeHTML(message)}</span>
  </span>`;

  container.appendChild(toast);
  refreshIcons();

  // Trigger animation
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);

  // Remove toast
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Opens the main modal dialog with the specified content
 */
export function openModal(title, bodyHTML, footerHTML) {
  const modal = document.getElementById('app-modal');
  if (!modal) return;
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body-content').innerHTML = bodyHTML;
  document.getElementById('modal-footer-content').innerHTML = footerHTML;
  
  modal.classList.add('active');
  refreshIcons();
}

/**
 * Closes the main modal dialog
 */
export function closeModal() {
  const modal = document.getElementById('app-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * Opens the side drawer detailed panel
 */
export function openDrawer(title, bodyHTML, onEditClick = null) {
  const drawer = document.getElementById('app-drawer');
  if (!drawer) return;
  const titleEl = document.getElementById('drawer-title');
  if (titleEl) titleEl.textContent = title;
  document.getElementById('drawer-body-content').innerHTML = bodyHTML;
  
  const editBtn = document.getElementById('drawer-edit');
  if (editBtn) {
    if (onEditClick) {
      editBtn.style.display = 'block';
      // Clear old listeners
      const newEditBtn = editBtn.cloneNode(true);
      editBtn.replaceWith(newEditBtn);
      newEditBtn.addEventListener('click', onEditClick);
    } else {
      editBtn.style.display = 'none';
    }
  }
  
  // Setup drawer expand/maximize button listener
  const expandBtn = document.getElementById('drawer-expand');
  if (expandBtn) {
    // Clear old listeners
    const newExpandBtn = expandBtn.cloneNode(true);
    expandBtn.replaceWith(newExpandBtn);
    
    newExpandBtn.addEventListener('click', () => {
      const isExpanded = drawer.classList.toggle('expanded');
      if (isExpanded) {
        newExpandBtn.innerHTML = `<i data-lucide="minimize-2" style="width: 14px; height: 14px;"></i>`;
      } else {
        newExpandBtn.innerHTML = `<i data-lucide="maximize-2" style="width: 14px; height: 14px;"></i>`;
      }
      refreshIcons();
    });
  }
  
  drawer.classList.add('active');
  refreshIcons();
}

/**
 * Closes the side drawer detailed panel
 */
export function closeDrawer() {
  const drawer = document.getElementById('app-drawer');
  if (drawer) {
    drawer.classList.remove('active');
    drawer.classList.remove('expanded');
    
    // Reset expand button icon back to default maximize-2
    const expandBtn = document.getElementById('drawer-expand');
    if (expandBtn) {
      expandBtn.innerHTML = `<i data-lucide="maximize-2" style="width: 14px; height: 14px;"></i>`;
    }
  }
}

