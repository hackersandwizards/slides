// Here as well as in `vite/client`: a consumer type-checks the engine's source under its own
// tsconfig, and `astro/client` declares no `?url`.
declare module "*.svg?url&no-inline" {
  const url: string;
  export default url;
}
