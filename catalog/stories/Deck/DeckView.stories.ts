import { DeckView } from "../../../components/deck/DeckView";
import { slideCatalog } from "../../../specimen/slide-catalog";
import { partFrame } from "../../state";

export default { component: DeckView };

// The arrow keys move the deck under /specimen/<n> inside the story's frame, a path no page
// serves: a reload there finds none.
export const SpecimenDeck = {
  args: { presentation: slideCatalog, index: 0, basePath: "/specimen" },
  decorators: [partFrame("DeckView")],
};
