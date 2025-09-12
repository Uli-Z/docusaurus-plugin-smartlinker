import React from 'react';

export interface SmartLinkProps extends React.PropsWithChildren {
  to: string;
  icon?: string;
  tipKey?: string;
  match?: string;
}

export default function SmartLink(props: SmartLinkProps) {
  const { to, children, icon } = props;
  return (
    <a href={to} className="lm-smartlink">
      <span className="lm-smartlink__text">{children}</span>
      {icon ? <span className="lm-smartlink__icon" aria-hidden="true">🔗</span> : null}
    </a>
  );
}