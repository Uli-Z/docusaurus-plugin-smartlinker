import React from 'react';
import { useMDXComponents } from '@mdx-js/react';
import Tooltip from './Tooltip.js';
import IconResolver from './IconResolver.js';
import { LinkifyRegistryContext } from './context.js';
import useBaseUrl from '@docusaurus/useBaseUrl';

export interface SmartLinkProps extends React.PropsWithChildren {
  to: string;          // slug
  tipKey?: string;     // registry id to fetch ShortNote
  icon?: string;       // icon id
  match?: string;      // original matched text
}

/**
 * Behavior:
 * - Desktop: Hover over text shows tooltip; click on text or icon navigates.
 * - Mobile: First tap on link (text or icon) shows tooltip; second tap navigates.
 * Rendering: icon AFTER text.
 */
export default function SmartLink({ to, children, tipKey, icon, match }: SmartLinkProps) {
  const registry = React.useContext(LinkifyRegistryContext);
  const Entry = tipKey && registry ? registry[tipKey] : undefined;
  const Short = Entry?.ShortNote;
  const mdxComponents = useMDXComponents();
  const childText = typeof children === 'string' ? children : undefined;

  const candidateSlug = Entry?.permalink ? null : Entry?.slug ?? to;
  const candidateHref = Entry?.permalink ?? (candidateSlug || to);
  const resolvedHref = useBaseUrl(candidateHref);

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

  // Controlled open state for mobile (link tap)
  const [open, setOpen] = React.useState(false);
  const close = React.useCallback(() => setOpen(false), []);

  // Tooltip content: render ShortNote if available; otherwise no tooltip
  const content = Short ? <Short components={mdxComponents} /> : undefined;
  const hasTooltip = Boolean(content);

  // On mobile, first tap opens tooltip; second tap navigates.
  const handleLinkClick = React.useCallback<
    React.MouseEventHandler<HTMLAnchorElement>
  >(
    (event) => {
      if (!isHoverCapable && hasTooltip && !open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(true);
        return;
      }

      // Allow navigation, but ensure tooltip is closed for subsequent renders.
      setOpen(false);
    },
    [hasTooltip, isHoverCapable, open],
  );

  // Icon button for mobile toggle (but clickable to navigate as well on desktop)
  const textNode = (
    <a
      href={resolvedHref}
      className="lm-smartlink__anchor"
      data-tipkey={tipKey ?? undefined}
      onClick={handleLinkClick}
    >
      <span className="lm-smartlink__text">{children}</span>
    </a>
  );

  const baseLabel = match ?? childText;
  const iconLabel = !isHoverCapable
    ? baseLabel
      ? `Open tooltip for ${baseLabel}`
      : 'Open tooltip'
    : undefined;

  const iconNode = icon ? (
    <a
      href={resolvedHref}
      className="lm-smartlink__iconlink"
      onClick={handleLinkClick}
      onFocus={!isHoverCapable ? undefined : close}
      tabIndex={isHoverCapable ? -1 : 0}
      aria-hidden={isHoverCapable ? true : undefined}
      aria-label={iconLabel}
    >
      <span className="lm-smartlink__iconwrap">
        <span className="lm-smartlink__icon">
          <IconResolver iconId={icon} />
        </span>
      </span>
    </a>
  ) : null;

  // Tooltip trigger groups text + icon so they can be styled separately
  const trigger = (
    <span className="lm-smartlink" data-tipkey={tipKey ?? undefined} role="group" onBlur={close}>
      {textNode}
      {iconNode}
    </span>
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
