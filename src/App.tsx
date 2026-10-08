/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { TournamentProvider } from './context/TournamentContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TournamentsPage } from './pages/TournamentsPage';
import { CreateTournamentPage } from './pages/CreateTournamentPage';
import { TournamentWorkspacePage } from './pages/TournamentWorkspacePage';
import { SlotListPage } from './pages/SlotListPage';
import { MatchesPage } from './pages/MatchesPage';
import { StandingsPage } from './pages/StandingsPage';
import { MVPPage } from './pages/MVPPage';
import { CustomizePage } from './pages/CustomizePage';
import { SettingsPage } from './pages/SettingsPage';
import { PublicResultsPage } from './pages/PublicResultsPage';

export default function App() {
  return (
    <AuthProvider>
      <TournamentProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Read-Only Results Page (Standalone esports layout without organizer nav) */}
            <Route path="/results/:publicId" element={<PublicResultsPage />} />

            {/* Public Organizer Sign-In Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Organizer App Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/create" element={<CreateTournamentPage />} />
                <Route path="/tournaments" element={<TournamentsPage />} />
                <Route path="/tournament/:id" element={<TournamentWorkspacePage />} />
                <Route path="/tournament/:id/slots" element={<SlotListPage />} />
                <Route path="/tournament/:id/matches" element={<MatchesPage />} />
                <Route path="/tournament/:id/standings" element={<StandingsPage />} />
                <Route path="/tournament/:id/mvp" element={<MVPPage />} />
                <Route path="/tournament/:id/customize" element={<CustomizePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </TournamentProvider>
    </AuthProvider>
  );
}
