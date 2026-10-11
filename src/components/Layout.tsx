import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import BackToTop from './BackToTop';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  isMarketing?: boolean;
}

export default function Layout({ children, isMarketing }: LayoutProps) {
  const location = useLocation();
  const isDocumentMode = location.pathname.includes('/print/section-document');
  const isRestaurantRoute = location.pathname.startsWith('/r/');
  const isAdminOrCustomerRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/my-bookings');
  const { settings } = useSettings();
  const { isAdmin } = useAuth();
  
  // Platform / Marketing / Login / 404 context: strictly restaurant-neutral
  if (!isRestaurantRoute && !isAdminOrCustomerRoute) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <main className="flex-grow w-full pt-0">
          {children}
        </main>
      </div>
    );
  }

  // Restaurant and Admin route context
  return (
    <div className={cn(
      "min-h-screen flex flex-col transition-colors duration-300",
      isDocumentMode ? "bg-white text-gray-900" : (settings?.theme === 'dark' ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900")
    )}>
      {!isDocumentMode && <Navbar />}
      <main className={cn(
        "flex-grow transition-all duration-300",
        isDocumentMode ? "pt-0 bg-white" : (isAdmin ? "pt-24" : "pt-16")
      )}>
        {children}
      </main>
      {!isDocumentMode && <Footer />}
      {!isDocumentMode && <BackToTop />}
    </div>
  );
}
