-- ============================================================
-- EcoSphere - Reference / Master Data Seed
-- Run this AFTER 01_schema.sql
-- NOTE: Users are NOT seeded here. Admin will create users directly
-- in the database (or via a separate admin process) as per requirement.
-- This file only seeds lookup/reference data needed for the app to work.
-- ============================================================

-- Categories
INSERT INTO categories (name, type, status) VALUES
  ('Beach Cleanup', 'CSR_ACTIVITY', 'ACTIVE'),
  ('Tree Plantation', 'CSR_ACTIVITY', 'ACTIVE'),
  ('Blood Donation', 'CSR_ACTIVITY', 'ACTIVE'),
  ('Community Teaching', 'CSR_ACTIVITY', 'ACTIVE'),
  ('Energy Saving', 'CHALLENGE', 'ACTIVE'),
  ('Waste Reduction', 'CHALLENGE', 'ACTIVE'),
  ('Water Conservation', 'CHALLENGE', 'ACTIVE'),
  ('Commute Green', 'CHALLENGE', 'ACTIVE');

-- Emission Factors (reference CO2e values)
INSERT INTO emission_factors (activity_type, unit, co2e_factor, description, status) VALUES
  ('PURCHASE', 'kg material', 0.45, 'General procurement emissions per kg', 'ACTIVE'),
  ('MANUFACTURING', 'unit produced', 2.10, 'Manufacturing process emissions per unit', 'ACTIVE'),
  ('EXPENSE', 'INR 1000 spend', 0.12, 'Indirect emissions per spend bracket', 'ACTIVE'),
  ('FLEET', 'km travelled', 0.18, 'Fleet/vehicle emissions per km', 'ACTIVE'),
  ('MANUAL', 'kg CO2e', 1.00, 'Manual/direct entry, factor is 1:1', 'ACTIVE');

-- Badges
INSERT INTO badges (name, description, unlock_rule_type, unlock_rule_value, icon) VALUES
  ('Green Starter', 'Earned your first 50 XP', 'XP_THRESHOLD', 50, '🌱'),
  ('Eco Warrior', 'Earned 200 XP', 'XP_THRESHOLD', 200, '🌍'),
  ('Sustainability Champion', 'Earned 500 XP', 'XP_THRESHOLD', 500, '🏆'),
  ('Challenge Rookie', 'Completed 3 challenges', 'CHALLENGE_COUNT', 3, '🥉'),
  ('Challenge Master', 'Completed 10 challenges', 'CHALLENGE_COUNT', 10, '🥇');

-- Rewards catalog
INSERT INTO rewards (name, description, points_required, stock, status) VALUES
  ('Reusable Water Bottle', 'Eco-friendly steel bottle', 50, 100, 'ACTIVE'),
  ('Company Branded Tote Bag', 'Organic cotton tote', 30, 150, 'ACTIVE'),
  ('Extra Day Off', 'One additional paid leave day', 500, 20, 'ACTIVE'),
  ('₹500 Gift Voucher', 'Redeemable gift card', 300, 50, 'ACTIVE'),
  ('Plant a Tree in Your Name', 'We plant a tree and send a certificate', 100, 200, 'ACTIVE');

-- Sample ESG Policies (governance)
INSERT INTO esg_policies (title, description, category, version, status) VALUES
  ('Code of Environmental Conduct', 'Guidelines on responsible resource use and waste management.', 'Environmental', '1.0', 'PUBLISHED'),
  ('Anti-Harassment & Diversity Policy', 'Standards for workplace conduct and inclusion.', 'Social', '1.0', 'PUBLISHED'),
  ('Anti-Bribery & Corruption Policy', 'Governance rules on ethical business conduct.', 'Governance', '1.0', 'PUBLISHED');

-- Note: Departments should be created by Admin from the app UI (Settings > Departments)
-- or you may optionally insert a starter department below:
INSERT INTO departments (name, code, employee_count, status) VALUES
  ('Operations', 'OPS', 0, 'ACTIVE'),
  ('Human Resources', 'HR', 0, 'ACTIVE'),
  ('Engineering', 'ENG', 0, 'ACTIVE'),
  ('Sales & Marketing', 'SALES', 0, 'ACTIVE');
