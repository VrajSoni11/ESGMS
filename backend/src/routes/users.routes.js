const express = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// List all users (Admin/Manager) - useful for assigning owners, reviewing submissions etc.
router.get('/', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  const { departmentId, role } = req.query;
  const where = {};
  if (departmentId) where.departmentId = Number(departmentId);
  if (role) where.role = role;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true, name: true, email: true, role: true, xp: true, pointsBalance: true,
      status: true, department: true, createdAt: true
    },
    orderBy: { name: 'asc' }
  });
  res.json(users);
});

router.get('/:id', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.params.id) },
    select: {
      id: true, name: true, email: true, role: true, xp: true, pointsBalance: true,
      status: true, department: true, createdAt: true
    }
  });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// Admin can create a user from the app too (optional convenience; DB direct insert also supported)
router.post('/', authorize('ADMIN'), async (req, res) => {
  try {
    const { name, email, password, role, departmentId } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name, email, passwordHash,
        role: role || 'EMPLOYEE',
        departmentId: departmentId ? Number(departmentId) : null
      }
    });

    if (user.departmentId) {
      await prisma.department.update({
        where: { id: user.departmentId },
        data: { employeeCount: { increment: 1 } }
      });
    }

    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'Email already in use' });
    res.status(400).json({ message: 'Failed to create user', error: err.message });
  }
});

router.put('/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const { name, role, departmentId, status } = req.body;
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: {
        name, role, status,
        departmentId: departmentId !== undefined ? Number(departmentId) : undefined
      }
    });
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update user', error: err.message });
  }
});

router.delete('/:id', authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.user.update({ where: { id: Number(req.params.id) }, data: { status: 'INACTIVE' } });
    res.json({ message: 'User deactivated' });
  } catch (err) {
    res.status(400).json({ message: 'Failed to deactivate user', error: err.message });
  }
});

module.exports = router;
