const express = require('express');
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');
const { getOverallEsgScore } = require('../utils/scoringEngine');

const router = express.Router();
router.use(authenticate);

// Main organization dashboard - PRD Section 9 "Success Criteria for Demo"
router.get('/', async (req, res) => {
  const overall = await getOverallEsgScore();

  const deptScores = await prisma.departmentScore.findMany({
    include: { department: true },
    orderBy: { totalScore: 'desc' }
  });

  const totalEmployees = await prisma.user.count({ where: { role: { in: ['EMPLOYEE', 'MANAGER'] }, status: 'ACTIVE' } });
  const totalCo2e = await prisma.carbonTransaction.aggregate({ _sum: { co2eValue: true } });
  const activeChallenges = await prisma.challenge.count({ where: { status: 'ACTIVE' } });
  const pendingCsr = await prisma.employeeParticipation.count({ where: { approvalStatus: 'PENDING' } });
  const pendingChallenges = await prisma.challengeParticipation.count({ where: { approvalStatus: 'PENDING' } });
  const overdueIssues = await prisma.complianceIssue.count({ where: { status: 'FLAGGED_OVERDUE' } });
  const openIssues = await prisma.complianceIssue.count({ where: { status: 'OPEN' } });

  const topEmployees = await prisma.user.findMany({
    where: { role: { in: ['EMPLOYEE', 'MANAGER'] } },
    select: { id: true, name: true, xp: true, department: { select: { name: true } } },
    orderBy: { xp: 'desc' },
    take: 5
  });

  res.json({
    overallEsgScore: overall,
    departmentScores: deptScores,
    stats: {
      totalEmployees,
      totalCo2e: Number(totalCo2e._sum.co2eValue || 0),
      activeChallenges,
      pendingCsrApprovals: pendingCsr,
      pendingChallengeApprovals: pendingChallenges,
      overdueComplianceIssues: overdueIssues,
      openComplianceIssues: openIssues
    },
    topEmployees
  });
});

// Personal employee dashboard
router.get('/my-dashboard', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { department: true }
  });

  const badges = await prisma.employeeBadge.findMany({ where: { employeeId: req.user.id }, include: { badge: true } });
  const activeChallenges = await prisma.challengeParticipation.findMany({
    where: { employeeId: req.user.id },
    include: { challenge: true }
  });
  const csrParticipations = await prisma.employeeParticipation.findMany({
    where: { employeeId: req.user.id },
    include: { activity: true }
  });
  const pendingPolicies = await prisma.policyAcknowledgement.count({
    where: { employeeId: req.user.id, status: 'PENDING' }
  });

  const rank = await prisma.user.count({ where: { xp: { gt: user.xp }, role: { in: ['EMPLOYEE', 'MANAGER'] } } });

  res.json({
    user: { id: user.id, name: user.name, xp: user.xp, pointsBalance: user.pointsBalance, department: user.department },
    badges,
    challengeParticipations: activeChallenges,
    csrParticipations,
    pendingPolicyAcknowledgements: pendingPolicies,
    leaderboardRank: rank + 1
  });
});

module.exports = router;
