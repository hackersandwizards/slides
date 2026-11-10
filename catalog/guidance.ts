/** Each catalogue entry's guidance, under its anchor on the print page: when to take it, a do and
 *  a don't. The page's build fails on an entry without one. */
export interface Guidance {
  when: string;
  do: string;
  dont: string;
}

const g = (when: string, doThis: string, dont: string): Guidance => ({ when, do: doThis, dont });

export const GUIDANCE: Record<string, Guidance> = {
  title: g(
    "Opens a talk or a part of it, with its name and speaker.",
    "Keep the title to one line.",
    "Put the agenda on it.",
  ),
  "title-opening": g(
    "The very first slide of a talk, the one on screen while people sit down.",
    "Show it before you start speaking.",
    "Use it again for a later part.",
  ),
  content: g(
    "A point that needs text: bullets, a paragraph, a table or a mix.",
    "Say the claim in the headline.",
    "Reach for it when a type below draws your point.",
  ),
  "content-centered": g(
    "A demo or an exercise the room follows on screen: the command or the figures in the middle.",
    "Keep to one block under the headline.",
    "Use it for a sentence alone, which is a statement.",
  ),
  regular: g(
    "A person and what they built or stand for, beside their profile.",
    "Keep the sections to what the audience needs from them.",
    "Use it for a list with no person behind it.",
  ),
  statement: g(
    "One sentence the room should remember.",
    "Let the sentence stand alone.",
    "Add a list under it.",
  ),
  "statement-quotation": g(
    "Someone else's words carry the point.",
    "Name who said it.",
    "Shorten a quote until it changes its meaning.",
  ),
  "statement-qr": g(
    "One link people should open on their phones now.",
    "Leave it on screen long enough to scan.",
    "Send them to a long page.",
  ),
  "grid-quotes": g(
    "Several short voices back one point, such as workshop feedback.",
    "Use three quotes of similar length.",
    "Give only one of them a portrait.",
  ),
  "grid-quotes-with-portraits": g(
    "Two or three people the room should see beside their words.",
    "Show a portrait for every author.",
    "Mix authors with and without a picture.",
  ),
  comparison: g(
    "Two options side by side, and the slide says which wins.",
    "Mark drawbacks with a minus.",
    "Leave a drawback unmarked, since it draws as a plus.",
  ),
  "comparison-before-after": g(
    "A change, from how it was to how it is now.",
    "Keep both sides parallel, line by line.",
    "Use it for two equal options.",
  ),
  "comparison-split": g(
    "Two sides that are neither good nor bad, such as two roles.",
    "Give each side the same number of points.",
    "Let one side carry a verdict.",
  ),
  "comparison-guidance": g(
    "A rule shown through a bad and a good example.",
    "Use a real example for each.",
    "Explain more than one rule.",
  ),
  "comparison-positions": g(
    "Two people disagree and a resolution settles it.",
    "State the resolution in one line.",
    "Use it when nobody really disagrees.",
  ),
  profiles: g(
    "Introduces the people in the room or on the team.",
    "Keep each bio to a line.",
    "List a full career.",
  ),
  "phased-pills": g(
    "Named stages grouped into phases, with where we stand now.",
    "Keep up to six stages in a phase, so they stay in one row.",
    "Colour phases by status.",
  ),
  process: g(
    "A fixed sequence of steps, straight or looping.",
    "Name each step with a verb.",
    "Use it for a list without an order.",
  ),
  lanes: g(
    "Parallel tracks that run side by side, such as teams or tools.",
    "Give every lane the same kind of content.",
    "Use it for one track.",
  ),
  chart: g(
    "How a group spreads across stages of adoption, on a bell curve.",
    "Mark the segment you are talking about.",
    "Use it for values over time.",
  ),
  "chart-graph": g(
    "The shape of a curve matters more than its numbers.",
    "Label both axes in words.",
    "Use it for measured data.",
  ),
  "chart-trend": g(
    "A measured value over time, with what is planned next.",
    "Mark the current point, so planned reads as planned.",
    "Draw more than two lines.",
  ),
  "chart-bar": g(
    "Named values to compare at a glance.",
    "Sort the bars when their order carries no meaning.",
    "Use it for a value over time.",
  ),
  question: g(
    "A multiple-choice question for the room.",
    "Stop talking once it is up.",
    "Offer more than four answers.",
  ),
  transition: g("Moves the talk into its next part.", "Name the part ahead.", "Add content to it."),
  closing: g(
    "Ends the talk with the takeaway and how to reach you.",
    "Leave it up during questions.",
    "Introduce a new point.",
  ),
  "closing-discussion": g(
    "Ends with an open round instead of a takeaway.",
    "Name what you want to discuss.",
    "Use it when no time is left.",
  ),
  roadmap: g(
    "What comes first and what follows, in two parts.",
    "Keep each part to what you will really do.",
    "Add dates, which a Gantt shows better.",
  ),
  gantt: g(
    "A schedule of work over weeks or months.",
    "Show only the bars the room needs.",
    "Use it for a day's agenda.",
  ),
  "team-topology": g(
    "How teams relate and who serves whom.",
    "Name the interaction between two teams.",
    "Show a full org chart.",
  ),
  agenda: g(
    "The route through a talk, or a day's schedule with times.",
    "Come back to it between the parts.",
    "List more than the room can hold.",
  ),
  wheel: g(
    "Several areas around one central idea.",
    "Put what ties them together in the centre.",
    "Use it for a sequence, which process draws.",
  ),
  decision: g(
    "Which kind of team a stream team's need goes to, decided by one yes-or-no question.",
    "Word the question so it has a yes and a no.",
    "Use it for any other choice, which a comparison draws.",
  ),
  activity: g(
    "Hands the room an exercise.",
    "Name the task, the time and the result.",
    "Hide the time limit.",
  ),
  "activity-demo": g(
    "Announces a live demo.",
    "Say what to watch for.",
    "Use it for a recording nobody discusses.",
  ),
  "activity-debrief": g(
    "Gathers what the room learned after an exercise.",
    "Ask one question at a time.",
    "Skip it to save time.",
  ),
  "block-table": g(
    "Exact values to compare across rows and columns.",
    "Keep cells to a few words.",
    "Use a table for what a sentence says.",
  ),
  "block-two-column": g(
    "Two lists on a content slide, with a judgement: what works against what fails.",
    "Keep both columns the same length.",
    "Use it when the whole slide is the comparison, which comparison draws.",
  ),
  "block-two-column-2": g(
    "Two columns of another judgement, such as a risk beside its context.",
    "Keep both columns the same length.",
    "Use a judging colour on neutral content.",
  ),
  "block-terminal-and-hooks": g(
    "A command line and what it triggers.",
    "Show the real command.",
    "Show a long log.",
  ),
  "block-image": g(
    "One picture carries the point.",
    "Say in the headline what to see in it.",
    "Use a picture as decoration.",
  ),
  "block-video": g(
    "A short recording shows what a picture cannot.",
    "Keep it under a minute.",
    "Rely on its sound in a large room.",
  ),
  "block-linked-image": g(
    "A screenshot of something people can open themselves.",
    "Link the page it shows.",
    "Use it for a page behind a login.",
  ),
  "block-image-and-grid": g(
    "A picture with a few short facts beside it.",
    "Let each fact point at the picture.",
    "Put a second message in the grid.",
  ),
  "block-image-and-grid-sketch": g(
    "A hand-drawn sketch with short notes beside it.",
    "Use a sketch when the idea is still rough.",
    "Use it for measured results.",
  ),
  "block-flow": g(
    "A chain of steps within a content slide.",
    "Keep to about five steps.",
    "Use it where process fits the whole slide.",
  ),
  "block-layers": g(
    "A stack where each level rests on the one below.",
    "Name the base at the bottom.",
    "Use it for a sequence.",
  ),
  "block-timeline": g(
    "Events on a line of time.",
    "Label each point with its date.",
    "Use it for a plan with bars, which Gantt draws.",
  ),
  "block-bars": g(
    "A few values shown as horizontal bars inside a text slide.",
    "Label each bar with its value.",
    "Use it for a whole chart slide's data.",
  ),
  "block-bars-as-ranges": g(
    "Spans between a low and a high value.",
    "Name the scale.",
    "Use it for single values.",
  ),
  "block-numbers": g(
    "A few figures that make the point.",
    "Give each figure its unit and source.",
    "Show more than four without a reason.",
  ),
  "block-annotated-image": g(
    "A picture whose parts need explaining.",
    "Number the notes in reading order.",
    "Add a note for each detail.",
  ),
  "block-cards": g(
    "A few points of equal weight, side by side.",
    "Give each card a short title.",
    "Use cards for a sequence.",
  ),
  "block-cards-four-columns": g(
    "Four points of equal weight in one row.",
    "Keep each card to a line or two.",
    "Fill them with full sentences.",
  ),
  "block-numbers-six-figures": g(
    "Six figures on one slide, as in an overview of results.",
    "Group related figures next to each other.",
    "Use it where three say enough.",
  ),
  "block-numbers-one-figure": g(
    "One figure that is the whole point of the slide.",
    "Put what it counts and its source right under it.",
    "Pick one figure out of several that belong together.",
  ),
  "block-flow-framed": g(
    "A chain of steps that belongs to one named system.",
    "Name the system in the frame.",
    "Frame a flow that stands alone.",
  ),
  "block-cards-dense": g(
    "Many short points that still need a card each.",
    "Keep titles to a few words.",
    "Use it where four cards would do.",
  ),
  "block-two-images": g(
    "Two pictures to compare.",
    "Caption what differs.",
    "Pair two pictures that say the same.",
  ),
  "block-gallery": g(
    "Several pictures of one kind, such as screens.",
    "Keep them the same size.",
    "Ask the room to read them.",
  ),
  "block-gallery-2": g(
    "Pictures with a caption each.",
    "Keep captions to a few words.",
    "Mix captioned and uncaptioned pictures.",
  ),
  "block-quote": g(
    "Someone else's words back a point on a content slide.",
    "Name who said or wrote them.",
    "Set your own claim as a quote.",
  ),
  "block-callout": g(
    "One aside, warning or tip on a content slide.",
    "Use one per slide.",
    "Use it for the slide's main point.",
  ),
  "block-code": g(
    "Code the room should read together.",
    "Highlight the lines you talk about.",
    "Show a whole file.",
  ),
};
