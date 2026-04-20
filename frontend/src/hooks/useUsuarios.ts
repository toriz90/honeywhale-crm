import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import {
  CreateUsuarioPayload,
  UpdateUsuarioPayload,
  Usuario,
} from '@/types/usuario';

const QK = 'usuarios';
const QK_ASIGNABLES = 'usuarios-asignables';

export function useUsuarios() {
  return useQuery({
    queryKey: [QK],
    queryFn: () => unwrap<Usuario[]>(api.get('/usuarios')),
  });
}

export function useUsuariosAsignables(roles: string[] = ['AGENTE', 'SUPERVISOR']) {
  const rolParam = roles.join(',');
  return useQuery({
    queryKey: [QK_ASIGNABLES, rolParam],
    queryFn: () =>
      unwrap<Usuario[]>(
        api.get('/usuarios/asignables', { params: { rol: rolParam } }),
      ),
    staleTime: 60 * 1000,
  });
}

export function useCrearUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUsuarioPayload) =>
      unwrap<Usuario>(api.post('/usuarios', payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}

export function useActualizarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateUsuarioPayload;
    }) => unwrap<Usuario>(api.patch(`/usuarios/${id}`, payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}

export function useEliminarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/usuarios/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  });
}
