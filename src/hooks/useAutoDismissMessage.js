import { useEffect, useState } from "react";

export default function useAutoDismissMessage(initialValue = "", delay = 10000) {
  const [message, setMessage] = useState(initialValue);

  useEffect(() => {
    if (!message) return undefined;

    const timer = window.setTimeout(() => {
      setMessage("");
    }, delay);

    return () => window.clearTimeout(timer);
  }, [delay, message]);

  return [message, setMessage];
}
