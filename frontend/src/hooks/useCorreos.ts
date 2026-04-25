import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { api, mensajeDeError, unwrap } from '@/lib/api';
import { CorreoEnviado, EnviarCorreoPayload } from '@/types/correo';

const QK_CORREOS_LEAD = 'correos-lead';
const QK_PLANTILLAS = 'plantillas';

export function useEnviarCorreo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: EnviarCorreoPayload) =>
      unwrap<CorreoEnviado>(api.post('/correos/enviar', payload)),
    onSuccess: (data, vars) => {
      toast.success(`Correo enviado a ${data.destinatario_email}`);
      qc.invalidateQueries({ queryKey: [QK_CORREOS_LEAD, vars.leadId] });
      qc.invalidateQueries({ queryKey: [QK_PLANTILLAS] });
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (err) => {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        toast.error('Demasiados envíos en poco tiempo, espera un momento');
        return;
      }
      toast.error(mensajeDeError(err, 'Error al enviar el correo'));
    },
  });
}

export function useGuardarBorrador() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: EnviarCorreoPayload) =>
      unwrap<CorreoEnviado>(api.post('/correos/borrador', payload)),
    onSuccess: (_data, vars) => {
      toast.success('Borrador guardado');
      qc.invalidateQueries({ queryKey: [QK_CORREOS_LEAD, vars.leadId] });
    },
    onError: (err) => {
      toast.error(mensajeDeError(err, 'No se pudo guardar el borrador'));
    },
  });
}

export function useCorreosPorLead(
  leadId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [QK_CORREOS_LEAD, leadId],
    queryFn: () =>
      unwrap<CorreoEnviado[]>(api.get(`/correos/lead/${leadId}`)),
    enabled: enabled && !!leadId,
    staleTime: 60_000,
  });
}
