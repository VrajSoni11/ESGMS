const prisma = require('../config/prisma');

/**
 * EcoSphere Scoring Engine (PRD Section 3.5 & Section 6)
 *
 * Environmental Score  -> derived from carbon transactions vs. goals per department
 * Social Score         -> derived from CSR participation approval rate + training completion
 * Governance Score     -> derived from policy acknowledgement rate + compliance issue health
 * Department Total     -> average of the three pillar scores (equal weight within department)
 * Overall ESG Score     -> weighted average of all Department Total Scores using configurable weights
 *
 * All scores are normalized to a 0-100 scale so they roll up cleanly.
 */

async function calculateEnvironmentalScore(departmentId) {
  const transactions = await prisma.carbonTransaction.findMany({ where: { departmentId } });
  const totalCo2e = transactions.reduce((sum, t) => sum + Number(t.co2eValue), 0);

  const goals = await prisma.environmentalGoal.findMany({ where: { departmentId } });

  if (goals.length === 0) {
    // No goals set: score based on inverse of emissions volume (capped) as a fallback signal
    if (totalCo2e === 0) return 70; // neutral-good default with no data
    const penalty = Math.min(totalCo2e / 10, 50);
    return Math.max(50 - penalty + 50, 10); // clamps between 10-100 roughly
  }

  // Compare actual emissions against target (lower is better for emissions-type goals)
  const targetTotal = goals.reduce((sum, g) => sum + Number(g.targetValue), 0);
  if (targetTotal === 0) return 70;

  const ratio = totalCo2e / targetTotal; // <1 means under target (good)
  let score = 100 - ratio * 100;
  score = Math.max(0, Math.min(100, score));
  return Math.round(score * 100) / 100;
}

async function calculateSocialScore(departmentId) {
  const employees = await prisma.user.findMany({ where: { departmentId } });
  const employeeIds = employees.map((e) => e.id);

  if (employeeIds.length === 0) return 50; // neutral default

  const participations = await prisma.employeeParticipation.findMany({
    where: { employeeId: { in: employeeIds } }
  });

  const totalParticipations = participations.length;
  const approved = participations.filter((p) => p.approvalStatus === 'APPROVED').length;

  const trainings = await prisma.trainingCompletion.count({
    where: { employeeId: { in: employeeIds } }
  });

  const participationRate = totalParticipations > 0 ? (approved / totalParticipations) * 100 : 50;
  const trainingRate = employeeIds.length > 0
    ? Math.min((trainings / employeeIds.length) * 100, 100)
    : 0;

  // Weighted blend: 60% participation approval rate, 40% training completion coverage
  const score = participationRate * 0.6 + trainingRate * 0.4;
  return Math.round(score * 100) / 100;
}

async function calculateGovernanceScore(departmentId) {
  const employees = await prisma.user.findMany({ where: { departmentId } });
  const employeeIds = employees.map((e) => e.id);

  if (employeeIds.length === 0) return 50;

  const acknowledgements = await prisma.policyAcknowledgement.findMany({
    where: { employeeId: { in: employeeIds } }
  });
  const totalAck = acknowledgements.length;
  const doneAck = acknowledgements.filter((a) => a.status === 'ACKNOWLEDGED').length;
  const ackRate = totalAck > 0 ? (doneAck / totalAck) * 100 : 70;

  const issues = await prisma.complianceIssue.findMany({
    where: { ownerId: { in: employeeIds } }
  });
  const totalIssues = issues.length;
  const badIssues = issues.filter(
    (i) => i.status === 'FLAGGED_OVERDUE' || (i.status === 'OPEN' && new Date(i.dueDate) < new Date())
  ).length;
  const issueHealthRate = totalIssues > 0 ? Math.max(0, 100 - (badIssues / totalIssues) * 100) : 100;

  // Weighted blend: 50% policy acknowledgement rate, 50% compliance issue health
  const score = ackRate * 0.5 + issueHealthRate * 0.5;
  return Math.round(score * 100) / 100;
}

/**
 * Recalculates and persists scores for one department, then recalculates
 * the org-wide Overall ESG Score off ALL departments (weighted roll-up).
 */
async function recalculateDepartmentScore(departmentId) {
  const environmentalScore = await calculateEnvironmentalScore(departmentId);
  const socialScore = await calculateSocialScore(departmentId);
  const governanceScore = await calculateGovernanceScore(departmentId);

  const totalScore = Math.round(((environmentalScore + socialScore + governanceScore) / 3) * 100) / 100;

  const score = await prisma.departmentScore.upsert({
    where: { departmentId },
    update: { environmentalScore, socialScore, governanceScore, totalScore, calculatedAt: new Date() },
    create: { departmentId, environmentalScore, socialScore, governanceScore, totalScore }
  });

  return score;
}

async function recalculateAllScores() {
  const departments = await prisma.department.findMany({ where: { status: 'ACTIVE' } });
  const results = [];
  for (const dept of departments) {
    const score = await recalculateDepartmentScore(dept.id);
    results.push(score);
  }
  return results;
}

/**
 * Overall ESG Score = weighted average of all Department Total Scores
 * using configurable weights (default Environmental 40% / Social 30% / Governance 30%)
 * applied to each pillar score, then averaged across departments.
 */
async function getOverallEsgScore() {
  const weightsRow = await prisma.setting.findUnique({ where: { key: 'esg_weights' } });
  const weights = weightsRow ? weightsRow.value : { environmental: 0.4, social: 0.3, governance: 0.3 };

  const deptScores = await prisma.departmentScore.findMany({
    include: { department: true }
  });

  if (deptScores.length === 0) {
    return {
      overallScore: 0,
      environmentalAvg: 0,
      socialAvg: 0,
      governanceAvg: 0,
      weights,
      departmentCount: 0
    };
  }

  let envSum = 0, socSum = 0, govSum = 0;
  for (const d of deptScores) {
    envSum += Number(d.environmentalScore);
    socSum += Number(d.socialScore);
    govSum += Number(d.governanceScore);
  }
  const n = deptScores.length;
  const environmentalAvg = envSum / n;
  const socialAvg = socSum / n;
  const governanceAvg = govSum / n;

  const overallScore =
    environmentalAvg * weights.environmental +
    socialAvg * weights.social +
    governanceAvg * weights.governance;

  return {
    overallScore: Math.round(overallScore * 100) / 100,
    environmentalAvg: Math.round(environmentalAvg * 100) / 100,
    socialAvg: Math.round(socialAvg * 100) / 100,
    governanceAvg: Math.round(governanceAvg * 100) / 100,
    weights,
    departmentCount: n
  };
}

module.exports = {
  calculateEnvironmentalScore,
  calculateSocialScore,
  calculateGovernanceScore,
  recalculateDepartmentScore,
  recalculateAllScores,
  getOverallEsgScore
};
