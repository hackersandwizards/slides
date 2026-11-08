import { TeamTopologySlide } from "../../../components/slides/TeamTopologySlide";
import { storySlide } from "../../StorySlide";
import { state } from "../../state";

export default { component: storySlide(TeamTopologySlide) };

export const Specimen = state("team-topology", 0, "TeamTopologySlide");
export const Specimen2 = state("team-topology", 1, "TeamTopologySlide");
