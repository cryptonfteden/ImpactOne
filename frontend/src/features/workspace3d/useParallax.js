import { useEffect, useRef } from "react";

// Phase CINEMATIC-EXPERIENCE-002 — "mouse movement creates subtle
// parallax... lighting reacts to interaction." A real, minimal pointer-
// tracking ref (not React state — this is read every frame inside a
// useFrame callback, so a state-driven re-render on every mousemove
// would be real, unnecessary work; a ref avoids it entirely). Values
// are normalized to [-1, 1] on both axes, centered on the viewport.
export default function useParallax() {
  const parallax = useRef({ x: 0, y: 0 });

  useEffect(() => {
    function handlePointerMove(event) {
      parallax.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      parallax.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return parallax;
}
