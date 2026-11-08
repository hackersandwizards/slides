import { Part } from "../../Part";
import { partFrame } from "../../state";

export default { component: Part };

export const Variants = { args: { name: "AxisTick" }, decorators: [partFrame("AxisTick")] };
