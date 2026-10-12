import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { AdminModeProvider } from './contexts/AdminModeContext.tsx'
import { MotionPreferencesProvider } from './contexts/MotionPreferencesContext.tsx'
import { ConfirmProvider } from './contexts/ConfirmContext.tsx'
import MotionProvider from './components/MotionProvider.tsx'
import { isSupabaseConfigured } from './lib/supabaseClient.ts'
import ConfigMissing from './pages/ConfigMissing.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isSupabaseConfigured ? (
      <QueryClientProvider client={queryClient}>
        <MotionProvider>
          <MotionPreferencesProvider>
            <BrowserRouter>
              <AuthProvider>
                <AdminModeProvider>
                  <ConfirmProvider>
                    <App />
                  </ConfirmProvider>
                </AdminModeProvider>
              </AuthProvider>
            </BrowserRouter>
          </MotionPreferencesProvider>
        </MotionProvider>
      </QueryClientProvider>
    ) : (
      <ConfigMissing />
    )}
  </StrictMode>,
)
