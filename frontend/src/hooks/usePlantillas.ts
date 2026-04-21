import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '@/lib/api';
import {
  ActualizarPlantillaPayload,
  CrearPlantillaPayload,
  FiltrosPlantillas,
  Plantilla,
  PlantillaPreview,
} from '@/types/plantilla';

const QK_PLANTILLAS = 'plantillas';
const QK_PLANTILLA_PREVIEW = 'plantilla-preview';

function paramsLimpios(filtros?: FiltrosPlantillas) {
  if (!filtros) return undefined;
  const out: Record<string, string | number | boolean> = {};
  if (filtros.activa !== undefined) out.activa = filtros.activa ? 1 : 0;
  if (filtros.categoria) out.categoria = filtros.categoria;
  if (filtros.temperatura) out.temperatura = filtros.temperatura;
  return Object.keys(out).length ? out : undefined;
}

export function usePlantillas(filtros?: FiltrosPlantillas) {
  return useQuery({
    queryKey: [QK_PLANTILLAS, filtros ?? null],
    queryFn: () =>
      unwrap<Plantilla[]>(
        api.get('/plantillas', { params: paramsLimpios(filtros) }),
      ),
    staleTime: 30_000,
  });
}

export function usePlantilla(id: string | undefined) {
  return useQuery({
    queryKey: [QK_PLANTILLAS, id],
    queryFn: () => unwrap<Plantilla>(api.get(`/plantillas/${id}`)),
    enabled: !!id,
  });
}

export function usePreviewPlantilla(
  plantillaId: string | undefined | null,
  leadId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [QK_PLANTILLA_PREVIEW, plantillaId, leadId],
    queryFn: () =>
      unwrap<PlantillaPreview>(
        api.get(`/plantillas/${plantillaId}/preview`, {
          params: { leadId },
        }),
      ),
    enabled: enabled && !!plantillaId && !!leadId,
    staleTime: 0,
  });
}

export function useCrearPlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CrearPlantillaPayload) =>
      unwrap<Plantilla>(api.post('/plantillas', payload)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_PLANTILLAS] });
    },
  });
}

export function useActualizarPlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: ActualizarPlantillaPayload;
    }) => unwrap<Plantilla>(api.patch(`/plantillas/${id}`, payload)),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: [QK_PLANTILLAS] });
      qc.invalidateQueries({ queryKey: [QK_PLANTILLA_PREVIEW, vars.id] });
    },
  });
}

export function useEliminarPlantilla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/plantillas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [QK_PLANTILLAS] });
    },
  });
}
