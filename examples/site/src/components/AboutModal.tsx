import React from 'react';
import ReactDOM from 'react-dom';
import Link from '@docusaurus/Link';
import useIsBrowser from '@docusaurus/useIsBrowser';

export interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

const MODAL_ID = 'smartlinker-about-modal';

export default function AboutModal({ open, onClose }: AboutModalProps) {
  const isBrowser = useIsBrowser();
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const lastFocusedElement = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!isBrowser) {
      return undefined;
    }

    if (open) {
      lastFocusedElement.current = document.activeElement as HTMLElement | null;
      const handleKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleKey);
      requestAnimationFrame(() => closeButtonRef.current?.focus());
      document.body.classList.add('sl-navbarModal--open');
      return () => {
        document.body.classList.remove('sl-navbarModal--open');
        document.removeEventListener('keydown', handleKey);
        lastFocusedElement.current?.focus?.();
      };
    }

    return undefined;
  }, [isBrowser, onClose, open]);

  const handleBackdropClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  if (!isBrowser || !open) {
    return null;
  }

  return ReactDOM.createPortal(
    <div
      className="sl-navbarModal__backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        className="sl-navbarModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${MODAL_ID}-title`}
      >
        <header className="sl-navbarModal__header">
          <h2 id={`${MODAL_ID}-title`} className="sl-navbarModal__title">
            Über Smartlinker
          </h2>
          <button
            type="button"
            ref={closeButtonRef}
            className="sl-navbarModal__close"
            onClick={onClose}
            aria-label="Dialog schließen"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className="sl-navbarModal__body">
          <p>
            Smartlinker verknüpft medizinische Begriffe automatisch mit passenden
            Dokumenten und liefert sofort Tooltip-Hinweise für einen schnellen Kontext.
          </p>
          <p>
            Weitere Informationen findest du auf der{' '}
            <Link to="https://github.com/Uli-Z/docusaurus-plugin-smartlinker" target="_blank" rel="noopener noreferrer">
              GitHub-Seite des Projekts
            </Link>
            .
          </p>
          <p className="sl-navbarModal__license">Lizenz: MIT-Lizenz.</p>
        </div>
      </div>
    </div>,
    document.body
  );
}
