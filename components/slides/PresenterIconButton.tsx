"use client";

import type { ReactNode } from "react";

/** Space keeps stepping the deck while a button has focus, rather than pressing the button too;
 *  Enter presses it. */
export function PresenterIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      onKeyUp={(event) => {
        if (event.key === " ") event.preventDefault();
      }}
      className="hw-icon-button"
    >
      {children}
    </button>
  );
}
