const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { recalculateAllScores } = require('../utils/scoringEngine');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const settings = await prisma.setting.findMany();
  const map = {};
  settings.forEach((s) => { map[s.key] = s.value; });
  res.json(map);
});

router.get('/:key', async (req, res) => {
  const setting = await prisma.setting.findUnique({ where: { key: req.params.key } });
  if (!setting) return res.status(404).json({ message: 'Setting not found' });
  res.json(setting);
});

// Update ESG pillar weightings (must sum to 1.0) - Section 3.7 & 3.5
router.put('/esg-weights', authorize('ADMIN'), async (req, res) => {
  try {
    const { environmental, social, governance } = req.body;
    const sum = Number(environmental) + Number(social) + Number(governance);
    if (Math.abs(sum - 1) > 0.01) {
      return res.status(400).json({ message: 'Weights must sum to 1.0 (100%)' });
    }
    const setting = await prisma.setting.update({
      where: { key: 'esg_weights' },
      data: { value: { environmental: Number(environmental), social: Number(social), governance: Number(governance) } }
    });
    res.json(setting);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update weights', error: err.message });
  }
});

// Toggle feature flags - Auto Emission Calculation, Evidence Requirement, Badge Auto-Award
router.put('/feature-toggles', authorize('ADMIN'), async (req, res) => {
  try {
    const { autoEmissionCalculation, evidenceRequirement, badgeAutoAward } = req.body;
    const current = await prisma.setting.findUnique({ where: { key: 'feature_toggles' } });
    const merged = {
      ...current.value,
      ...(autoEmissionCalculation !== undefined && { autoEmissionCalculation }),
      ...(evidenceRequirement !== undefined && { evidenceRequirement }),
      ...(badgeAutoAward !== undefined && { badgeAutoAward })
    };
    const setting = await prisma.setting.update({ where: { key: 'feature_toggles' }, data: { value: merged } });
    res.json(setting);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update toggles', error: err.message });
  }
});

// Notification channel settings
router.put('/notification-channels', authorize('ADMIN'), async (req, res) => {
  try {
    const { inApp, email } = req.body;
    const current = await prisma.setting.findUnique({ where: { key: 'notification_channels' } });
    const merged = {
      ...current.value,
      ...(inApp !== undefined && { inApp }),
      ...(email !== undefined && { email })
    };
    const setting = await prisma.setting.update({ where: { key: 'notification_channels' }, data: { value: merged } });
    res.json(setting);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update notification settings', error: err.message });
  }
});

module.exports = router;
