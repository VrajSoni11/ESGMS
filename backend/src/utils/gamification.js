const prisma = require('../config/prisma');
const { notify } = require('./notify');

/**
 * Business Rule: Badge Auto-Award (PRD Section 4)
 * When enabled via Settings, checks whether the employee now qualifies
 * for any badge (XP threshold or completed-challenge count) and awards
 * automatically without manual admin action.
 */
async function checkAndAwardBadges(employeeId) {
  const toggleRow = await prisma.setting.findUnique({ where: { key: 'feature_toggles' } });
  const toggles = toggleRow ? toggleRow.value : { badgeAutoAward: true };
  if (toggles.badgeAutoAward === false) return [];

  const user = await prisma.user.findUnique({ where: { id: employeeId } });
  if (!user) return [];

  const completedChallengeCount = await prisma.challengeParticipation.count({
    where: { employeeId, approvalStatus: 'APPROVED' }
  });

  const allBadges = await prisma.badge.findMany();
  const alreadyOwned = await prisma.employeeBadge.findMany({ where: { employeeId } });
  const ownedIds = new Set(alreadyOwned.map((b) => b.badgeId));

  const newlyAwarded = [];

  for (const badge of allBadges) {
    if (ownedIds.has(badge.id)) continue;

    let qualifies = false;
    if (badge.unlockRuleType === 'XP_THRESHOLD' && user.xp >= badge.unlockRuleValue) {
      qualifies = true;
    } else if (badge.unlockRuleType === 'CHALLENGE_COUNT' && completedChallengeCount >= badge.unlockRuleValue) {
      qualifies = true;
    }

    if (qualifies) {
      await prisma.employeeBadge.create({ data: { employeeId, badgeId: badge.id } });
      newlyAwarded.push(badge);
      await notify(employeeId, 'BADGE_UNLOCKED', `Badge Unlocked: ${badge.name}`, badge.description || '');
    }
  }

  return newlyAwarded;
}

module.exports = { checkAndAwardBadges };
