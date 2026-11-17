import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/auth';
import { BuscaProvider } from './context/busca';
import { ToastProvider } from './components/ui/overlay';
import { Layout } from './components/layout/Layout';
import { isApiError } from './api/client';
import HomePage from './pages/HomePage';

const CavernasPage = lazy(() => import('./pages/CavernasPage'));
const CavernaDetalhePage = lazy(() => import('./pages/CavernaDetalhePage'));
const ExperienciasPage = lazy(() => import('./pages/ExperienciasPage'));
const BanquetePage = lazy(() => import('./pages/BanquetePage'));
const ATriboPage = lazy(() => import('./pages/ATriboPage'));
const BuscarReservaPage = lazy(() => import('./pages/BuscarReservaPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const HospedesPage = lazy(() => import('./pages/reserva/HospedesPage'));
const ExtrasPage = lazy(() => import('./pages/reserva/ExtrasPage'));
const PagamentoPage = lazy(() => import('./pages/reserva/PagamentoPage'));
const VoucherPage = lazy(() => import('./pages/reserva/VoucherPage'));
const EntrarPage = lazy(() => import('./pages/conta/EntrarPage'));
const EsqueciSenhaPage = lazy(() => import('./pages/conta/EsqueciSenhaPage'));
const RedefinirSenhaPage = lazy(() => import('./pages/conta/RedefinirSenhaPage'));
const MinhasReservasPage = lazy(() => import('./pages/conta/MinhasReservasPage'));
const PerfilPage = lazy(() => import('./pages/conta/PerfilPage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (n, e) => (isApiError(e) && e.status > 0 && e.status < 500 ? false : n < 1),
    },
  },
});

function Protegida({ children, admin }: { children: React.ReactNode; admin?: boolean }) {
  const { logado, admin: ehAdmin } = useAuth();
  if (!logado) return <Navigate to="/entrar" replace state={{ de: window.location.pathname + window.location.search }} />;
  if (admin && !ehAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BuscaProvider>
            <BrowserRouter>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<HomePage />} />
                  <Route path="cavernas" element={<CavernasPage />} />
                  <Route path="cavernas/:slug" element={<CavernaDetalhePage />} />
                  <Route path="experiencias" element={<ExperienciasPage />} />
                  <Route path="banquete" element={<BanquetePage />} />
                  <Route path="a-tribo" element={<ATriboPage />} />
                  <Route path="buscar-reserva" element={<BuscarReservaPage />} />
                  <Route path="reserva/:codigo/quem-vem" element={<HospedesPage />} />
                  <Route path="reserva/:codigo/extras" element={<ExtrasPage />} />
                  <Route path="reserva/:codigo/pagamento" element={<PagamentoPage />} />
                  <Route path="reserva/:codigo" element={<VoucherPage />} />
                  <Route path="entrar" element={<EntrarPage />} />
                  <Route path="criar-conta" element={<EntrarPage criar />} />
                  <Route path="esqueci-senha" element={<EsqueciSenhaPage />} />
                  <Route path="redefinir-senha" element={<RedefinirSenhaPage />} />
                  <Route path="minhas-reservas" element={<Protegida><MinhasReservasPage /></Protegida>} />
                  <Route path="perfil" element={<Protegida><PerfilPage /></Protegida>} />
                  <Route path="perfil/:secao" element={<Protegida><PerfilPage /></Protegida>} />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
                <Route element={<Layout semRodape />}>
                  <Route path="admin/*" element={<Protegida admin><AdminPage /></Protegida>} />
                </Route>
              </Routes>
            </BrowserRouter>
          </BuscaProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
