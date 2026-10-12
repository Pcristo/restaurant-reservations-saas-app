import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/pt';
import 'dayjs/locale/en';
import { LanguageProvider, useLanguage } from '../../hooks/useLanguage';
import { AuthProvider } from '../../hooks/useAuth';
import { NotificationProvider } from '../../hooks/useNotifications';
import { TenantProvider } from '../../hooks/useTenant';
import { ImpersonationBanner } from '../../components/ImpersonationBanner';

interface AppProvidersProps {
  children: React.ReactNode;
}

function LocalizedProviders({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale={language}>
      <NotificationProvider>
        <AuthProvider>
          <Router>
            <TenantProvider>
              <ImpersonationBanner />
              {children}
            </TenantProvider>
          </Router>
        </AuthProvider>
      </NotificationProvider>
    </LocalizationProvider>
  );
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <LanguageProvider>
      <LocalizedProviders>
        {children}
      </LocalizedProviders>
    </LanguageProvider>
  );
}

export default AppProviders;
