import { ReactNode } from 'react';

interface TopbarProps {
  titulo: string;
  acciones?: ReactNode;
}

export function Topbar({ titulo, acciones }: TopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-elev px-6">
      <h1 className="text-lg font-semibold text-primary">{titulo}</h1>
      <div className="flex items-center gap-2">{acciones}</div>
    </header>
  );
}
