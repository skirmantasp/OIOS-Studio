/**
 * Navigation History Manager for side drawers in OIOS Studio.
 * Tracks drawer navigation history stack (back/forward) and breadcrumb states.
 */
export class NavigationHistory {
  constructor() {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Pushes a new state onto the navigation stack.
   * If there are future states (due to back operations), they are discarded.
   * @param {string} entityType - e.g. 'project', 'systemIdea', 'insight', 'discoveryNote'
   * @param {string} entityId - unique database ID of the entity
   * @param {string} title - display title of the entity
   */
  push(entityType, entityId, title) {
    // If we are currently in a back state, truncate the forward history
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }
    
    // De-duplicate: do not push if the state matches the current active state
    const current = this.getCurrent();
    if (current && current.entityType === entityType && current.entityId === entityId) {
      return;
    }
    
    this.history.push({ entityType, entityId, title });
    this.currentIndex = this.history.length - 1;
  }

  /**
   * Navigates back. Returns the new active state, or null.
   * @returns {Object|null}
   */
  back() {
    if (this.canGoBack()) {
      this.currentIndex--;
      return this.getCurrent();
    }
    return null;
  }

  /**
   * Navigates forward. Returns the new active state, or null.
   * @returns {Object|null}
   */
  forward() {
    if (this.canGoForward()) {
      this.currentIndex++;
      return this.getCurrent();
    }
    return null;
  }

  /**
   * Gets the current active state.
   * @returns {Object|null}
   */
  getCurrent() {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.history[this.currentIndex];
    }
    return null;
  }

  /**
   * Checks if back navigation is possible.
   * @returns {boolean}
   */
  canGoBack() {
    return this.currentIndex > 0;
  }

  /**
   * Checks if forward navigation is possible.
   * @returns {boolean}
   */
  canGoForward() {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Clears the stack and resets pointers.
   */
  clear() {
    this.history = [];
    this.currentIndex = -1;
  }
}
