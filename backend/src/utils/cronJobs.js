const cron = require('node-cron');
const prisma = require('../config/prisma');
const { notify, notifyAdmins } = require('./notify');

/**
 * Business Rule: Overdue Flagging (PRD Section 3.3 & Section 4)
 * Compliance Issues still OPEN past their Due Date are automatically
 * flagged (status -> FLAGGED_OVERDUE) and trigger a notification.
 */
async function flagOverdueIssues() {
  try {
    const overdue = await prisma.complianceIssue.findMany({
      where: { status: 'OPEN', dueDate: { lt: new Date() } }
    });

    for (const issue of overdue) {
      await prisma.complianceIssue.update({
        where: { id: issue.id },
        data: { status: 'FLAGGED_OVERDUE' }
      });
      if (issue.ownerId) {
        await notify(issue.ownerId, 'ISSUE_OVERDUE', 'Compliance Issue Overdue', issue.description);
      }
      await notifyAdmins('ISSUE_OVERDUE', 'Compliance Issue Overdue', issue.description);
    }

    if (overdue.length > 0) {
      console.log(`[cron] Flagged ${overdue.length} overdue compliance issue(s)`);
    }
  } catch (err) {
    console.error('[cron] Overdue flagging error:', err.message);
  }
}

function startCronJobs() {
  // Run every hour, and once immediately on server start
  flagOverdueIssues();
  cron.schedule('0 * * * *', flagOverdueIssues);
}

module.exports = { startCronJobs, flagOverdueIssues };
