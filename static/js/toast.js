/**
 * static/js/toast.js
 *
 * Minimal toast notification system.
 * Usage: toast('Message', 'success' | 'error' | 'info')
 * Exposed globally as window.toast()
 */

'use strict';

window.toast = function toast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-dot"></span><span>${message}</span>`;

  container.appendChild(el);

  // Auto-dismiss
  const remove = () => {
    el.style.transition = 'opacity 0.2s, transform 0.2s';
    el.style.opacity    = '0';
    el.style.transform  = 'translateX(110%)';
    setTimeout(() => el.remove(), 220);
  };

  const timer = setTimeout(remove, duration);
  el.addEventListener('click', () => { clearTimeout(timer); remove(); });
};
