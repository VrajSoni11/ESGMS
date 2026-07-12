const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

/* ---------------- Departments ---------------- */

router.get('/departments', async (req, res) => {
  const departments = await prisma.department.findMany({
    include: { head: { select: { id: true, name: true } }, parentDepartment: true, _count: { select: { users: true } } },
    orderBy: { name: 'asc' }
  });
  res.json(departments);
});

router.post('/departments', authorize('ADMIN'), async (req, res) => {
  try {
    const { name, code, headId, parentDepartmentId } = req.body;
    const department = await prisma.department.create({
      data: {
        name, code,
        headId: headId ? Number(headId) : null,
        parentDepartmentId: parentDepartmentId ? Number(parentDepartmentId) : null
      }
    });
    res.status(201).json(department);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create department', error: err.message });
  }
});

router.put('/departments/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const { name, code, headId, parentDepartmentId, status } = req.body;
    const department = await prisma.department.update({
      where: { id: Number(req.params.id) },
      data: {
        name, code, status,
        headId: headId ? Number(headId) : undefined,
        parentDepartmentId: parentDepartmentId ? Number(parentDepartmentId) : undefined
      }
    });
    res.json(department);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update department', error: err.message });
  }
});

router.delete('/departments/:id', authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.department.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Department deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Failed to delete department', error: err.message });
  }
});

/* ---------------- Categories ---------------- */

router.get('/categories', async (req, res) => {
  const { type } = req.query;
  const where = type ? { type } : {};
  const categories = await prisma.category.findMany({ where, orderBy: { name: 'asc' } });
  res.json(categories);
});

router.post('/categories', authorize('ADMIN'), async (req, res) => {
  try {
    const { name, type } = req.body;
    const category = await prisma.category.create({ data: { name, type } });
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create category', error: err.message });
  }
});

router.put('/categories/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const { name, status } = req.body;
    const category = await prisma.category.update({ where: { id: Number(req.params.id) }, data: { name, status } });
    res.json(category);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update category', error: err.message });
  }
});

router.delete('/categories/:id', authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Failed to delete category', error: err.message });
  }
});

/* ---------------- Products (ESG Profiles) ---------------- */

router.get('/products', async (req, res) => {
  const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
  res.json(products);
});

router.post('/products', authorize('ADMIN'), async (req, res) => {
  try {
    const { name, sku, esgAttributes } = req.body;
    const product = await prisma.product.create({ data: { name, sku, esgAttributes: esgAttributes || {} } });
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create product', error: err.message });
  }
});

module.exports = router;
