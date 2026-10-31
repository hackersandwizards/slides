"use client";

import NextImage from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { SlidesAdapterProvider, type AdapterImageProps } from "./adapter";

function NextImageWithAlt({ alt, ...rest }: AdapterImageProps) {
  return <NextImage {...rest} alt={alt ?? ""} />;
}

/** The Next consumers' adapter: `next/image` and Next's router behind the engine, so a slide
 *  change is a client-side transition and an arrow press does not reload the document. A Next
 *  consumer wraps its root layout in it; the trainer hub, on Astro, never imports this file. */
export function NextSlidesAdapter({ children }: { children: ReactNode }) {
  const router = useRouter();
  const adapter = useMemo(
    () => ({
      Image: NextImageWithAlt,
      navigate: (href: string, replace: boolean) =>
        replace ? router.replace(href) : router.push(href),
    }),
    [router],
  );
  return <SlidesAdapterProvider adapter={adapter}>{children}</SlidesAdapterProvider>;
}
