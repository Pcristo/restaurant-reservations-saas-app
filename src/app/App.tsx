import React from 'react';
import { AppProviders } from './providers/AppProviders';
import { AppRoutes } from './router/AppRoutes';

export function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}

export default App;
