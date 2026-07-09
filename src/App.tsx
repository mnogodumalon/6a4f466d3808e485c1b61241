import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import KontrollpunktePage from '@/pages/KontrollpunktePage';
import KontrollpunkteDetailPage from '@/pages/KontrollpunkteDetailPage';
import HygieneKontrollePage from '@/pages/HygieneKontrollePage';
import HygieneKontrolleDetailPage from '@/pages/HygieneKontrolleDetailPage';
import PublicFormKontrollpunkte from '@/pages/public/PublicForm_Kontrollpunkte';
import PublicFormHygieneKontrolle from '@/pages/public/PublicForm_HygieneKontrolle';
// <public:imports>
// </public:imports>
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a4f453d1ca6120b9167ffc9" element={<PublicFormKontrollpunkte />} />
              <Route path="public/6a4f454050c9609bef0238ae" element={<PublicFormHygieneKontrolle />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="kontrollpunkte" element={<KontrollpunktePage />} />
                <Route path="kontrollpunkte/:id" element={<KontrollpunkteDetailPage />} />
                <Route path="hygiene-kontrolle" element={<HygieneKontrollePage />} />
                <Route path="hygiene-kontrolle/:id" element={<HygieneKontrolleDetailPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
