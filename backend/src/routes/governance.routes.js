const express = require('express');
const prisma = require('../config/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { recalculateDepartmentScore } = require('../utils/scoringEngine');
const { notify, notifyAdmins } = require('../utils/notify');

const router = express.Router();
router.use(authenticate);

/* ---------------- ESG Policies ---------------- */

router.get('/policies', async (req, res) => {
  const policies = await prisma.esgPolicy.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(policies);
});

router.post('/policies', authorize('ADMIN'), async (req, res) => {
  try {
    const { title, description, category, version, status } = req.body;
    const policy = await prisma.esgPolicy.create({
      data: { title, description, category, version: version || '1.0', status: status || 'DRAFT', createdBy: req.user.id }
    });

    // If published immediately, create pending acknowledgement rows for all employees
    if (policy.status === 'PUBLISHED') {
      const employees = await prisma.user.findMany({ where: { role: { in: ['EMPLOYEE', 'MANAGER'] }, status: 'ACTIVE' } });
      await Promise.all(
        employees.map((e) =>
          prisma.policyAcknowledgement.create({ data: { employeeId: e.id, policyId: policy.id } }).catch(() => null)
        )
      );
    }

    res.status(201).json(policy);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create policy', error: err.message });
  }
});

router.put('/policies/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const { title, description, category, version, status } = req.body;
    const prevPolicy = await prisma.esgPolicy.findUnique({ where: { id: Number(req.params.id) } });
    const policy = await prisma.esgPolicy.update({
      where: { id: Number(req.params.id) },
      data: { title, description, category, version, status }
    });

    // Newly published -> generate acknowledgement rows if not already present
    if (prevPolicy.status !== 'PUBLISHED' && policy.status === 'PUBLISHED') {
      const employees = await prisma.user.findMany({ where: { role: { in: ['EMPLOYEE', 'MANAGER'] }, status: 'ACTIVE' } });
      await Promise.all(
        employees.map((e) =>
          prisma.policyAcknowledgement.create({ data: { employeeId: e.id, policyId: policy.id } }).catch(() => null)
        )
      );
    }

    res.json(policy);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update policy', error: err.message });
  }
});

router.delete('/policies/:id', authorize('ADMIN'), async (req, res) => {
  try {
    await prisma.esgPolicy.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Policy deleted' });
  } catch (err) {
    res.status(400).json({ message: 'Failed to delete', error: err.message });
  }
});

/* ---------------- Policy Acknowledgements ---------------- */

router.get('/acknowledgements', async (req, res) => {
  const where = req.user.role === 'EMPLOYEE' ? { employeeId: req.user.id } : {};
  const acks = await prisma.policyAcknowledgement.findMany({
    where,
    include: { policy: true, employee: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' }
  });
  res.json(acks);
});

// Employee acknowledges a policy
router.put('/acknowledgements/:id/acknowledge', async (req, res) => {
  try {
    const ack = await prisma.policyAcknowledgement.findUnique({ where: { id: Number(req.params.id) } });
    if (!ack) return res.status(404).json({ message: 'Acknowledgement not found' });
    if (ack.employeeId !== req.user.id) return res.status(403).json({ message: 'Not your acknowledgement' });

    const updated = await prisma.policyAcknowledgement.update({
      where: { id: Number(req.params.id) },
      data: { status: 'ACKNOWLEDGED', acknowledgedDate: new Date() }
    });

    const employee = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (employee?.departmentId) await recalculateDepartmentScore(employee.departmentId);

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: 'Failed to acknowledge policy', error: err.message });
  }
});

// Admin triggers reminder notifications for pending acknowledgements
router.post('/acknowledgements/send-reminders', authorize('ADMIN'), async (req, res) => {
  try {
    const pending = await prisma.policyAcknowledgement.findMany({
      where: { status: 'PENDING' },
      include: { policy: true }
    });
    await Promise.all(
      pending.map((p) =>
        notify(p.employeeId, 'POLICY_ACK_REMINDER', 'Policy Acknowledgement Pending', `Please acknowledge: ${p.policy.title}`)
      )
    );
    res.json({ message: `Sent ${pending.length} reminder(s)` });
  } catch (err) {
    res.status(400).json({ message: 'Failed to send reminders', error: err.message });
  }
});

