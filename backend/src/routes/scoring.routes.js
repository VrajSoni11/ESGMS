const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { recalculateAllScores, recalculateDepartmentScore, getOverallEsgScore } = require('../utils/scoringEngine');

const router = express.Router();
router.use(authenticate);

// GET all department scores
router.get('/department-scores', async (req, res) => {
  const scores = await prisma.departmentScore.findMany({ include: { department: true } });
  res.json(scores);
});

// GET single department score
router.get('/department-scores/:departmentId', async (req, res) => {
  const score = await prisma.departmentScore.findUnique({
    where: { departmentId: Number(req.params.departmentId) },
    include: { department: true }
  });
  if (!score) return res.status(404).json({ message: 'No score calculated yet for this department' });
  res.json(score);
});

// Force recalculation of a single department's score
router.post('/department-scores/:departmentId/recalculate', authorize('ADMIN'), async (req, res) => {
  try {
    const score = await recalculateDepartmentScore(Number(req.params.departmentId));
    res.json(score);
  } catch (err) {
    res.status(400).json({ message: 'Failed to recalculate score', error: err.message });
  }
});

// Force recalculation of ALL department scores + overall ESG score
router.post('/recalculate-all', authorize('ADMIN'), async (req, res) => {
  try {
    const scores = await recalculateAllScores();
    const overall = await getOverallEsgScore();
    res.json({ departmentScores: scores, overall });
  } catch (err) {
    res.status(400).json({ message: 'Failed to recalculate scores', error: err.message });
  }
});

// GET overall ESG score (weighted roll-up)
router.get('/overall', async (req, res) => {
  const overall = await getOverallEsgScore();
  res.json(overall);
});

// Department rankings (bonus feature from PRD Section 10)
router.get('/department-rankings', async (req, res) => {
  const scores = await prisma.departmentScore.findMany({
    include: { department: true },
    orderBy: { totalScore: 'desc' }
  });
  res.json(scores);
});

module.exports = router;
