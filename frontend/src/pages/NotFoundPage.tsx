import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-base">
      <div className="text-center">
        <div className="text-6xl font-semibold text-accent">404</div>
        <p className="mt-2 text-primary">Página no encontrada</p>
        <Link
          to="/dashboard"
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
