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
  /** expose the tooltip content node to callers (e.g. SmartLink outside-click checks) */
  onContentNode?: (node: HTMLElement | null) => void;
}

export default function Tooltip({
  content,
  open,
  onOpenChange,
  children,
  delayDuration = 150,
  maxWidth = 360,
  onContentNode,
}: TooltipProps) {
  if (!content) {
    return <>{children}</>;
  }
  const isBrowser = typeof window !== 'undefined';
  type TooltipContentElement = React.ElementRef<typeof RT.Content>;
  const setContentNode = React.useCallback(
    (node: TooltipContentElement | null) => {
      onContentNode?.(node);
    },
    [onContentNode]
  );

  return (
    <>
      {!isBrowser && (
        <div className="lm-tooltip-content" data-ssr-hidden="true" style={{ display: 'none' }}>
          {content}
        </div>
      )}
      <RT.Provider delayDuration={delayDuration} skipDelayDuration={0}>
        <RT.Root open={open} onOpenChange={onOpenChange}>
          <RT.Trigger asChild>
            {/* SmartLink will wrap proper trigger element */}
            {children}
          </RT.Trigger>
          <RT.Portal>
            <RT.Content
              className="lm-tooltip"
              side="top"
              align="center"
              sideOffset={8}
              collisionPadding={8}
              ref={setContentNode}
              style={{
                '--lm-tooltip-max-width': `${maxWidth}px`,
              } as React.CSSProperties}
            >
              <div className="lm-tooltip-content">
                {content}
              </div>
              <RT.Arrow className="lm-tooltip-arrow" />
            </RT.Content>
          </RT.Portal>
        </RT.Root>
      </RT.Provider>
    </>
  );
}
