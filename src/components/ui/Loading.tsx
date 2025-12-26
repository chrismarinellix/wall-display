interface LoadingProps {
  message?: string;
}

export function Loading({ message = 'Loading...' }: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="eink-loading">
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          className="text-eink-dark"
        >
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="80"
            strokeDashoffset="60"
          />
        </svg>
      </div>
      <p className="eink-mono text-sm text-eink-dark">{message}</p>
    </div>
  );
}
