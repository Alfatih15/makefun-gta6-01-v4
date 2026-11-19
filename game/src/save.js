// NOVA BAY — save and load: one localStorage slot for the campaign.
// One job: persist cash, mission progress and position between visits.
const KEY = 'novabay-save-v1';

export function saveGame(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {}
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
