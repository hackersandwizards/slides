"use client";

import {
  createContext,
  useContext,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
} from "react";

export interface ImageProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  /** `next/image`'s above-the-fold hint. */
  priority?: boolean;
  unoptimized?: boolean;
}

/** What the engine hands an adapter's image: `loading="eager"` on the print route, which stacks
 *  every slide below the first screen. */
export type AdapterImageProps = ImageProps & { loading?: "eager" };

/** What a consumer's framework puts behind the engine: its image component, and how it moves to a
 *  slide's URL (`replace` when a frame inside the speaker window follows the deck, so Back there
 *  moves the deck). Without a provider the engine renders a plain `<img>` and moves with
 *  `history`, which is all a single deck island needs. */
export interface SlidesAdapter {
  Image?: ComponentType<AdapterImageProps>;
  navigate?: (href: string, replace: boolean) => void;
}

const AdapterContext = createContext<SlidesAdapter>({});

export function SlidesAdapterProvider({
  adapter,
  children,
}: {
  adapter: SlidesAdapter;
  children: ReactNode;
}) {
  return <AdapterContext value={adapter}>{children}</AdapterContext>;
}

export function useSlidesAdapter(): SlidesAdapter {
  return useContext(AdapterContext);
}
