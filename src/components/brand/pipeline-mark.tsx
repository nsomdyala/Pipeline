type PipelineMarkProps = {
  size?: number;
  className?: string;
  animated?: boolean;
};

/** Clay Bureau mark — ink disc with terracotta live bar. */
export function PipelineMark({
  size = 48,
  className = "",
  animated = false,
}: PipelineMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
    >
      <circle cx="24" cy="24" r="24" fill="#2A2E22" />
      <rect
        className={animated ? "mark-bar mark-bar-1" : undefined}
        x="14"
        y="21.5"
        width="20"
        height="5"
        rx="2.5"
        fill="#A8652C"
      />
    </svg>
  );
}
