/**
 * static/js/theme.js
 * Handles dark / light / system theme switching.
 * Persists preference in localStorage. Applies immediately
 * on page load (inline script in <head>) to avoid FOUC.
 */

const STORAGE_KEY = 'knapsack-theme';

/**
 * Returns the effective theme string: 'dark' or 'light'
 * (resolves 'system' based on OS preference)
 */
function resolveTheme(preference) {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }
  return preference;
}

/** Apply theme to <html> element */
function applyTheme(preference) {
  const effective = resolveTheme(preference);
  document.documentElement.setAttribute('data-theme', effective);

  // Update button states
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === preference);
  });
}

/** Save and apply a new preference */
function setTheme(preference) {
  localStorage.setItem(STORAGE_KEY, preference);
  applyTheme(preference);
}

/** Get saved preference (default: system) */
function getSavedTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'system';
}

// ---- Initialise ----

(function init() {
  applyTheme(getSavedTheme());

  // React to OS preference changes when set to 'system'
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (getSavedTheme() === 'system') applyTheme('system');
  });

  // Wire up buttons after DOM loads
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });
    applyTheme(getSavedTheme());  // re-apply to set active states
  });
})();
