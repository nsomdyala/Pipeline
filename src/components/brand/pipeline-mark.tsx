type PipelineMarkProps = {
  size?: number;
  className?: string;
  animated?: boolean;
};

/** Inverse mark (mint tile) with optional advancing-bar motion. */
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
      <rect width="48" height="48" rx="13" fill="#1FC79C" />
      <rect
        className={animated ? "mark-bar mark-bar-1" : undefined}
        x="11"
        y="13"
        width="13"
        height="5"
        rx="2.5"
        fill="#06231a"
        opacity="0.35"
      />
      <rect
        className={animated ? "mark-bar mark-bar-2" : undefined}
        x="11"
        y="21.5"
        width="19"
        height="5"
        rx="2.5"
        fill="#06231a"
        opacity="0.65"
      />
      <rect
        className={animated ? "mark-bar mark-bar-3" : undefined}
        x="11"
        y="30"
        width="26"
        height="5"
        rx="2.5"
        fill="#06231a"
      />
    </svg>
  );
}
