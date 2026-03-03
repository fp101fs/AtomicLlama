import React from "react";
import s from "./AnimatedBalance.module.css";

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

type AnimatedBalanceProps = {
  value: number;
  prefix?: string;
  duration?: number;
  className?: string;
};

export function AnimatedBalance({
  value,
  prefix = "$",
  duration = 600,
  className,
}: AnimatedBalanceProps) {
  const prevRef = React.useRef(value);
  const [display, setDisplay] = React.useState(value);
  const [animating, setAnimating] = React.useState(false);
  const rafRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;

    if (from === to) return;

    setAnimating(true);
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      setDisplay(from + (to - from) * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(to);
        setAnimating(false);
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value, duration]);

  const classes = [s.root, animating ? s.animating : "", className].filter(Boolean).join(" ");

  return <span className={classes}>{`${prefix}${display.toFixed(2)}`}</span>;
}
