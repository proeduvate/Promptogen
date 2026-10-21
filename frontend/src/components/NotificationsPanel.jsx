import { useEffect, useId, useRef, useState } from "react";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { ICON_TILE, LINK_BUTTON } from "../lib/ui";
import { timeAgo } from "../lib/time";

/* Bell button with an anchored popover. Closes on outside click, Escape,
   a second bell click, or tabbing out; Escape hands focus back to the bell. */
export default function NotificationsPanel({ items = [], onMarkRead, onMarkAllRead }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const bellRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();
  const headingId = useId();
  const unreadCount = items.filter((item) => item.unread).length;

  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.focus();
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        bellRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  /* Keyboard users tabbing past the last item leave the panel, so close it. */
  const handleBlur = (event) => {
    if (event.relatedTarget && !rootRef.current?.contains(event.relatedTarget)) setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative" onBlur={handleBlur}>
      <button
        ref={bellRef}
        type="button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={[
          "relative grid size-10 place-items-center rounded-full transition-colors hover:bg-surface hover:text-text",
          open ? "bg-surface text-text" : "text-muted",
        ].join(" ")}
      >
        <Bell className="size-[21px]" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-bg"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-labelledby={headingId}
          tabIndex={-1}
          className="pg-fade-in absolute right-0 top-full z-30 mt-2 flex max-h-[min(480px,calc(100dvh-6rem))] w-[min(380px,calc(100vw-3rem))] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl outline-none"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-2">
              <h2 id={headingId} className="text-[15px] font-semibold">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="whitespace-nowrap rounded-full bg-brand/10 px-2 py-0.5 text-[12px] font-medium text-brand max-sm:hidden">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                onMarkAllRead?.();
                /* The button disables itself, so keep focus inside the panel. */
                panelRef.current?.focus();
              }}
              disabled={unreadCount === 0}
              className={`${LINK_BUTTON} shrink-0 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-brand`}
            >
              <CheckCheck className="size-4" strokeWidth={1.75} />
              Mark all as read
            </button>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-12 text-center">
              <span className={`${ICON_TILE} size-12 bg-brand/10 ring-brand/20`}>
                <BellOff className="size-6 text-brand" strokeWidth={1.75} />
              </span>
              <p className="mt-4 text-[15px] font-semibold">You're all caught up</p>
              <p className="mt-1 text-[13px] text-muted">New notifications will show up here.</p>
            </div>
          ) : (
            <ul className="space-y-1 overflow-y-auto p-1.5">
              {items.map(({ id, title, body, createdAt, unread, icon: Icon, tone, tint }) => (
                <li key={id}>
                  {/* Hand-off point: open the notification's target once the API provides one. */}
                  <button
                    type="button"
                    onClick={() => onMarkRead?.(id)}
                    className={[
                      "flex w-full gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-2",
                      unread ? "bg-brand/5" : "",
                    ].join(" ")}
                  >
                    <span className={`${ICON_TILE} size-9 ${tint}`}>
                      <Icon className={`size-[18px] ${tone}`} strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="text-[14px] font-medium leading-5">{title}</span>
                        {unread && (
                          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
                        )}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-5 text-muted">{body}</span>
                      <time dateTime={createdAt} className="mt-1 block text-[12px] text-faint">
                        {timeAgo(createdAt)}
                      </time>
                      {unread && <span className="sr-only">Unread</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
