// An `.astro` import as a component under tsc, which only Astro's own checker reads further.
declare module "*.astro" {
  const component: (props: Record<string, unknown>) => unknown;
  export default component;
}

declare const __SLIDES_ROOT__: string;
declare const __BRAND_ROOT__: string;
