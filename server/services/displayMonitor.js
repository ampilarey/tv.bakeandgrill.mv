/**
 * Display Monitor
 * Runs every 90 s. Checks all active displays for missed heartbeats.
 * Creates a 'display_offline' notification when a display goes offline,
 * and a 'display_online' notification when it comes back.
 * Writes to the notifications table for all admin users.
 */
const { getDatabase } = require('../database/init');

const OFFLINE_THRESHOLD_MS = 90_000; // 90 s with no heartbeat = offline
const CHECK_INTERVAL_MS    = 90_000;

// In-memory set of display IDs currently known to be offline
const offlineSet = new Set();

async function getAdminIds(db) {
  try {
    const [rows] = await db.query("SELECT id FROM users WHERE role = 'admin' AND is_active = 1");
    return rows.map(r => r.id);
  } catch { return []; }
}

async function createNotification(db, adminIds, type, title, message) {
  for (const uid of adminIds) {
    try {
      await db.query(
        'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
        [uid, type, title, message]
      );
    } catch { /* ignore */ }
  }
}

async function runCheck() {
  let db;
  try { db = getDatabase(); } catch { return; }

  const [displays] = await db.query(
    'SELECT id, name, location, last_heartbeat FROM displays WHERE is_active = 1'
  ).catch(() => [[]]);

  const now = Date.now();
  const adminIds = await getAdminIds(db);

  for (const d of displays) {
    const lastSeen = d.last_heartbeat ? new Date(d.last_heartbeat).getTime() : 0;
    const isOffline = !lastSeen || (now - lastSeen) > OFFLINE_THRESHOLD_MS;
    const wasOffline = offlineSet.has(d.id);
    const label = d.location ? `${d.name} (${d.location})` : d.name;

    if (isOffline && !wasOffline) {
      offlineSet.add(d.id);
      const ago = lastSeen ? Math.round((now - lastSeen) / 60000) + ' min ago' : 'never';
      await createNotification(db, adminIds,
        'display_offline',
        `📺 ${label} is offline`,
        `Last heartbeat: ${ago}. Display may need attention.`
      );
    } else if (!isOffline && wasOffline) {
      offlineSet.delete(d.id);
      await createNotification(db, adminIds,
        'display_online',
        `✅ ${label} is back online`,
        'Display reconnected and is now sending heartbeats.'
      );
    }
  }
}

let intervalId = null;

function start() {
  if (intervalId) return;
  // Initial check after 2 min (let displays connect first)
  setTimeout(() => {
    runCheck().catch(() => {});
    intervalId = setInterval(() => runCheck().catch(() => {}), CHECK_INTERVAL_MS);
  }, 2 * 60 * 1000);
  console.log('[DisplayMonitor] Started — checking every 90 s for offline displays');
}

function stop() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
}

module.exports = { start, stop };
