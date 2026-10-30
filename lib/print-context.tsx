"use client";

import { createContext, useContext } from "react";

const PrintContext = createContext(false);

export function PrintProvider({ children }: { children: React.ReactNode }) {
  return <PrintContext value={true}>{children}</PrintContext>;
}

export function usePrintMode() {
  return useContext(PrintContext);
}
