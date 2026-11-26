import { writeStored } from "./browser-storage";
import { directionKey } from "./slide-arrival";

const ENDPOINT = "/api/deck-edit";

type Answer = { value?: string; index?: number; error?: string; ok?: boolean };

async function ask(body: object): Promise<Answer> {
  const payload = JSON.stringify(body);
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
  } catch (error) {
    if (error instanceof TypeError) return { error: "The dev server did not answer." };
    throw error;
  }
  try {
    return (await response.json()) as Answer;
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError)
      return { error: "The dev server did not answer." };
    throw error;
  }
}

export async function submitDeckEdit(deck: string, from: string, to: string): Promise<Answer> {
  // The save reloads the slide. Arriving "backwards" opens it fully revealed, so the
  // result shows; a host that refreshes in place keeps the slide, and the mark is dropped.
  writeStored("session", directionKey(), "back");
  setTimeout(() => writeStored("session", directionKey(), null), 3000);
  let saved = false;
  try {
    const answer = await ask({ deck, from, to });
    saved = Boolean(answer.ok);
    return answer;
  } finally {
    // Nothing was saved, so a reload must open the slide as it was.
    if (!saved) writeStored("session", directionKey(), null);
  }
}

export async function resolveDeckClick(
  deck: string,
  chain: Element[],
): Promise<{ element: Element; value: string } | { error: string }> {
  const texts = chain.map((element) => (element.textContent ?? "").slice(0, 4000));
  const answer = await ask({ deck, texts });
  const element =
    typeof answer.index === "number" && Number.isInteger(answer.index)
      ? chain[answer.index]
      : undefined;
  if (typeof answer.value === "string" && element !== undefined)
    return { element, value: answer.value };
  return { error: answer.error ?? "This text cannot be edited here." };
}
