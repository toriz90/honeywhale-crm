import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AppRouter } from '@/router';
import { useAplicarTema } from '@/hooks/useAplicarTema';
import { useThemeStore } from '@/stores/themeStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  useAplicarTema();
  const tema = useThemeStore((s) => s.tema);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRouter />
        <Toaster
          theme={tema === 'oscuro' ? 'dark' : 'light'}
          position="top-right"
          richColors
          toastOptions={{
            style: {
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
