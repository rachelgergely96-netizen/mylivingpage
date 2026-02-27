import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function useAnimatedCounter(target: number, duration: number, active: boolean): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setValue(0);
      startRef.current = null;
      return;
    }

    const animate = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      setValue(Math.floor(easeOutCubic(progress) * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, active]);

  return value;
}
