require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const environmentalRoutes = require('./routes/environmental.routes');
const socialRoutes = require('./routes/social.routes');
const governanceRoutes = require('./routes/governance.routes');
const gamificationRoutes = require('./routes/gamification.routes');
const scoringRoutes = require('./routes/scoring.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const masterdataRoutes = require('./routes/masterdata.routes');
const usersRoutes = require('./routes/users.routes');
const settingsRoutes = require('./routes/settings.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const reportsRoutes = require('./routes/reports.routes');

const { startCronJobs } = require('./utils/cronJobs');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded proof files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'EcoSphere API', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/environmental', environmentalRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/governance', governanceRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/scoring', scoringRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/masterdata', masterdataRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/reports', reportsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ EcoSphere API running on http://localhost:${PORT}`);
  startCronJobs();
});
