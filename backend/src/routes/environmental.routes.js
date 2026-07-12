const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { recalculateDepartmentScore } = require('../utils/scoringEngine');

const router = express.Router();
router.use(authenticate);

/* ---------------- Emission Factors (Admin configures) ---------------- */

router.get('/emission-factors', async (req, res) => {
  const factors = await prisma.emissionFactor.findMany({ orderBy: { id: 'asc' } });
  res.json(factors);
});

router.post('/emission-factors', authorize('ADMIN'), async (req, res) => {
  try {
    const { activityType, unit, co2eFactor, description } = req.body;
    const factor = await prisma.emissionFactor.create({
      data: { activityType, unit, co2eFactor, description }
    });
    res.status(201).json(factor);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create emission factor', error: err.message });
  }
});

router.put('/emission-factors/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const { activityType, unit, co2eFactor, description, status } = req.body;
    const factor = await prisma.emissionFactor.update({
      where: { id: Number(req.params.id) },
      data: { activityType, unit, co2eFactor, description, status }
    });
    res.json(factor);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update emission factor', error: err.message });
  }
});

router.delete('/emission-factors/:id', authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.emissionFactor.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Emission factor deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Failed to delete', error: err.message });
  }
});

/* ---------------- Carbon Transactions ---------------- */

router.get('/carbon-transactions', async (req, res) => {
  const { departmentId } = req.query;
  const where = departmentId ? { departmentId: Number(departmentId) } : {};
  const transactions = await prisma.carbonTransaction.findMany({
    where,
    include: { department: true, emissionFactor: true, creator: { select: { id: true, name: true } } },
    orderBy: { txnDate: 'desc' }
  });
  res.json(transactions);
});

// Create a carbon transaction. Supports Auto Emission Calculation toggle (PRD Section 4):
// when enabled and quantity + emissionFactorId given, co2eValue = quantity * factor.
router.post('/carbon-transactions', authorize('ADMIN'), async (req, res) => {
  try {
    const { sourceType, sourceRecord, emissionFactorId, quantity, departmentId, txnDate, co2eValue: manualValue } = req.body;

    const toggleRow = await prisma.setting.findUnique({ where: { key: 'feature_toggles' } });
    const toggles = toggleRow ? toggleRow.value : { autoEmissionCalculation: true };

    let co2eValue = manualValue;
    let autoCalculated = false;

    if (toggles.autoEmissionCalculation && emissionFactorId) {
      const factor = await prisma.emissionFactor.findUnique({ where: { id: Number(emissionFactorId) } });
      if (factor) {
        co2eValue = Number(factor.co2eFactor) * Number(quantity || 1);
        autoCalculated = true;
      }
    }

    if (co2eValue === undefined || co2eValue === null) {
      return res.status(400).json({ message: 'co2eValue could not be determined; provide emissionFactorId+quantity or a manual co2eValue' });
    }

    const txn = await prisma.carbonTransaction.create({
      data: {
        sourceType,
        sourceRecord,
        emissionFactorId: emissionFactorId ? Number(emissionFactorId) : null,
        quantity: quantity || 1,
        co2eValue,
        departmentId: departmentId ? Number(departmentId) : null,
        autoCalculated,
        txnDate: txnDate ? new Date(txnDate) : new Date(),
        createdBy: req.user.id
      }
    });

    if (txn.departmentId) await recalculateDepartmentScore(txn.departmentId);

    res.status(201).json(txn);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create carbon transaction', error: err.message });
  }
});

router.delete('/carbon-transactions/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const txn = await prisma.carbonTransaction.delete({ where: { id: Number(req.params.id) } });
    if (txn.departmentId) await recalculateDepartmentScore(txn.departmentId);
    res.json({ message: 'Transaction deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Failed to delete', error: err.message });
  }
});

// Department Carbon Tracking - aggregated emissions per department
router.get('/department-carbon-summary', async (req, res) => {
  const departments = await prisma.department.findMany({ where: { status: 'ACTIVE' } });
  const summary = await Promise.all(
    departments.map(async (dept) => {
      const txns = await prisma.carbonTransaction.findMany({ where: { departmentId: dept.id } });
      const total = txns.reduce((sum, t) => sum + Number(t.co2eValue), 0);
      return { departmentId: dept.id, departmentName: dept.name, totalCo2e: Math.round(total * 100) / 100, transactionCount: txns.length };
    })
  );
  res.json(summary);
});

/* ---------------- Sustainability Goals ---------------- */

router.get('/goals', async (req, res) => {
  const goals = await prisma.environmentalGoal.findMany({ include: { department: true }, orderBy: { deadline: 'asc' } });
  res.json(goals);
});

router.post('/goals', authorize('ADMIN'), async (req, res) => {
  try {
    const { departmentId, metric, targetValue, deadline } = req.body;
    const goal = await prisma.environmentalGoal.create({
      data: { departmentId: departmentId ? Number(departmentId) : null, metric, targetValue, deadline: new Date(deadline) }
    });
    if (goal.departmentId) await recalculateDepartmentScore(goal.departmentId);
    res.status(201).json(goal);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create goal', error: err.message });
  }
});

router.put('/goals/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const { metric, targetValue, deadline } = req.body;
    const goal = await prisma.environmentalGoal.update({
      where: { id: Number(req.params.id) },
      data: { metric, targetValue, deadline: deadline ? new Date(deadline) : undefined }
    });
    if (goal.departmentId) await recalculateDepartmentScore(goal.departmentId);
    res.json(goal);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update goal', error: err.message });
  }
});

router.delete('/goals/:id', authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.environmentalGoal.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Goal deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Failed to delete', error: err.message });
  }
});

/* ---------------- Environmental Dashboard ---------------- */

router.get('/dashboard', async (req, res) => {
  const transactions = await prisma.carbonTransaction.findMany({
    include: { department: true },
    orderBy: { txnDate: 'asc' }
  });

  const bySource = {};
  const byDepartment = {};
  const byMonth = {};

  for (const t of transactions) {
    const val = Number(t.co2eValue);
    bySource[t.sourceType] = (bySource[t.sourceType] || 0) + val;
    const deptName = t.department ? t.department.name : 'Unassigned';
    byDepartment[deptName] = (byDepartment[deptName] || 0) + val;
    const month = t.txnDate.toISOString().slice(0, 7);
    byMonth[month] = (byMonth[month] || 0) + val;
  }

  const goals = await prisma.environmentalGoal.findMany({ include: { department: true } });

  res.json({
    totalCo2e: Math.round(transactions.reduce((s, t) => s + Number(t.co2eValue), 0) * 100) / 100,
    bySource,
    byDepartment,
    byMonth,
    goals
  });
});

module.exports = router;
