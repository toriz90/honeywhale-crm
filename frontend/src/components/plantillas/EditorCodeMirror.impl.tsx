import {
  Ref,
  useImperativeHandle,
  useRef,
} from 'react';
import CodeMirror, {
  EditorView,
  ReactCodeMirrorRef,
} from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { useThemeStore } from '@/stores/themeStore';

export interface EditorHandle {
  insertarTexto: (texto: string) => void;
  enfocar: () => void;
}

export interface EditorImplProps {
  value: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  height?: number;
  handleRef?: Ref<EditorHandle>;
}

export function EditorCodeMirrorImpl({
  value,
  onChange,
  onFocus,
  height = 400,
  handleRef,
}: EditorImplProps) {
  const cmRef = useRef<ReactCodeMirrorRef>(null);
  const tema = useThemeStore((s) => s.tema);

  useImperativeHandle(handleRef, () => ({
    insertarTexto(texto: string) {
      const view = cmRef.current?.view;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: texto },
        selection: { anchor: from + texto.length },
      });
      view.focus();
    },
    enfocar() {
      cmRef.current?.view?.focus();
    },
  }));

  return (
    <div
      className="overflow-hidden rounded-md border border-border"
      onFocus={onFocus}
    >
      <CodeMirror
        ref={cmRef}
        value={value}
        onChange={onChange}
        extensions={[html(), EditorView.lineWrapping]}
        theme={tema === 'oscuro' ? 'dark' : 'light'}
        height={`${height}px`}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          autocompletion: false,
        }}
      />
    </div>
  );
}
