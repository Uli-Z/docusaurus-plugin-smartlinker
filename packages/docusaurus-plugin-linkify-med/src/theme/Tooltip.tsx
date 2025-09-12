import * as React from 'react';
import * as RT from '@radix-ui/react-tooltip';

/**
 * Tooltip wrapper:
 * - Desktop: show on hover/focus (default Radix behavior)
 * - Mobile: we toggle via explicit state (SmartLink controls it on icon tap)
 *
 * We expose `open`/`onOpenChange` to allow SmartLink to control for mobile.
 */
export interface TooltipProps {
  content?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  children: React.ReactNode;
  /** optional delay in ms (desktop hover) */
  delayDuration?: number;
  /** max width style */
  maxWidth?: number;
}

export default function Tooltip({
  content,
  open,
  onOpenChange,
  children,
  delayDuration = 150,
  maxWidth = 360,
}: TooltipProps) {
  if (!content) {
    return <>{children}</>;
  }
  return (
    <RT.Provider delayDuration={delayDuration} skipDelayDuration={0}>
      <RT.Root open={open} onOpenChange={onOpenChange}>
        <RT.Trigger asChild>
          {/* SmartLink will wrap proper trigger element */}
          {children}
        </RT.Trigger>
        <RT.Portal>
          <RT.Content
            side="top"
            align="center"
            style={{ maxWidth, zIndex: 50 }}
          >
            <div className="lm-tooltip-content">
              {content}
            </div>
            <RT.Arrow />
          </RT.Content>
        </RT.Portal>
      </RT.Root>
    </RT.Provider>
  );
}
