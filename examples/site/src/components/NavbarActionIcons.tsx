import React from 'react';
import AboutModal from './AboutModal';

const ICON_SIZE = 20;

interface IconButtonProps {
  id: string;
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
}

function SrOnly({ children }: { children: React.ReactNode }) {
  return <span className="sl-navbarIconButton__sr-only">{children}</span>;
}

function IconButton({ id, label, onClick, children }: IconButtonProps) {
  return (
    <button
      type="button"
      id={id}
      className="sl-navbarIconButton"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
      <SrOnly>{label}</SrOnly>
    </button>
  );
}

function OptionsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={ICON_SIZE}
      height={ICON_SIZE}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M12 9.5A2.5 2.5 0 1 0 12 14.5 2.5 2.5 0 0 0 12 9.5Zm9.25 2.062v.876a1 1 0 0 1-.575.911l-1.516.698a6.98 6.98 0 0 1-.644 1.554l.22 1.66a1 1 0 0 1-.99 1.128h-2.02a1 1 0 0 1-.942-.658l-.561-1.51a7.077 7.077 0 0 1-1.59 0l-.561 1.51a1 1 0 0 1-.943.658H9.106a1 1 0 0 1-.99-1.128l.219-1.66a6.98 6.98 0 0 1-.644-1.554l-1.516-.698a1 1 0 0 1-.575-.911v-.876a1 1 0 0 1 .575-.911l1.516-.698a6.98 6.98 0 0 1 .644-1.554l-.219-1.66a1 1 0 0 1 .99-1.128h2.02a1 1 0 0 1 .943.658l.561 1.51a7.077 7.077 0 0 1 1.59 0l.561-1.51a1 1 0 0 1 .942-.658h2.02a1 1 0 0 1 .99 1.128l-.22 1.66c.3.486.515 1.01.644 1.554l1.516.698a1 1 0 0 1 .575.911Z"
        fill="currentColor"
      />
    </svg>
  );
}

function HelpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={ICON_SIZE}
      height={ICON_SIZE}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm.01 15.25a1.25 1.25 0 1 1 1.25-1.25 1.25 1.25 0 0 1-1.25 1.25Zm1.772-6.208c-.499.482-.772.754-.772 1.958a1 1 0 0 1-2 0c0-2.102.961-3.019 1.675-3.702.647-.618.915-.876.915-1.548a1.6 1.6 0 0 0-1.6-1.6 1.559 1.559 0 0 0-1.6 1.486 1 1 0 0 1-2-.119A3.559 3.559 0 0 1 12.015 5a3.6 3.6 0 0 1 3.6 3.6c.001 1.607-.836 2.38-1.833 3.442Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function NavbarActionIcons() {
  const [isAboutOpen, setIsAboutOpen] = React.useState(false);

  const handleOptionsClick = React.useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const customHandler = (window as unknown as {
      openSmartlinkerOptions?: () => void;
    }).openSmartlinkerOptions;
    if (typeof customHandler === 'function') {
      customHandler();
      return;
    }

    const fallbackTrigger = document.querySelector<HTMLElement>(
      '[data-smartlinker-options-trigger]'
    );
    if (fallbackTrigger) {
      fallbackTrigger.click();
      return;
    }

    window.dispatchEvent(new CustomEvent('smartlinker:toggle-options'));
  }, []);

  return (
    <>
      <div className="navbar__item navbar__item--icon">
        <IconButton id="smartlinker-options" label="Optionen" onClick={handleOptionsClick}>
          <OptionsIcon />
        </IconButton>
      </div>
      <div className="navbar__item navbar__item--icon">
        <IconButton id="smartlinker-about" label="About & Hilfe" onClick={() => setIsAboutOpen(true)}>
          <HelpIcon />
        </IconButton>
      </div>
      <AboutModal open={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  );
}
