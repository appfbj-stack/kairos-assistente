import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      usuario: null,
      token: null,
      carregando: false,
      modulos: null,

      login: async (token) => {
        localStorage.setItem('kairos_token', token);
        set({ token, carregando: true });
        try {
          const { data } = await api.get('/auth/me');
          set({ usuario: data, carregando: false });
          await get().carregarModulos();
        } catch (err) {
          console.error('[Auth] Falha ao carregar usuário:', err.response?.status, err.message);
          get().logout();
          throw err;
        }
      },

      carregarUsuario: async () => {
        const token = localStorage.getItem('kairos_token');
        if (!token) return;
        set({ carregando: true });
        try {
          const { data } = await api.get('/auth/me');
          set({ usuario: data, token, carregando: false });
        } catch {
          set({ usuario: null, token: null, carregando: false });
          localStorage.removeItem('kairos_token');
        }
      },

      carregarModulos: async () => {
        const token = localStorage.getItem('kairos_token');
        if (!token) return;
        try {
          const { data } = await api.get('/modules');
          set({ modulos: data });
        } catch {
          set({ modulos: [] });
        }
      },

      moduloAtivo: (slug) => {
        const { modulos } = get();
        if (modulos === null) return null;
        const m = modulos.find((m) => m.slug === slug);
        return m?.active === true;
      },

      logout: () => {
        localStorage.removeItem('kairos_token');
        set({ usuario: null, token: null, modulos: null });
      },

      isSede: () => get().usuario?.perfil === 'sede',
      isPastor: () => get().usuario?.perfil === 'pastor',
      isSecretario: () => get().usuario?.perfil === 'secretario',
      isLiderMinisterio: () => get().usuario?.perfil === 'lider_ministerio',
      // Pode ver dados sensíveis (CPF, RG, endereço, e-mail)
      canSeeSensitive: () => ['sede', 'pastor'].includes(get().usuario?.perfil),
      // Pode acessar área admin LGPD
      canAdminLgpd: () => get().usuario?.perfil === 'sede',
    }),
    { name: 'kairos-auth', partialize: (s) => ({ token: s.token }) }
  )
);
