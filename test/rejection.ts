/** The error `promise` rejects with, as text; fails when it resolves. In place of
 * `expect().rejects`, which `eslint.config.js` refuses and says why. */
export const rejection = (promise: Promise<unknown>) =>
  promise.then(
    (value) => {
      throw new Error(`expected a rejection, resolved with ${JSON.stringify(value)}`);
    },
    (e: unknown) => String(e),
  );
