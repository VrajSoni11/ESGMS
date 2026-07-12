const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { recalculateDepartmentScore } = require('../utils/scoringEngine');
const { checkAndAwardBadges } = require('../utils/gamification');
const { notify } = require('../utils/notify');

const router = express.Router();
router.use(authenticate);

/* ---------------- Challenges ---------------- */

router.get('/challenges', async (req, res) => {
  const { status } = req.query;
  const where = status ? { status } : {};
  const challenges = await prisma.challenge.findMany({
    where,
    include: { category: true, _count: { select: { participations: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(challenges);
});

router.get('/challenges/:id', async (req, res) => {
  const challenge = await prisma.challenge.findUnique({
    where: { id: Number(req.params.id) },
    include: { category: true, participations: { include: { employee: { select: { id: true, name: true } } } } }
  });
  if (!challenge) return res.status(404).json({ message: 'Challenge not found' });
  res.json(challenge);
});

// Helper: safely turn a form value into a valid Date or null, never "Invalid Date"
function parseDeadline(deadline) {
  if (deadline === undefined || deadline === null || deadline === '') return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

// Helper: safely coerce category id, tolerating "", null, undefined, or non-numeric junk
function parseCategoryId(categoryId) {
  if (categoryId === undefined || categoryId === null || categoryId === '') return null;
  const n = Number(categoryId);
  return Number.isNaN(n) ? null : n;
}

router.post('/challenges', authorize('ADMIN'), async (req, res) => {
  try {
    const { title, categoryId, description, xp, difficulty, evidenceRequired, deadline, status } = req.body;

    // Bug fix: previously an empty/whitespace-only title, a bad xp value, or a
    // malformed date could all reach Prisma and fail with an opaque 400 that
    // the UI reported simply as "unable to create a challenge". Validate up
    // front and return a specific, actionable message instead.
    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    const parsedXp = xp === undefined || xp === null || xp === '' ? 50 : Number(xp);
    if (Number.isNaN(parsedXp) || parsedXp < 0) {
      return res.status(400).json({ message: 'XP must be a valid positive number' });
    }

    const allowedDifficulty = ['EASY', 'MEDIUM', 'HARD'];
    const safeDifficulty = allowedDifficulty.includes(difficulty) ? difficulty : 'MEDIUM';

    const allowedStatus = ['DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'COMPLETED', 'ARCHIVED'];
    const safeStatus = allowedStatus.includes(status) ? status : 'DRAFT';

    // Guard against a categoryId pointing at a category that no longer exists
    const parsedCategoryId = parseCategoryId(categoryId);
    if (parsedCategoryId !== null) {
      const categoryExists = await prisma.category.findUnique({ where: { id: parsedCategoryId } });
      if (!categoryExists) {
        return res.status(400).json({ message: 'Selected category no longer exists — pick another' });
      }
    }

    const challenge = await prisma.challenge.create({
      data: {
        title: String(title).trim(),
        categoryId: parsedCategoryId,
        description: description || '',
        xp: parsedXp,
        difficulty: safeDifficulty,
        evidenceRequired: evidenceRequired !== undefined ? Boolean(evidenceRequired) : true,
        deadline: parseDeadline(deadline),
        status: safeStatus,
        createdBy: req.user.id
      }
    });
    res.status(201).json(challenge);
  } catch (err) {
    console.error('Challenge creation error:', err);
    res.status(400).json({ message: err.message || 'Failed to create challenge', error: err.message });
  }
});

// Update challenge - handles the full lifecycle: Draft -> Active -> Under Review -> Completed / Archived
router.put('/challenges/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const { title, categoryId, description, xp, difficulty, evidenceRequired, deadline, status } = req.body;

    if (title !== undefined && !String(title).trim()) {
      return res.status(400).json({ message: 'Title cannot be empty' });
    }

    const data = {
      description,
      evidenceRequired: evidenceRequired !== undefined ? Boolean(evidenceRequired) : undefined,
      status,
      difficulty
    };
    if (title !== undefined) data.title = String(title).trim();
    if (xp !== undefined && xp !== '') {
      const parsedXp = Number(xp);
      if (!Number.isNaN(parsedXp)) data.xp = parsedXp;
    }
    if (categoryId !== undefined) data.categoryId = parseCategoryId(categoryId);
    if (deadline !== undefined) data.deadline = parseDeadline(deadline);

    const challenge = await prisma.challenge.update({
      where: { id: Number(req.params.id) },
      data
    });
    res.json(challenge);
  } catch (err) {
    console.error('Challenge update error:', err);
    res.status(400).json({ message: err.message || 'Failed to update challenge', error: err.message });
  }
});

router.delete('/challenges/:id', authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.challenge.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Challenge deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Failed to delete', error: err.message });
  }
});

/* ---------------- Challenge Participation ---------------- */

// Employee joins a challenge
router.post('/challenges/:id/join', async (req, res) => {
  try {
    const challengeId = Number(req.params.id);
    const participation = await prisma.challengeParticipation.create({
      data: { challengeId, employeeId: req.user.id, progress: 0 }
    });
    res.status(201).json(participation);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Already joined this challenge' });
    res.status(400).json({ message: 'Failed to join challenge', error: err.message });
  }
});

// Admin/Manager assigns a challenge to an employee
router.post('/challenges/:id/assign', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const challengeId = Number(req.params.id);
    const { employeeId } = req.body;
    if (!employeeId) return res.status(400).json({ message: 'employeeId is required' });

    const participation = await prisma.challengeParticipation.create({
      data: { challengeId, employeeId: Number(employeeId), progress: 0 }
    });
    res.status(201).json(participation);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Employee has already joined/been assigned this challenge' });
    res.status(400).json({ message: 'Failed to assign challenge', error: err.message });
  }
});

// Employee updates progress / submits proof
router.put('/challenge-participations/:id', upload.single('proof'), async (req, res) => {
  try {
    const participation = await prisma.challengeParticipation.findUnique({ where: { id: Number(req.params.id) } });
    if (!participation) return res.status(404).json({ message: 'Participation not found' });
    if (participation.employeeId !== req.user.id) return res.status(403).json({ message: 'Not your participation record' });

    const { progress } = req.body;
    const proofUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const updated = await prisma.challengeParticipation.update({
      where: { id: Number(req.params.id) },
      data: {
        progress: progress !== undefined ? Number(progress) : undefined,
        proofUrl,
        approvalStatus: 'PENDING'
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update progress', error: err.message });
  }
});

router.get('/challenge-participations', async (req, res) => {
  const { challengeId, employeeId, status } = req.query;
  const where = {};
  if (req.user.role === 'EMPLOYEE') where.employeeId = req.user.id;
  else if (employeeId) where.employeeId = Number(employeeId);
  if (challengeId) where.challengeId = Number(challengeId);
  if (status) where.approvalStatus = status;

  const participations = await prisma.challengeParticipation.findMany({
    where,
    include: { challenge: true, employee: { select: { id: true, name: true, department: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(participations);
});

// Approve/reject a challenge participation - awards XP on approval (PRD Section 4 & 3.4)
router.put('/challenge-participations/:id/review', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { decision } = req.body;
    const participation = await prisma.challengeParticipation.findUnique({
      where: { id: Number(req.params.id) },
      include: { challenge: true, employee: true }
    });
    if (!participation) return res.status(404).json({ message: 'Participation not found' });

    if (decision === 'APPROVED' && participation.challenge.evidenceRequired && !participation.proofUrl) {
      return res.status(400).json({ message: 'Cannot approve: this challenge requires proof of evidence' });
    }

    const xpAwarded = decision === 'APPROVED' ? participation.challenge.xp : 0;

    const updated = await prisma.challengeParticipation.update({
      where: { id: Number(req.params.id) },
      data: { approvalStatus: decision, xpAwarded, progress: decision === 'APPROVED' ? 100 : participation.progress, reviewedBy: req.user.id }
    });

    if (decision === 'APPROVED') {
      await prisma.user.update({
        where: { id: participation.employeeId },
        data: { xp: { increment: xpAwarded }, pointsBalance: { increment: xpAwarded } }
      });
      await checkAndAwardBadges(participation.employeeId);
      if (participation.employee.departmentId) {
        await recalculateDepartmentScore(participation.employee.departmentId);
      }
    }

    await notify(
      participation.employeeId,
      'CHALLENGE_APPROVAL_DECISION',
      `Challenge Submission ${decision}`,
      `Your submission for "${participation.challenge.title}" was ${decision.toLowerCase()}.`
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Failed to review submission', error: err.message });
  }
});

/* ---------------- Badges ---------------- */

router.get('/badges', async (req, res) => {
  const badges = await prisma.badge.findMany({ orderBy: { unlockRuleValue: 'asc' } });
  res.json(badges);
});

router.post('/badges', authorize('ADMIN'), async (req, res) => {
  try {
    const { name, description, unlockRuleType, unlockRuleValue, icon } = req.body;
    const badge = await prisma.badge.create({
      data: { name, description, unlockRuleType, unlockRuleValue: Number(unlockRuleValue), icon: icon || '🏅' }
    });
    res.status(201).json(badge);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create badge', error: err.message });
  }
});

router.get('/my-badges', async (req, res) => {
  const badges = await prisma.employeeBadge.findMany({
    where: { employeeId: req.user.id },
    include: { badge: true },
    orderBy: { awardedAt: 'desc' }
  });
  res.json(badges);
});

router.get('/employees/:id/badges', async (req, res) => {
  const badges = await prisma.employeeBadge.findMany({
    where: { employeeId: Number(req.params.id) },
    include: { badge: true },
    orderBy: { awardedAt: 'desc' }
  });
  res.json(badges);
});

/* ---------------- Rewards ---------------- */

router.get('/rewards', async (req, res) => {
  const rewards = await prisma.reward.findMany({ where: { status: 'ACTIVE' }, orderBy: { pointsRequired: 'asc' } });
  res.json(rewards);
});

router.post('/rewards', authorize('ADMIN'), async (req, res) => {
  try {
    const { name, description, pointsRequired, stock } = req.body;
    const reward = await prisma.reward.create({
      data: { name, description, pointsRequired: Number(pointsRequired), stock: Number(stock) || 0 }
    });
    res.status(201).json(reward);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create reward', error: err.message });
  }
});

router.put('/rewards/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const { name, description, pointsRequired, stock, status } = req.body;
    const reward = await prisma.reward.update({
      where: { id: Number(req.params.id) },
      data: { name, description, pointsRequired, stock, status }
    });
    res.json(reward);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update reward', error: err.message });
  }
});

// Business Rule: Reward Redemption - deducts points, subject to stock availability (Section 4)
router.post('/rewards/:id/redeem', async (req, res) => {
  try {
    const reward = await prisma.reward.findUnique({ where: { id: Number(req.params.id) } });
    if (!reward || reward.status !== 'ACTIVE') return res.status(404).json({ message: 'Reward not available' });
    if (reward.stock <= 0) return res.status(400).json({ message: 'Reward is out of stock' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (user.pointsBalance < reward.pointsRequired) {
      return res.status(400).json({ message: 'Insufficient points balance' });
    }

    const [redemption] = await prisma.$transaction([
      prisma.rewardRedemption.create({
        data: { employeeId: req.user.id, rewardId: reward.id, pointsSpent: reward.pointsRequired }
      }),
      prisma.user.update({ where: { id: req.user.id }, data: { pointsBalance: { decrement: reward.pointsRequired } } }),
      prisma.reward.update({ where: { id: reward.id }, data: { stock: { decrement: 1 } } })
    ]);

    res.status(201).json(redemption);
  } catch (err) {
    res.status(400).json({ message: 'Failed to redeem reward', error: err.message });
  }
});

router.get('/redemptions', async (req, res) => {
  const where = req.user.role === 'EMPLOYEE' ? { employeeId: req.user.id } : {};
  const redemptions = await prisma.rewardRedemption.findMany({
    where,
    include: { reward: true, employee: { select: { id: true, name: true } } },
    orderBy: { redeemedAt: 'desc' }
  });
  res.json(redemptions);
});

/* ---------------- Leaderboard ---------------- */

router.get('/leaderboard', async (req, res) => {
  const { scope } = req.query; // 'employee' (default) | 'department'

  if (scope === 'department') {
    const departments = await prisma.department.findMany({
      where: { status: 'ACTIVE' },
      include: { users: { select: { xp: true } } }
    });
    const ranking = departments
      .map((d) => ({
        departmentId: d.id,
        departmentName: d.name,
        totalXp: d.users.reduce((sum, u) => sum + u.xp, 0)
      }))
      .sort((a, b) => b.totalXp - a.totalXp);
    return res.json(ranking);
  }

  const employees = await prisma.user.findMany({
    where: { role: { in: ['EMPLOYEE', 'MANAGER'] }, status: 'ACTIVE' },
    select: { id: true, name: true, xp: true, department: { select: { name: true } } },
    orderBy: { xp: 'desc' },
    take: 50
  });
  res.json(employees);
});

module.exports = router;