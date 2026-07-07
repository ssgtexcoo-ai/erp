'use client';

interface Props {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
}

const PALETTE = [
  { bg: 'rgba(191,90,242,0.18)', color: '#bf5af2' },
  { bg: 'rgba(10,132,255,0.18)',  color: '#0a84ff' },
  { bg: 'rgba(48,209,88,0.18)',   color: '#30d158' },
  { bg: 'rgba(255,159,10,0.18)', color: '#ff9f0a' },
  { bg: 'rgba(100,210,255,0.18)',color: '#64d2ff' },
  { bg: 'rgba(255,69,58,0.18)',  color: '#ff453a' },
];

function colorForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function UserAvatar({ name, avatarUrl, size = 36, className = '' }: Props) {
  const { bg, color } = colorForName(name);
  const style = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.max(10, Math.round(size * 0.38)),
    fontWeight: 700,
    background: bg,
    color,
    flexShrink: 0,
  } as React.CSSProperties;

  if (avatarUrl) {
    return (
      <div style={style} className={className}>
        <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  return (
    <div style={style} className={className}>
      {getInitials(name)}
    </div>
  );
}
