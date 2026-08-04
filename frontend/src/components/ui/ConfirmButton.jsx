import { useEffect, useRef, useState } from "react";
import Button from "./Button";

const CONFIRM_WINDOW_MS = 4000;

/**
 * Sprint 25 — every destructive action must require confirmation. No modal
 * library, nothing decorative: the first click arms the button and its own
 * label states exactly what will happen ("Click again to confirm — this
 * cannot be undone"); the destructive action only fires on the second
 * click, within a short window, after which it disarms itself automatically
 * so a stray later click can never trigger it.
 */
export default function ConfirmButton({ onConfirm, label, confirmLabel, className, disabled }) {
  const [armed, setArmed] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  const handleClick = () => {
    if (!armed) {
      setArmed(true);
      timeoutRef.current = setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS);
      return;
    }
    clearTimeout(timeoutRef.current);
    setArmed(false);
    onConfirm();
  };

  return (
    <Button
      type="button"
      className={`${className || "ghost-button"} ${armed ? "pill risk" : ""}`.trim()}
      onClick={handleClick}
      disabled={disabled}
    >
      {armed ? confirmLabel || "Click again to confirm — this cannot be undone" : label}
    </Button>
  );
}
