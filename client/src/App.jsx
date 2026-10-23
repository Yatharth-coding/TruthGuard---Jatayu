import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';
import AppLayout from './layouts/AppLayout';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import DocumentLibraryPage from './pages/DocumentLibraryPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import ChatPage from './pages/ChatPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

function IndexRedirect() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner message="Verifying session..." size="lg" />
      </div>
    );
  }

  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<IndexRedirect />} />

      {/* Public Authentication routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected Application Routes wrapped in AppLayout */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/documents" element={<DocumentLibraryPage />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:id" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Catch-all Not Found */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
