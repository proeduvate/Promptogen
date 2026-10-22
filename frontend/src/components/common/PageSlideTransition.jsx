import { useState, useEffect, useRef } from "react";

const PAGE_HIERARCHY = {
  home: 0,
  "my-prompts": 1,
  library: 1,
  analytics: 2,
};

export default function PageSlideTransition({
  currentKey,
  children,
}) {
  const [displayed, setDisplayed] = useState({
    key: currentKey,
    element: children,
  });
  const [exiting, setExiting] = useState(null);
  const [direction, setDirection] = useState("forward");
  const prevKeyRef = useRef(currentKey);
  const transitionTimerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (currentKey !== prevKeyRef.current) {
      const prevIdx = PAGE_HIERARCHY[prevKeyRef.current] ?? 0;
      const nextIdx = PAGE_HIERARCHY[currentKey] ?? 0;
      const dir = nextIdx >= prevIdx ? "forward" : "backward";

      setDirection(dir);
      // Capture the current child before swapping
      setExiting(displayed.element);
      setDisplayed({ key: currentKey, element: children });
      prevKeyRef.current = currentKey;

      // Immediately reset scroll position of the main content area to top
      const scrollContainer = containerRef.current?.closest("main");
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }

      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }

      // Finish transition after animation duration
      transitionTimerRef.current = setTimeout(() => {
        setExiting(null);
      }, 360);
    } else {
      // Re-render child updates without re-triggering slide
      setDisplayed({ key: currentKey, element: children });
    }

    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current);
      }
    };
  }, [currentKey, children]);

  return (
    <div ref={containerRef} className="relative w-full min-h-full overflow-x-hidden">
      {/* Outgoing Exiting Page (pinned absolutely while sliding away) */}
      {exiting && (
        <div
          key={`exit-${direction}`}
          data-exiting="true"
          aria-hidden="true"
          className={`absolute inset-0 w-full min-h-full pointer-events-none z-0 ${
            direction === "forward"
              ? "animate-page-exit-to-left"
              : "animate-page-exit-to-right"
          }`}
        >
          {exiting}
        </div>
      )}

      {/* Incoming Active Page */}
      <div
        key={`enter-${displayed.key}-${direction}`}
        className={`w-full min-h-full relative z-10 ${
          exiting
            ? direction === "forward"
              ? "animate-page-enter-from-right"
              : "animate-page-enter-from-left"
            : ""
        }`}
      >
        {displayed.element}
      </div>
    </div>
  );
}
