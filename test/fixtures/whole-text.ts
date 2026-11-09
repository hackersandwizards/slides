/** A Testing Library matcher for the innermost element whose text is exactly `text`: a compound
 *  or a role sits in its own span, so the text a deck typed can span several nodes. */
export const wholeText = (text: string) => {
  const holds = (el: Element | null) => el?.textContent === text;
  return (_: string, el: Element | null) => holds(el) && ![...(el?.children ?? [])].some(holds);
};
