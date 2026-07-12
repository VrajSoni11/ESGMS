import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Environmental from './pages/Environmental';
import Social from './pages/Social';
import Governance from './pages/Governance';
import Gamification from './pages/Gamification';
import Reports from './pages/Reports';
import MasterData from './pages/MasterData';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Notifications from './pages/Notifications';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/environmental" element={<Environmental />} />
        <Route path="/social" element={<Social />} />
        <Route path="/governance" element={<Governance />} />
        <Route path="/gamification" element={<Gamification />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route
          path="/reports"
          element={
            <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/masterdata"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <MasterData />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute roles={['ADMIN', 'MANAGER']}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <Settings />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Login />} />
    </Routes>
  );
}
