import { useEffect, useRef, useState } from "react";

export function useTypewriter(text: string, speed: number, active: boolean): string {
  const [displayed, setDisplayed] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!active) {
      setDisplayed("");
      return;
    }

    let i = 0;
    intervalRef.current = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(intervalRef.current);
    }, speed);

    return () => clearInterval(intervalRef.current);
  }, [text, speed, active]);

  return displayed;
}
