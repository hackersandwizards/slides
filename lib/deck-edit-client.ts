import { writeStored } from "./browser-storage";
import { directionKey } from "./slide-arrival";

const ENDPOINT = "/api/deck-edit";

type Answer = { value?: string; index?: number; error?: string; ok?: boolean };

async function ask(body: object): Promise<Answer> {
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await response.json()) as Answer;
  } catch {
    return { error: "The dev server did not answer." };
  }
}

export async function submitDeckEdit(deck: string, from: string, to: string): Promise<Answer> {
  // The save reloads the slide. Arriving "backwards" opens it fully revealed, so the
  // result shows; a host that refreshes in place keeps the slide, and the mark is dropped.
  writeStored("session", directionKey(), "back");
  setTimeout(() => writeStored("session", directionKey(), null), 3000);
  const answer = await ask({ deck, from, to });
  // Nothing was saved, so a reload must open the slide as it was.
  if (!answer.ok) writeStored("session", directionKey(), null);
  return answer;
}

export async function resolveDeckClick(
  deck: string,
  chain: Element[],
): Promise<{ element: Element; value: string } | { error: string }> {
  const texts = chain.map((element) => (element.textContent ?? "").slice(0, 4000));
  const answer = await ask({ deck, texts });
  if (answer.value !== undefined && answer.index !== undefined)
    return { element: chain[answer.index], value: answer.value };
  return { error: answer.error ?? "This text cannot be edited here." };
}
