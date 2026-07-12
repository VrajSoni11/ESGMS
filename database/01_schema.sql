-- ============================================================
-- EcoSphere ESG Management Platform - Database Schema
-- PostgreSQL Schema (Run this first in pgAdmin Query Tool)
-- ============================================================

-- Drop existing (safe re-run during dev)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE user_role AS ENUM ('ADMIN', 'EMPLOYEE', 'MANAGER');
CREATE TYPE status_type AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE category_type AS ENUM ('CSR_ACTIVITY', 'CHALLENGE');
CREATE TYPE source_type AS ENUM ('PURCHASE', 'MANUFACTURING', 'EXPENSE', 'FLEET', 'MANUAL');
CREATE TYPE csr_status AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');
CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE challenge_status AS ENUM ('DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'COMPLETED', 'ARCHIVED');
CREATE TYPE difficulty_type AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE policy_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE ack_status AS ENUM ('PENDING', 'ACKNOWLEDGED');
CREATE TYPE audit_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE issue_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'FLAGGED_OVERDUE');
CREATE TYPE severity_type AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE reward_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE notification_event AS ENUM (
  'COMPLIANCE_ISSUE_RAISED', 'CSR_APPROVAL_DECISION', 'CHALLENGE_APPROVAL_DECISION',
  'POLICY_ACK_REMINDER', 'BADGE_UNLOCKED', 'ISSUE_OVERDUE'
);

-- ============================================================
-- MASTER DATA
-- ============================================================

CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(30) UNIQUE NOT NULL,
  head_id INTEGER, -- FK added after users table
  parent_department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  employee_count INTEGER DEFAULT 0,
  status status_type DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'EMPLOYEE',
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  xp INTEGER DEFAULT 0,
  points_balance INTEGER DEFAULT 0,
  status status_type DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE departments ADD CONSTRAINT fk_department_head
  FOREIGN KEY (head_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  type category_type NOT NULL,
  status status_type DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE emission_factors (
  id SERIAL PRIMARY KEY,
  activity_type source_type NOT NULL,
  unit VARCHAR(50) NOT NULL,
  co2e_factor DECIMAL(12,4) NOT NULL,
  description VARCHAR(255),
  status status_type DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  sku VARCHAR(60) UNIQUE,
  esg_attributes JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE environmental_goals (
  id SERIAL PRIMARY KEY,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  metric VARCHAR(150) NOT NULL,
  target_value DECIMAL(14,2) NOT NULL,
  deadline DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE esg_policies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  version VARCHAR(20) DEFAULT '1.0',
  status policy_status DEFAULT 'DRAFT',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE badges (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(255),
  unlock_rule_type VARCHAR(50) NOT NULL, -- 'XP_THRESHOLD' | 'CHALLENGE_COUNT'
  unlock_rule_value INTEGER NOT NULL,
  icon VARCHAR(50) DEFAULT '🏅',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE rewards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description VARCHAR(255),
  points_required INTEGER NOT NULL,
  stock INTEGER DEFAULT 0,
  status reward_status DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONAL DATA
-- ============================================================

CREATE TABLE carbon_transactions (
  id SERIAL PRIMARY KEY,
  source_type source_type NOT NULL,
  source_record VARCHAR(150), -- reference label/id of the ERP record
  emission_factor_id INTEGER REFERENCES emission_factors(id) ON DELETE SET NULL,
  quantity DECIMAL(14,4) DEFAULT 1,
  co2e_value DECIMAL(14,4) NOT NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  auto_calculated BOOLEAN DEFAULT FALSE,
  txn_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE csr_activities (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  activity_date DATE,
  status csr_status DEFAULT 'DRAFT',
  points_reward INTEGER DEFAULT 10,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE employee_participations (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  activity_id INTEGER REFERENCES csr_activities(id) ON DELETE CASCADE,
  proof_url VARCHAR(255),
  approval_status approval_status DEFAULT 'PENDING',
  points_earned INTEGER DEFAULT 0,
  completion_date DATE,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, activity_id)
);

CREATE TABLE training_completions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  training_name VARCHAR(200) NOT NULL,
  completed_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE diversity_metrics (
  id SERIAL PRIMARY KEY,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  metric_name VARCHAR(150) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  recorded_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE challenges (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  xp INTEGER NOT NULL DEFAULT 50,
  difficulty difficulty_type DEFAULT 'MEDIUM',
  evidence_required BOOLEAN DEFAULT TRUE,
  deadline DATE,
  status challenge_status DEFAULT 'DRAFT',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE challenge_participations (
  id SERIAL PRIMARY KEY,
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
  employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0, -- 0-100
  proof_url VARCHAR(255),
  approval_status approval_status DEFAULT 'PENDING',
  xp_awarded INTEGER DEFAULT 0,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(challenge_id, employee_id)
);

CREATE TABLE policy_acknowledgements (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  policy_id INTEGER REFERENCES esg_policies(id) ON DELETE CASCADE,
  acknowledged_date TIMESTAMP,
  status ack_status DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, policy_id)
);

CREATE TABLE audits (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  scope VARCHAR(255),
  audit_date DATE,
  auditor VARCHAR(150),
  status audit_status DEFAULT 'SCHEDULED',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE compliance_issues (
  id SERIAL PRIMARY KEY,
  audit_id INTEGER REFERENCES audits(id) ON DELETE CASCADE,
  severity severity_type DEFAULT 'MEDIUM',
  description TEXT NOT NULL,
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  due_date DATE NOT NULL,
  status issue_status DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE employee_badges (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  badge_id INTEGER REFERENCES badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(employee_id, badge_id)
);

CREATE TABLE reward_redemptions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reward_id INTEGER REFERENCES rewards(id) ON DELETE CASCADE,
  points_spent INTEGER NOT NULL,
  redeemed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE department_scores (
  id SERIAL PRIMARY KEY,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  environmental_score DECIMAL(6,2) DEFAULT 0,
  social_score DECIMAL(6,2) DEFAULT 0,
  governance_score DECIMAL(6,2) DEFAULT 0,
  total_score DECIMAL(6,2) DEFAULT 0,
  calculated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(department_id)
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  event_type notification_event NOT NULL,
  title VARCHAR(200) NOT NULL,
  message VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_carbon_txn_dept ON carbon_transactions(department_id);
CREATE INDEX idx_carbon_txn_date ON carbon_transactions(txn_date);
CREATE INDEX idx_participation_emp ON employee_participations(employee_id);
CREATE INDEX idx_challenge_part_emp ON challenge_participations(employee_id);
CREATE INDEX idx_compliance_due ON compliance_issues(due_date, status);
CREATE INDEX idx_users_dept ON users(department_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- ============================================================
-- DEFAULT SETTINGS (weights & toggles) - required for app to function
-- ============================================================
INSERT INTO settings (key, value) VALUES
  ('esg_weights', '{"environmental": 0.40, "social": 0.30, "governance": 0.30}'),
  ('feature_toggles', '{"autoEmissionCalculation": true, "evidenceRequirement": true, "badgeAutoAward": true}'),
  ('notification_channels', '{"inApp": true, "email": false}');
