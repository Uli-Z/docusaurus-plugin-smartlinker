import React from 'react';
import Tooltip from './Tooltip.js';
import IconResolver from './IconResolver.js';
import { LinkifyRegistryContext } from './context.js';

export interface SmartLinkProps extends React.PropsWithChildren {
  to: string;          // slug
  tipKey?: string;     // registry id to fetch ShortNote
  icon?: string;       // icon id
  match?: string;      // original matched text
}

/**
 * Behavior:
 * - Desktop: Hover over text shows tooltip; click on text or icon navigates.
 * - Mobile: Tap on icon toggles tooltip; tap on text navigates.
 * Rendering: icon AFTER text.
 */
export default function SmartLink({ to, children, tipKey, icon, match }: SmartLinkProps) {
  const registry = React.useContext(LinkifyRegistryContext);
  const Entry = tipKey && registry ? registry[tipKey] : undefined;
  const Short = Entry?.ShortNote;

  // Mobile detection (rough): browsers that don't support hover
  const [isHoverCapable, setIsHoverCapable] = React.useState(true);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia?.('(hover: hover)');
    setIsHoverCapable(!!mq?.matches);
    const onChange = () => setIsHoverCapable(!!mq?.matches);
    mq?.addEventListener?.('change', onChange);
    return () => mq?.removeEventListener?.('change', onChange);
  }, []);

  // Controlled open state for mobile (icon tap)
  const [open, setOpen] = React.useState(false);
  const toggleOpen = React.useCallback(() => setOpen(v => !v), []);
  const close = React.useCallback(() => setOpen(false), []);

  // Tooltip content: render ShortNote if available; otherwise no tooltip
  const content = Short ? <Short /> : undefined;

  // Anchor onClick should close tooltip on navigation
  const onAnchorClick: React.MouseEventHandler<HTMLAnchorElement> = () => {
    // allow navigation; just close
    setOpen(false);
  };

  // Icon button for mobile toggle (but clickable to navigate as well on desktop)
  const iconNode = icon ? (
    <span className="lm-smartlink__iconwrap" aria-hidden="true">
      {/* Desktop: icon also navigates (inside <a>) */}
      {/* Mobile: we need a separate toggle; we keep both: click on icon toggles only if no-hover env */}
      <span
        className="lm-smartlink__icon"
        onClick={(e) => {
          if (!isHoverCapable && content) {
            // stop navigation; toggle tooltip
            e.preventDefault();
            e.stopPropagation();
            toggleOpen();
          }
          // else: let anchor handle navigation
        }}
      >
        <IconResolver iconId={icon} />
      </span>
    </span>
  ) : null;

  // We wrap trigger as the anchor itself for desktop hover/focus
  const trigger = (
    <a
      href={to}
      className="lm-smartlink"
      data-tipkey={tipKey ?? undefined}
      onClick={onAnchorClick}
      onBlur={close}
    >
      <span className="lm-smartlink__text">{children}</span>
      {iconNode}
    </a>
  );

  return (
    <Tooltip
      content={content}
      open={isHoverCapable ? undefined : open}
      onOpenChange={isHoverCapable ? undefined : setOpen}
      delayDuration={150}
      maxWidth={360}
    >
      {trigger}
    </Tooltip>
  );
}
