import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Topbar } from '@/components/layout/Topbar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  useActualizarUsuario,
  useCrearUsuario,
  useEliminarUsuario,
  useUsuarios,
} from '@/hooks/useUsuarios';
import { Usuario } from '@/types/usuario';
import { Rol } from '@/types/auth';
import { formatFecha } from '@/lib/utils';
import { mensajeDeError } from '@/lib/api';

const rolesOpts = [
  { value: 'ADMIN', label: 'ADMIN' },
  { value: 'SUPERVISOR', label: 'SUPERVISOR' },
  { value: 'AGENTE', label: 'AGENTE' },
];

const esquema = z.object({
  nombre: z.string().min(1, 'Nombre obligatorio').max(120),
  email: z.string().email('Email inválido').max(180),
  password: z.string().max(128).optional().or(z.literal('')),
  rol: z.enum(['ADMIN', 'SUPERVISOR', 'AGENTE']),
  activo: z.boolean(),
});

type FormValues = z.infer<typeof esquema>;

export function UsuariosPage() {
  const { data, isLoading } = useUsuarios();
  const crear = useCrearUsuario();
  const actualizar = useActualizarUsuario();
  const eliminar = useEliminarUsuario();
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [borrar, setBorrar] = useState<Usuario | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: '',
      email: '',
      password: '',
      rol: 'AGENTE',
      activo: true,
    },
  });

  const activo = watch('activo');

  const abrirNuevo = () => {
    setEditando(null);
    reset({ nombre: '', email: '', password: '', rol: 'AGENTE', activo: true });
    setModalOpen(true);
  };

  const abrirEditar = (u: Usuario) => {
    setEditando(u);
    reset({
      nombre: u.nombre,
      email: u.email,
      password: '',
      rol: u.rol,
      activo: u.activo,
    });
    setModalOpen(true);
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (editando) {
        const payload: Record<string, unknown> = {
          nombre: values.nombre,
          email: values.email,
          rol: values.rol as Rol,
          activo: values.activo,
        };
        if (values.password) payload.password = values.password;
        await actualizar.mutateAsync({ id: editando.id, payload });
        toast.success('Usuario actualizado');
      } else {
        if (!values.password || values.password.length < 8) {
          toast.error('La contraseña inicial debe tener al menos 8 caracteres');
          return;
        }
        await crear.mutateAsync({
          nombre: values.nombre,
          email: values.email,
          password: values.password,
          rol: values.rol as Rol,
          activo: values.activo,
        });
        toast.success('Usuario creado');
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo guardar el usuario'));
    }
  });

  const confirmarBorrar = async () => {
    if (!borrar) return;
    try {
      await eliminar.mutateAsync(borrar.id);
      toast.success('Usuario eliminado');
      setBorrar(null);
    } catch (err) {
      toast.error(mensajeDeError(err, 'No se pudo eliminar'));
    }
  };

  return (
    <>
      <Topbar
        titulo="Usuarios"
        acciones={
          <Button onClick={abrirNuevo}>
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </Button>
        }
      />
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading || !data ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-elev-2 text-left text-xs uppercase text-secondary">
                <tr>
                  <th className="px-3 py-2">Nombre</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Rol</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Creado</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-secondary"
                    >
                      No hay usuarios.
                    </td>
                  </tr>
                ) : (
                  data.map((u) => (
                    <tr
                      key={u.id}
                      className="cursor-pointer border-t border-border hover:bg-elev-2"
                      onClick={() => abrirEditar(u)}
                    >
                      <td className="px-3 py-2 text-primary">{u.nombre}</td>
                      <td className="px-3 py-2 text-secondary">{u.email}</td>
                      <td className="px-3 py-2">
                        <Badge tono="accent">{u.rol}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        {u.activo ? (
                          <Badge tono="success">Activo</Badge>
                        ) : (
                          <Badge tono="danger">Inactivo</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-secondary">
                        {formatFecha(u.created_at)}
                      </td>
                      <td
                        className="px-3 py-2 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setBorrar(u)}
                          className="rounded p-1 text-danger hover:bg-danger/10"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editando ? 'Editar usuario' : 'Nuevo usuario'}
        size="md"
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input
            label="Nombre"
            {...register('nombre')}
            error={errors.nombre?.message}
          />
          <Input
            label="Email"
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label={
              editando
                ? 'Contraseña (dejar vacío para no cambiar)'
                : 'Contraseña (mín. 8 caracteres)'
            }
            type="password"
            autoComplete="new-password"
            {...register('password')}
            error={errors.password?.message}
          />
          <Select
            label="Rol"
            {...register('rol')}
            options={rolesOpts}
            error={errors.rol?.message}
          />
          <Switch
            id="usuario_activo"
            checked={activo}
            onChange={(v) => setValue('activo', v, { shouldDirty: true })}
            label="Usuario activo"
          />
          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editando ? 'Guardar cambios' : 'Crear usuario'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!borrar}
        title="Eliminar usuario"
        message={`¿Seguro que quieres eliminar al usuario ${borrar?.nombre}?`}
        danger
        loading={eliminar.isPending}
        onConfirm={confirmarBorrar}
        onCancel={() => setBorrar(null)}
      />
    </>
  );
}