/* ---------------- Audits ---------------- */

router.get('/audits', async (req, res) => {
  const audits = await prisma.audit.findMany({
    include: { _count: { select: { complianceIssues: true } } },
    orderBy: { auditDate: 'desc' }
  });
  res.json(audits);
});

router.post('/audits', authorize('ADMIN'), async (req, res) => {
  try {
    const { title, scope, auditDate, auditor, status } = req.body;
    const audit = await prisma.audit.create({
      data: {
        title, scope, auditor,
        auditDate: auditDate ? new Date(auditDate) : null,
        status: status || 'SCHEDULED',
        createdBy: req.user.id
      }
    });
    res.status(201).json(audit);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create audit', error: err.message });
  }
});

router.put('/audits/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const { title, scope, auditDate, auditor, status } = req.body;
    const audit = await prisma.audit.update({
      where: { id: Number(req.params.id) },
      data: { title, scope, auditor, status, auditDate: auditDate ? new Date(auditDate) : undefined }
    });
    res.json(audit);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update audit', error: err.message });
  }
});

/* ---------------- Compliance Issues ---------------- */

router.get('/compliance-issues', async (req, res) => {
  const { status } = req.query;
  const where = status ? { status } : {};
  const issues = await prisma.complianceIssue.findMany({
    where,
    include: { audit: true, owner: { select: { id: true, name: true, department: true } } },
    orderBy: { dueDate: 'asc' }
  });
  res.json(issues);
});

// Business Rule: Compliance Issue Ownership - must have Owner + Due Date (Section 4)
router.post('/compliance-issues', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { auditId, severity, description, ownerId, dueDate } = req.body;
    if (!ownerId || !dueDate) {
      return res.status(400).json({ message: 'Owner and Due Date are mandatory for a Compliance Issue' });
    }

    const issue = await prisma.complianceIssue.create({
      data: {
        auditId: auditId ? Number(auditId) : null,
        severity: severity || 'MEDIUM',
        description,
        ownerId: Number(ownerId),
        dueDate: new Date(dueDate),
        status: 'OPEN'
      }
    });

    await notify(Number(ownerId), 'COMPLIANCE_ISSUE_RAISED', 'New Compliance Issue Assigned', description);
    await notifyAdmins('COMPLIANCE_ISSUE_RAISED', 'New Compliance Issue Raised', description);

    const owner = await prisma.user.findUnique({ where: { id: Number(ownerId) } });
    if (owner?.departmentId) await recalculateDepartmentScore(owner.departmentId);

    res.status(201).json(issue);
  } catch (err) {
    res.status(400).json({ message: 'Failed to create compliance issue', error: err.message });
  }
});

router.put('/compliance-issues/:id', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { severity, description, ownerId, dueDate, status } = req.body;
    const issue = await prisma.complianceIssue.update({
      where: { id: Number(req.params.id) },
      data: {
        severity, description, status,
        ownerId: ownerId ? Number(ownerId) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined
      }
    });

    const owner = await prisma.user.findUnique({ where: { id: issue.ownerId } });
    if (owner?.departmentId) await recalculateDepartmentScore(owner.departmentId);

    res.json(issue);
  } catch (err) {
    res.status(400).json({ message: 'Failed to update compliance issue', error: err.message });
  }
});

/* ---------------- Governance Dashboard ---------------- */

router.get('/dashboard', async (req, res) => {
  const totalPolicies = await prisma.esgPolicy.count({ where: { status: 'PUBLISHED' } });
  const totalAcks = await prisma.policyAcknowledgement.count();
  const acknowledgedCount = await prisma.policyAcknowledgement.count({ where: { status: 'ACKNOWLEDGED' } });
  const openIssues = await prisma.complianceIssue.count({ where: { status: 'OPEN' } });
  const overdueIssues = await prisma.complianceIssue.count({ where: { status: 'FLAGGED_OVERDUE' } });
  const totalAudits = await prisma.audit.count();

  res.json({
    totalPolicies,
    acknowledgementRate: totalAcks > 0 ? Math.round((acknowledgedCount / totalAcks) * 100) : 0,
    openIssues,
    overdueIssues,
    totalAudits
  });
});

module.exports = router;
