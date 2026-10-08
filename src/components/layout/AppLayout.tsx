import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { SiteFooter } from './SiteFooter';
import { AppIntro } from './AppIntro';
import { useLocation } from 'react-router-dom';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <AppIntro />
      <div className="app-shell min-h-screen text-[#F5F7FB] flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col min-h-screen min-w-0">
        <TopBar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        <main className="app-main flex-1 p-4 sm:p-6 md:p-8 lg:p-10 max-w-[1480px] w-full mx-auto app-page-enter">
          <div key={location.pathname} className="tp-route-stage">
            <Outlet />
          </div>
        </main>

<SiteFooter />
      </div>
    </div>
    </>
  );
};
