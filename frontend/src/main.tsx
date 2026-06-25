import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './i18n';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0F1117',
              color: '#E8EAF0',
              border: '1px solid #1C1F2A',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'Inter, system-ui, sans-serif',
            },
            success: { iconTheme: { primary: '#00D4A0', secondary: '#0F1117' } },
            error:   { iconTheme: { primary: '#FF4D6D', secondary: '#0F1117' } },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);

