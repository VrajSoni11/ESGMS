const express = require('express');
const prisma = require('../config/prisma');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100
  });
  res.json(notifications);
});

router.get('/unread-count', async (req, res) => {
  const count = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });
  res.json({ count });
});

router.put('/:id/read', async (req, res) => {
  const notification = await prisma.notification.updateMany({
    where: { id: Number(req.params.id), userId: req.user.id },
    data: { isRead: true }
  });
  res.json({ updated: notification.count });
});

router.put('/read-all', async (req, res) => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true }
  });
  res.json({ updated: result.count });
});

module.exports = router;
