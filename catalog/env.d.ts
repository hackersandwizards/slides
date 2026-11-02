// An `.astro` import as a component under tsc, which only Astro's own checker reads further.
declare module "*.astro" {
  const component: (props: Record<string, unknown>) => unknown;
  export default component;
}

// The checkout's absolute path, which catalog/astro.config.ts defines for print.ts.
declare const __SLIDES_ROOT__: string;
