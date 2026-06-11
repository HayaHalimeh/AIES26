// Persistent session storage keyed by Prolific PID when available.
// Uses localStorage so it survives tab closes and refreshes.
// Each Prolific participant gets their own key; local testing falls back to "local".

const getKey = () => {
  try {
    const pid = new URLSearchParams(window.location.search).get("PROLIFIC_PID");
    if (pid) return `eca_v2_${pid}`;
    // No Prolific PID — generate a random ID for this participant and persist it
    let localId = localStorage.getItem("eca_local_id");
    if (!localId) {
      localId = crypto.randomUUID();
      localStorage.setItem("eca_local_id", localId);
    }
    return `eca_v2_${localId}`;
  } catch {
    return null;
  }
};

export const loadSession = () => {
  try {
    const key = getKey();
    if (!key) return null;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveSession = (data) => {
  try {
    const key = getKey();
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
};

export const clearSession = () => {
  try {
    const key = getKey();
    if (!key) return;
    localStorage.removeItem(key);
  } catch {}
};
