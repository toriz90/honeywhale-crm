import { Topbar } from '@/components/layout/Topbar';
import { Skeleton } from '@/components/ui/Skeleton';
import { useConfiguracion } from '@/hooks/useConfiguracion';
import { MarcaForm } from '@/components/configuracion/MarcaForm';
import { SmtpForm } from '@/components/configuracion/SmtpForm';
import { GoogleOAuthForm } from '@/components/configuracion/GoogleOAuthForm';
import { WoocommerceForm } from '@/components/configuracion/WoocommerceForm';
import { ArchivoMensualForm } from '@/components/configuracion/ArchivoMensualForm';

export function ConfiguracionPage() {
  const { data, isLoading } = useConfiguracion();

  return (
    <>
      <Topbar titulo="Configuración" />
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        {isLoading || !data ? (
          <>
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </>
        ) : (
          <>
            <MarcaForm configuracion={data} />
            <SmtpForm configuracion={data} />
            <GoogleOAuthForm configuracion={data} />
            <WoocommerceForm configuracion={data} />
            <ArchivoMensualForm />
          </>
        )}
      </div>
    </>
  );
}
