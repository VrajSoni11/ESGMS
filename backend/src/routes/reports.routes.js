const express = require('express');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const prisma = require('../config/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { getOverallEsgScore } = require('../utils/scoringEngine');

const router = express.Router();
router.use(authenticate);
router.use(authorize('ADMIN', 'MANAGER'));

/* Helpers to send data in requested format */
function sendCsv(res, filename, rows) {
  if (rows.length === 0) rows = [{ message: 'No data available for selected filters' }];
  const parser = new Parser();
  const csv = parser.parse(rows);
  res.header('Content-Type', 'text/csv');
  res.attachment(`${filename}.csv`);
  res.send(csv);
}

async function sendExcel(res, filename, rows, sheetName = 'Report') {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  if (rows.length > 0) {
    sheet.columns = Object.keys(rows[0]).map((k) => ({ header: k, key: k, width: 22 }));
    sheet.addRows(rows);
  } else {
    sheet.addRow(['No data available for selected filters']);
  }
  res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.attachment(`${filename}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}

function sendPdf(res, filename, title, rows) {
  res.header('Content-Type', 'application/pdf');
  res.attachment(`${filename}.pdf`);
  const doc = new PDFDocument({ margin: 40 });
  doc.pipe(res);
  doc.fontSize(18).text(title, { align: 'center' });
  doc.moveDown();
  doc.fontSize(9);
  if (rows.length === 0) {
    doc.text('No data available for selected filters.');
  } else {
    const keys = Object.keys(rows[0]);
    doc.font('Helvetica-Bold').text(keys.join(' | '));
    doc.font('Helvetica');
    rows.forEach((row) => {
      doc.text(keys.map((k) => String(row[k] ?? '')).join(' | '));
    });
  }
  doc.end();
}

async function respondInFormat(req, res, filename, title, rows) {
  const format = (req.query.format || 'csv').toLowerCase();
  if (format === 'excel' || format === 'xlsx') return sendExcel(res, filename, rows, title);
  if (format === 'pdf') return sendPdf(res, filename, title, rows);
  return sendCsv(res, filename, rows);
}

/* ---------------- Pre-built Reports ---------------- */

router.get('/environmental', async (req, res) => {
  const transactions = await prisma.carbonTransaction.findMany({
    include: { department: true, emissionFactor: true },
    orderBy: { txnDate: 'desc' }
  });
  const rows = transactions.map((t) => ({
    Date: t.txnDate.toISOString().slice(0, 10),
    Department: t.department?.name || 'N/A',
    SourceType: t.sourceType,
    SourceRecord: t.sourceRecord || '',
    Quantity: Number(t.quantity),
    CO2eValue: Number(t.co2eValue),
    AutoCalculated: t.autoCalculated ? 'Yes' : 'No'
  }));
  await respondInFormat(req, res, 'environmental_report', 'Environmental Report', rows);
});

router.get('/social', async (req, res) => {
  const participations = await prisma.employeeParticipation.findMany({
    include: { employee: { include: { department: true } }, activity: true },
    orderBy: { createdAt: 'desc' }
  });
  const rows = participations.map((p) => ({
    Employee: p.employee.name,
    Department: p.employee.department?.name || 'N/A',
    Activity: p.activity.title,
    Status: p.approvalStatus,
    PointsEarned: p.pointsEarned,
    CompletionDate: p.completionDate ? p.completionDate.toISOString().slice(0, 10) : ''
  }));
  await respondInFormat(req, res, 'social_report', 'Social Report', rows);
});

router.get('/governance', async (req, res) => {
  const issues = await prisma.complianceIssue.findMany({
    include: { audit: true, owner: { include: { department: true } } },
    orderBy: { dueDate: 'asc' }
  });
  const rows = issues.map((i) => ({
    Audit: i.audit?.title || 'N/A',
    Severity: i.severity,
    Description: i.description,
    Owner: i.owner?.name || 'Unassigned',
    Department: i.owner?.department?.name || 'N/A',
    DueDate: i.dueDate.toISOString().slice(0, 10),
    Status: i.status
  }));
  await respondInFormat(req, res, 'governance_report', 'Governance Report', rows);
});

router.get('/esg-summary', async (req, res) => {
  const overall = await getOverallEsgScore();
  const deptScores = await prisma.departmentScore.findMany({ include: { department: true } });
  const rows = deptScores.map((d) => ({
    Department: d.department.name,
    EnvironmentalScore: Number(d.environmentalScore),
    SocialScore: Number(d.socialScore),
    GovernanceScore: Number(d.governanceScore),
    TotalScore: Number(d.totalScore)
  }));
  rows.push({
    Department: 'ORG-WIDE OVERALL',
    EnvironmentalScore: overall.environmentalAvg,
    SocialScore: overall.socialAvg,
    GovernanceScore: overall.governanceAvg,
    TotalScore: overall.overallScore
  });
  await respondInFormat(req, res, 'esg_summary_report', 'ESG Summary Report', rows);
});

/* ---------------- Custom Report Builder ---------------- */
// Supported filters: department, dateRange (start/end), module, employee, challenge, category

router.get('/custom', async (req, res) => {
  try {
    const { module, departmentId, employeeId, startDate, endDate, challengeId, categoryId } = req.query;
    let rows = [];
    let title = 'Custom ESG Report';

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    if (module === 'environmental') {
      const where = {};
      if (departmentId) where.departmentId = Number(departmentId);
      if (startDate || endDate) where.txnDate = dateFilter;
      const data = await prisma.carbonTransaction.findMany({ where, include: { department: true } });
      rows = data.map((t) => ({
        Date: t.txnDate.toISOString().slice(0, 10),
        Department: t.department?.name || 'N/A',
        SourceType: t.sourceType,
        CO2eValue: Number(t.co2eValue)
      }));
    } else if (module === 'social') {
      const where = {};
      if (employeeId) where.employeeId = Number(employeeId);
      if (categoryId) where.activity = { categoryId: Number(categoryId) };
      const data = await prisma.employeeParticipation.findMany({ where, include: { employee: true, activity: true } });
      rows = data.map((p) => ({
        Employee: p.employee.name,
        Activity: p.activity.title,
        Status: p.approvalStatus,
        PointsEarned: p.pointsEarned
      }));
    } else if (module === 'governance') {
      const where = {};
      if (startDate || endDate) where.dueDate = dateFilter;
      const data = await prisma.complianceIssue.findMany({ where, include: { owner: true, audit: true } });
      rows = data.map((i) => ({
        Audit: i.audit?.title || 'N/A',
        Owner: i.owner?.name || 'Unassigned',
        Severity: i.severity,
        Status: i.status,
        DueDate: i.dueDate.toISOString().slice(0, 10)
      }));
    } else if (module === 'gamification') {
      const where = {};
      if (challengeId) where.challengeId = Number(challengeId);
      if (employeeId) where.employeeId = Number(employeeId);
      const data = await prisma.challengeParticipation.findMany({ where, include: { challenge: true, employee: true } });
      rows = data.map((c) => ({
        Employee: c.employee.name,
        Challenge: c.challenge.title,
        Progress: c.progress,
        Status: c.approvalStatus,
        XpAwarded: c.xpAwarded
      }));
    } else {
      return res.status(400).json({ message: 'Please specify a module filter: environmental, social, governance, or gamification' });
    }

    await respondInFormat(req, res, 'custom_report', title, rows);
  } catch (err) {
    res.status(400).json({ message: 'Failed to generate custom report', error: err.message });
  }
});

module.exports = router;
