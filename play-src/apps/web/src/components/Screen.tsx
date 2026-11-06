import type { ReactNode, Ref } from "react";

// Every screen is one fixed-height column: a header, a main area that scrolls on its own,
// and an optional footer (the teacher's control bar, the student's Submit button). Nothing
// is position:fixed over content, so a wrapped control bar can never hide an answer tile,
// and a short projector fits the whole stage without a page scroll. Safe-area padding keeps
// iPhone notches and the home indicator clear (see .bb-screen / .bb-footer in app.css).

export function Screen({
  header,
  footer,
  children,
  mainClassName = "",
  mainRef,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  mainClassName?: string;
  mainRef?: Ref<HTMLElement>;
}) {
  return (
    <div className="bb-screen flex flex-col">
      {header}
      {/* Focusable, so keyboard users can scroll a long question or results list (WCAG 2.1.1). */}
      <main
        ref={mainRef}
        data-scroll
        tabIndex={0}
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden ${footer ? "" : "bb-main-end"} ${mainClassName}`}
      >
        {children}
      </main>
      {footer}
    </div>
  );
}

/** A form or message centred in the main area; `m-auto` (not justify-center) so it never clips when taller than the screen. */
export function CenteredCard({ children, className = "max-w-sm" }: { children: ReactNode; className?: string }) {
  return <div className={`m-auto w-full px-4 py-6 ${className}`}>{children}</div>;
}
