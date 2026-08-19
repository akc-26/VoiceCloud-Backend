import { Route, Routes } from 'react-router-dom';
import { RequireAuth } from '@/app/guards/RequireAuth';
import { WebsiteShell } from '@/components/layout/WebsiteShell';
import { FeaturePlaceholderPage } from '@/pages/FeaturePlaceholderPage';
import { HomeFoundationPage } from '@/pages/HomeFoundationPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

const publicFeatureRoutes = [
  '/explore', '/rooms', '/communities', '/people', '/events', '/about', '/search',
  '/auth/sign-in', '/auth/register', '/auth/phone', '/auth/verify',
] as const;

const protectedFeatureRoutes = [
  '/messages', '/notifications', '/me', '/settings', '/onboarding',
] as const;

export function AppRouter() {
  return (
    <Routes>
      <Route element={<WebsiteShell />}>
        <Route index element={<HomeFoundationPage />} />
        {publicFeatureRoutes.map((path) => <Route key={path} path={path} element={<FeaturePlaceholderPage />} />)}
        <Route element={<RequireAuth />}>
          {protectedFeatureRoutes.map((path) => <Route key={path} path={path} element={<FeaturePlaceholderPage />} />)}
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
