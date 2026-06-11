// state.js
export function getSlotKeysForPhase(phase) {
  return ["dish_type", "total_time", "complexity"];
}

export function normalizeSlotValue(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

export async function getState(db, conversationId) {
  const row = await db.get(
    `SELECT dish_type, total_time, complexity, task_phase
     FROM conversation_state
     WHERE conversation_id = ?`,
    [conversationId]
  );

  if (row) return row;

  await db.run(
    `INSERT INTO conversation_state (conversation_id, dish_type, total_time, complexity, task_phase)
     VALUES (?, NULL, NULL, NULL, 1)`,
    [conversationId]
  );

  return { dish_type: null, total_time: null, complexity: null, task_phase: 1 };
}

export async function mergeState(db, conversationId, incomingSlots = {}) {
  const current = await getState(db, conversationId);
  const slotKeys = getSlotKeysForPhase(current.task_phase ?? 1);

  const merged = { ...current };
  for (const k of slotKeys) {
    const v = normalizeSlotValue(incomingSlots[k]);
    if (v !== null) merged[k] = v;
  }

  await db.run(
    `UPDATE conversation_state
     SET dish_type=?, total_time=?, complexity=?, updated_at=CURRENT_TIMESTAMP
     WHERE conversation_id=?`,
    [merged.dish_type, merged.total_time, merged.complexity, conversationId]
  );

  return merged;
}

export async function advanceToPhase2(db, conversationId) {
  await db.run(
    `UPDATE conversation_state
     SET task_phase=2, dish_type=NULL, total_time=NULL, complexity=NULL, updated_at=CURRENT_TIMESTAMP
     WHERE conversation_id=?`,
    [conversationId]
  );
}

export async function getPhase(db, conversationId) {
  const row = await db.get(
    `SELECT task_phase FROM conversation_state WHERE conversation_id = ?`,
    [conversationId]
  );
  return row?.task_phase ?? 1;
}
