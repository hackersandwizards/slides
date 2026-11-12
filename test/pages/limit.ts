/** A fixed limit stretched by the gate's load factor, as scaffolding's docs/gate.md says. */
export const limit = (ms: number) =>
  (ms * (Number(process.env.SCAFFOLDING_TEST_TIMEOUT_MS) || 5000)) / 5000;
