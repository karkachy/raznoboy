import * as Dialog from '@radix-ui/react-dialog';
import { useNavigate } from 'react-router-dom';
import { useRef, type ReactNode } from 'react';
import { paths } from '../routes/paths';

export function PageDialog({ title, children }: { title: string; children: ReactNode }) {
  const navigate = useNavigate();
  const previous = useRef(document.activeElement);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) navigate(paths.home, { replace: true });
      }}
    >
      <Dialog.Portal container={document.getElementById('dialog-root')!}>
        <Dialog.Overlay className="af-overlay" />
        <Dialog.Content
          className="af-modal"
          aria-describedby={undefined}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            if (previous.current instanceof HTMLElement && previous.current.isConnected)
              previous.current.focus({ preventScroll: true });
          }}
        >
          <div className="af-head">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close className="af-icon" aria-label="Закрыть">
              ×
            </Dialog.Close>
          </div>
          <div id="af-dialog-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
