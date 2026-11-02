import { Part } from "../../Part";
import { partFrame } from "../../state";

export default { component: Part };

export const Variants = {
  args: { name: "DisplayHeading" },
  decorators: [partFrame("DisplayHeading")],
};
