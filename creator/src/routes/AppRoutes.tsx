import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { CreatorAuthGuard, PublicOnlyGuard } from '../components/auth/CreatorAuthGuard';
import { CreatorShell } from '../components/layout/CreatorShell';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { LiveRoomsPage } from '../pages/LiveRoomsPage';
import { LiveRoomConsolePage } from '../pages/LiveRoomConsolePage';
import { SchedulePage } from '../pages/SchedulePage';
import { AudiencePage } from '../pages/AudiencePage';
import { FollowersPage } from '../pages/FollowersPage';
import { SubscribersPage } from '../pages/SubscribersPage';
import { WalletPage } from '../pages/WalletPage';
import { EarningsPage } from '../pages/EarningsPage';
import { GiftsPage } from '../pages/GiftsPage';
import { PayoutRequestsPage } from '../pages/PayoutRequestsPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { ProfilePage } from '../pages/ProfilePage';
import { SettingsPage } from '../pages/SettingsPage';
import { HelpPage } from '../pages/HelpPage';
import { HostVerificationPage } from '../pages/HostVerificationPage';

export const AppRoutes: React.FC = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Routes>
      {/* Root path /creator: Authentication check redirect */}
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />

      {/* Public Routes (Login) */}
      <Route element={<PublicOnlyGuard />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected Creator Routes */}
      <Route element={<CreatorAuthGuard />}>
        <Route element={<CreatorShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/rooms" element={<LiveRoomsPage />} />
          <Route path="/rooms/:roomId/live" element={<LiveRoomConsolePage />} />
          <Route path="/schedule" element={<SchedulePage />} />
          <Route path="/audience" element={<AudiencePage />} />
          <Route path="/followers" element={<FollowersPage />} />
          <Route path="/subscribers" element={<SubscribersPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/earnings" element={<EarningsPage />} />
          <Route path="/gifts" element={<GiftsPage />} />
          <Route path="/payout-requests" element={<PayoutRequestsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/verification" element={<HostVerificationPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
        </Route>
      </Route>

      {/* Fallback wildcard route */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
      />
    </Routes>
  );
};

