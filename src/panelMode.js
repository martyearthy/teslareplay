import { CLIPS_MODE_KEY, CLIPS_PREV_MODE_KEY } from './storageKeys.js';

// Clips panel mode (floating / docked / collapsed)
export function createClipsPanelMode({ map, clipsDockToggleBtn, clipsCollapseBtn } = {}) {
  function applyClipsMode(mode) {
    const m = (mode === 'docked' || mode === 'collapsed') ? mode : 'floating';
    document.body.classList.remove('clips-mode-floating', 'clips-mode-docked', 'clips-mode-collapsed');
    document.body.classList.add(`clips-mode-${m}`);
    localStorage.setItem(CLIPS_MODE_KEY, m);

    if (clipsDockToggleBtn) {
      const isDocked = (m === 'docked');
      clipsDockToggleBtn.title = isDocked ? 'Float panel' : 'Dock panel';
      clipsDockToggleBtn.setAttribute('aria-label', isDocked ? 'Float panel' : 'Dock panel');
    }
    if (clipsCollapseBtn) {
      const isCollapsed = (m === 'collapsed');
      clipsCollapseBtn.title = isCollapsed ? 'Expand panel' : 'Collapse panel';
      clipsCollapseBtn.setAttribute('aria-label', isCollapsed ? 'Expand panel' : 'Collapse panel');
    }

    // Leaflet sometimes needs a nudge when UI moves around.
    if (map) setTimeout(() => { try { map.invalidateSize(); } catch { } }, 150);
  }

  function initClipsPanelMode() {
    const saved = localStorage.getItem(CLIPS_MODE_KEY) || 'floating';
    applyClipsMode(saved);
  }

  function toggleDockMode() {
    const current = localStorage.getItem(CLIPS_MODE_KEY) || 'floating';
    if (current === 'collapsed') {
      const prev = localStorage.getItem(CLIPS_PREV_MODE_KEY) || 'floating';
      const base = (prev === 'docked') ? 'docked' : 'floating';
      localStorage.setItem(CLIPS_MODE_KEY, base);
      applyClipsMode(base === 'docked' ? 'floating' : 'docked');
      return;
    }
    applyClipsMode(current === 'docked' ? 'floating' : 'docked');
  }

  function toggleCollapsedMode() {
    const current = localStorage.getItem(CLIPS_MODE_KEY) || 'floating';
    if (current === 'collapsed') {
      const prev = localStorage.getItem(CLIPS_PREV_MODE_KEY) || 'floating';
      applyClipsMode(prev);
      return;
    }
    localStorage.setItem(CLIPS_PREV_MODE_KEY, current);
    applyClipsMode('collapsed');
  }

  return { initClipsPanelMode, applyClipsMode, toggleDockMode, toggleCollapsedMode };
}


