import axios, {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';
import { TokenPair } from '@/types/auth';

export interface ApiSobre<T> {
  data: T;
  timestamp: string;
}

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refrescarToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  const store = useAuthStore.getState();
  const rt = store.refreshToken;
  if (!rt) return null;

  refreshPromise = (async () => {
    try {
      const res = await axios.post<ApiSobre<TokenPair>>(
        '/api/auth/refresh',
        { refreshToken: rt },
        { headers: { 'Content-Type': 'application/json' } },
      );
      const pair = res.data.data;
      useAuthStore.getState().setSession(pair);
      return pair.accessToken;
    } catch {
      useAuthStore.getState().logout();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/refresh')
    ) {
      original._retry = true;
      const nuevoToken = await refrescarToken();
      if (nuevoToken) {
        original.headers.Authorization = `Bearer ${nuevoToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export async function unwrap<T>(
  promesa: Promise<AxiosResponse<ApiSobre<T>>>,
): Promise<T> {
  const res = await promesa;
  return res.data.data;
}

export function mensajeDeError(err: unknown, fallback = 'Ocurrió un error'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { mensaje?: string; message?: string }
      | undefined;
    return data?.mensaje ?? data?.message ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export type { AxiosRequestConfig };
