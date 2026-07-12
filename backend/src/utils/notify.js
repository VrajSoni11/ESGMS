const prisma = require('../config/prisma');

/**
 * Creates an in-app notification for a user, respecting the
 * Notification Settings toggle (in-app channel).
 * Business Rule: Notification System (PRD Section 4)
 */
async function notify(userId, eventType, title, message) {
  try {
    const settingRow = await prisma.setting.findUnique({ where: { key: 'notification_channels' } });
    const channels = settingRow ? settingRow.value : { inApp: true };
    if (channels.inApp === false) return null;
    if (!userId) return null;

    return await prisma.notification.create({
      data: { userId, eventType, title, message }
    });
  } catch (err) {
    console.error('Notification error:', err.message);
    return null;
  }
}

async function notifyAdmins(eventType, title, message) {
  try {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    await Promise.all(admins.map((a) => notify(a.id, eventType, title, message)));
  } catch (err) {
    console.error('Notify admins error:', err.message);
  }
}

module.exports = { notify, notifyAdmins };
