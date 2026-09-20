

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  gradient?: boolean;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 10,
  color = 'var(--color-primary)',
  trackColor = 'var(--color-surface)',
  label,
  sublabel,
  gradient = true,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  const gradientId = `ring-grad-${size}`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
        )}
        {/* Background track */}
        <circle
          stroke={trackColor}
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress indicator */}
        <circle
          stroke={gradient ? `url(#${gradientId})` : color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          style={{
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {/* Center content */}
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
          {label ?? `${progress}%`}
        </span>
        {sublabel && (
          <span className="text-[10px] text-[var(--color-text-muted)] mt-1 max-w-[70px] leading-tight">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
