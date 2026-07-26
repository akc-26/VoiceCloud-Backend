import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { RoleGuard } from './RoleGuard';

import { MainLayout } from '../components/layout/MainLayout';

import { LoginPage } from '../pages/LoginPage';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { NotFoundPage } from '../pages/NotFoundPage';

import { DashboardPage } from '../pages/DashboardPage';
import { UsersPage } from '../pages/UsersPage';
import { RoomsPage } from '../pages/RoomsPage';
import { WalletPage } from '../pages/WalletPage';
import { GiftsPage } from '../pages/GiftsPage';
import { VipPage } from '../pages/VipPage';
import { HostsPage } from '../pages/HostsPage';
import { AgenciesPage } from '../pages/AgenciesPage';
import { ReportsPage } from '../pages/ReportsPage';
import { ModerationPage } from '../pages/ModerationPage';
import { AnnouncementsPage } from '../pages/AnnouncementsPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { RtcPage } from '../pages/RtcPage';
import { CmsPage } from '../pages/CmsPage';
import { FeatureFlagsPage } from '../pages/FeatureFlagsPage';
import { ProviderConfigsPage } from '../pages/ProviderConfigsPage';
import { SystemSettingsPage } from '../pages/SystemSettingsPage';
import { AppVersionsPage } from '../pages/AppVersionsPage';
import { AuditLogsPage } from '../pages/AuditLogsPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { SupportPage } from '../pages/SupportPage';
import { ProfilePage } from '../pages/ProfilePage';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Protected Admin Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/gifts" element={<GiftsPage />} />
          <Route path="/vip" element={<VipPage />} />
          <Route path="/hosts" element={<HostsPage />} />
          <Route path="/agencies" element={<AgenciesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/moderation" element={<ModerationPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/rtc" element={<RtcPage />} />
          <Route path="/cms" element={<CmsPage />} />
          <Route path="/feature-flags" element={<FeatureFlagsPage />} />
          <Route path="/provider-configs" element={<ProviderConfigsPage />} />
          <Route path="/providers" element={<ProviderConfigsPage />} />
          <Route
            path="/system-settings"
            element={
              <RoleGuard roles={['SUPER_ADMIN', 'ADMIN']}>
                <SystemSettingsPage />
              </RoleGuard>
            }
          />
          <Route path="/app-versions" element={<AppVersionsPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      {/* 404 Catch All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};
