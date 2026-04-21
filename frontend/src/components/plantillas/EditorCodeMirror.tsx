import { forwardRef, lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import type { EditorHandle } from './EditorCodeMirror.impl';

export type { EditorHandle };

interface EditorCodeMirrorProps {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  height?: number;
}

// Code-split: el bundle de CodeMirror (~200kB gzip) sólo se descarga cuando
// el usuario abre el formulario de plantillas o el panel de envío.
const Impl = lazy(() =>
  import('./EditorCodeMirror.impl').then((m) => ({
    default: m.EditorCodeMirrorImpl,
  })),
);

export const EditorCodeMirror = forwardRef<EditorHandle, EditorCodeMirrorProps>(
  function EditorCodeMirror(props, ref) {
    const altura = props.height ?? 400;
    return (
      <Suspense
        fallback={
          <div
            className="flex items-center justify-center rounded-md border border-border bg-elev-2 text-secondary"
            style={{ height: altura }}
          >
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="ml-2 text-xs">Cargando editor...</span>
          </div>
        }
      >
        <Impl {...props} handleRef={ref} />
      </Suspense>
    );
  },
);
