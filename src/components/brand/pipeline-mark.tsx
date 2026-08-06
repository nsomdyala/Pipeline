type PipelineMarkProps = {
  size?: number;
  className?: string;
  animated?: boolean;
};

/** Pipeline mark — dark purple disc with three ascending white bars. */
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
      <circle cx="24" cy="24" r="24" fill="#2B1A2F" />
      <rect
        className={animated ? "mark-bar mark-bar-1" : undefined}
        x="12.25"
        y="19"
        width="4.5"
        height="10"
        rx="2.25"
        fill="#FFFFFF"
      />
      <rect
        className={animated ? "mark-bar mark-bar-2" : undefined}
        x="21.75"
        y="15.5"
        width="4.5"
        height="17"
        rx="2.25"
        fill="#FFFFFF"
      />
      <rect
        className={animated ? "mark-bar mark-bar-3" : undefined}
        x="31.25"
        y="12"
        width="4.5"
        height="24"
        rx="2.25"
        fill="#FFFFFF"
      />
    </svg>
  );
}
