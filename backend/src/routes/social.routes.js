const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { recalculateDepartmentScore } = require('../utils/scoringEngine');
const { checkAndAwardBadges } = require('../utils/gamification');
const { notify } = require('../utils/notify');

const router = express.Router();
router.use(authenticate);

/* ---------------- CSR Activities ---------------- */

router.get('/csr-activities', async (req, res) => {
  const activities = await prisma.csrActivity.findMany({
    include: { category: true, _count: { select: { participations: true } } },
    orderBy: { activityDate: 'desc' }
  });
  res.json(activities);
});

router.post('/csr-activities', authorize('ADMIN'), async (req, res) => {
  try {
    const { title, categoryId, description, activityDate, pointsReward, status } = req.body;
    const activity = await prisma.csrActivity.create({
      data: {
        title,
        categoryId: categoryId ? Number(categoryId) : null,
        description,
        activityDate: activityDate ? new Date(activityDate) : null,
        pointsReward: pointsReward || 10,
        status: status || 'ACTIVE',
        createdBy: req.user.id
      }
    });
    res.status(201).json(activity);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create CSR activity', error: err.message });
  }
});

router.put('/csr-activities/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const { title, categoryId, description, activityDate, pointsReward, status } = req.body;
    const activity = await prisma.csrActivity.update({
      where: { id: Number(req.params.id) },
      data: {
        title, description, pointsReward, status,
        categoryId: categoryId ? Number(categoryId) : undefined,
        activityDate: activityDate ? new Date(activityDate) : undefined
      }
    });
    res.json(activity);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update CSR activity', error: err.message });
  }
});

router.delete('/csr-activities/:id', authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.csrActivity.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'CSR activity deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Failed to delete', error: err.message });
  }
});

/* ---------------- Employee Participation ---------------- */

// Employee joins/submits participation in a CSR activity, optionally with proof file
router.post('/participations', upload.single('proof'), async (req, res) => {
  try {
    const { activityId } = req.body;
    const proofUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const participation = await prisma.employeeParticipation.create({
      data: {
        employeeId: req.user.id,
        activityId: Number(activityId),
        proofUrl,
        completionDate: new Date()
      }
    });
    res.status(201).json(participation);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ message: 'You have already joined/submitted this activity' });
    }
    res.status(400).json({ message: 'Failed to submit participation', error: err.message });
  }
});

router.get('/participations', async (req, res) => {
  const { employeeId, activityId, status } = req.query;
  const where = {};
  if (req.user.role === 'EMPLOYEE') where.employeeId = req.user.id;
  else if (employeeId) where.employeeId = Number(employeeId);
  if (activityId) where.activityId = Number(activityId);
  if (status) where.approvalStatus = status;

  const participations = await prisma.employeeParticipation.findMany({
    where,
    include: {
      employee: { select: { id: true, name: true, email: true, department: true } },
      activity: true
    },
    orderBy: { createdAt: 'desc' }
  });
  res.json(participations);
});

// Approve / reject participation (Admin/Manager). Enforces Evidence Requirement toggle.
router.put('/participations/:id/review', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { decision } = req.body; // 'APPROVED' | 'REJECTED'
    const participation = await prisma.employeeParticipation.findUnique({
      where: { id: Number(req.params.id) },
      include: { activity: true, employee: true }
    });
    if (!participation) return res.status(404).json({ message: 'Participation not found' });

    if (decision === 'APPROVED') {
      const toggleRow = await prisma.setting.findUnique({ where: { key: 'feature_toggles' } });
      const toggles = toggleRow ? toggleRow.value : { evidenceRequirement: true };
      if (toggles.evidenceRequirement && !participation.proofUrl) {
        return res.status(400).json({ message: 'Cannot approve: proof file is required by Evidence Requirement setting' });
      }
    }

    const pointsEarned = decision === 'APPROVED' ? participation.activity.pointsReward : 0;

    const updated = await prisma.employeeParticipation.update({
      where: { id: Number(req.params.id) },
      data: { approvalStatus: decision, pointsEarned, reviewedBy: req.user.id }
    });

    if (decision === 'APPROVED') {
      await prisma.user.update({
        where: { id: participation.employeeId },
        data: {
          pointsBalance: { increment: pointsEarned },
          xp: { increment: pointsEarned }
        }
      });
      await checkAndAwardBadges(participation.employeeId);
      if (participation.employee.departmentId) {
        await recalculateDepartmentScore(participation.employee.departmentId);
      }
    }

    await notify(
      participation.employeeId,
      'CSR_APPROVAL_DECISION',
      `CSR Submission ${decision}`,
      `Your submission for "${participation.activity.title}" was ${decision.toLowerCase()}.`
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Failed to review participation', error: err.message });
  }
});

/* ---------------- Training Completions ---------------- */

router.get('/trainings', async (req, res) => {
  const where = req.user.role === 'EMPLOYEE' ? { employeeId: req.user.id } : {};
  const trainings = await prisma.trainingCompletion.findMany({
    where,
    include: { employee: { select: { id: true, name: true, department: true } } },
    orderBy: { completedDate: 'desc' }
  });
  res.json(trainings);
});

router.post('/trainings', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { employeeId, trainingName, completedDate } = req.body;
    const training = await prisma.trainingCompletion.create({
      data: {
        employeeId: Number(employeeId),
        trainingName,
        completedDate: completedDate ? new Date(completedDate) : new Date()
      }
    });
    const employee = await prisma.user.findUnique({ where: { id: Number(employeeId) } });
    if (employee?.departmentId) await recalculateDepartmentScore(employee.departmentId);
    res.status(201).json(training);
  } catch (err) {
    res.status(400).json({ message: 'Failed to record training', error: err.message });
  }
});

/* ---------------- Diversity Metrics ---------------- */

router.get('/diversity-metrics', async (req, res) => {
  const { departmentId } = req.query;
  const where = departmentId ? { departmentId: Number(departmentId) } : {};
  const metrics = await prisma.diversityMetric.findMany({ where, include: { department: true }, orderBy: { recordedDate: 'desc' } });
  res.json(metrics);
});

router.post('/diversity-metrics', authorize('ADMIN'), async (req, res) => {
  try {
    const { departmentId, metricName, metricValue, recordedDate } = req.body;
    const metric = await prisma.diversityMetric.create({
      data: {
        departmentId: departmentId ? Number(departmentId) : null,
        metricName,
        metricValue,
        recordedDate: recordedDate ? new Date(recordedDate) : new Date()
      }
    });
    res.status(201).json(metric);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create diversity metric', error: err.message });
  }
});

/* ---------------- Social Dashboard ---------------- */

router.get('/dashboard', async (req, res) => {
  const totalParticipations = await prisma.employeeParticipation.count();
  const approved = await prisma.employeeParticipation.count({ where: { approvalStatus: 'APPROVED' } });
  const pending = await prisma.employeeParticipation.count({ where: { approvalStatus: 'PENDING' } });
  const totalTrainings = await prisma.trainingCompletion.count();
  const activitiesCount = await prisma.csrActivity.count({ where: { status: 'ACTIVE' } });

  res.json({ totalParticipations, approved, pending, totalTrainings, activeCsrActivities: activitiesCount });
});

module.exports = router;
