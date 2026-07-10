import { useEffect, useMemo, useState } from "react";

export default function AnimatedProgress({ duration = 900, label = "진행률", suffix = "%", value = 0 }) {
  const target = useMemo(() => Math.max(0, Math.min(Number(value || 0), 100)), [value]);
  const [displayValue, setDisplayValue] = useState(target);
  const [barValue, setBarValue] = useState(target);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setDisplayValue(target);
      setBarValue(target);
      return undefined;
    }

    setDisplayValue(0);
    setBarValue(0);
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(target * eased));
      setBarValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    });

    return () => cancelAnimationFrame(frame);
  }, [duration, target]);

  return (
    <div className="animated-progress" aria-label={`${label} ${target}${suffix}`}>
      <div className="meter-row">
        <span>{label}</span>
        <strong>
          {displayValue}
          {suffix}
        </strong>
      </div>
      <div className="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={target}>
        <span style={{ width: `${barValue}%` }} />
      </div>
    </div>
  );
}
