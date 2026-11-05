type EmptyStateProps = {
  title: string;
  body: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <svg className="empty-art" viewBox="0 0 160 100" aria-hidden="true">
        <rect x="18" y="28" width="124" height="8" rx="2" fill="#e6b15a" />
        <rect x="18" y="58" width="124" height="8" rx="2" fill="#c4a35a" />
        <rect x="18" y="88" width="124" height="8" rx="2" fill="#7a1f1f" />
        <rect x="36" y="12" width="16" height="16" rx="3" fill="#f6f1e7" opacity="0.85" />
        <rect x="60" y="14" width="12" height="14" rx="3" fill="#f6f1e7" opacity="0.55" />
        <rect x="92" y="42" width="18" height="16" rx="3" fill="#f6f1e7" opacity="0.75" />
        <rect x="48" y="74" width="14" height="14" rx="3" fill="#f6f1e7" opacity="0.4" />
      </svg>
      <h2>{title}</h2>
      <p>{body}</p>
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}
