import ArrowRightLeft from "lucide-react/icons/arrow-right-left";
import BarChart3 from "lucide-react/icons/chart-column";
import Book from "lucide-react/icons/book";
import Bot from "lucide-react/icons/bot";
import Brain from "lucide-react/icons/brain";
import Briefcase from "lucide-react/icons/briefcase";
import Calendar from "lucide-react/icons/calendar";
import CheckCircle from "lucide-react/icons/circle-check-big";
import Cloud from "lucide-react/icons/cloud";
import Coins from "lucide-react/icons/coins";
import Code from "lucide-react/icons/code";
import Compass from "lucide-react/icons/compass";
import Database from "lucide-react/icons/database";
import Eye from "lucide-react/icons/eye";
import Factory from "lucide-react/icons/factory";
import File from "lucide-react/icons/file";
import FileType from "lucide-react/icons/file-type";
import FileText from "lucide-react/icons/file-text";
import GitPullRequest from "lucide-react/icons/git-pull-request";
import Globe from "lucide-react/icons/globe";
import GraduationCap from "lucide-react/icons/graduation-cap";
import HelpCircle from "lucide-react/icons/circle-question-mark";
import Key from "lucide-react/icons/key";
import Layers from "lucide-react/icons/layers";
import Lightbulb from "lucide-react/icons/lightbulb";
import ListChecks from "lucide-react/icons/list-checks";
import Map from "lucide-react/icons/map";
import MessageSquare from "lucide-react/icons/message-square";
import Palette from "lucide-react/icons/palette";
import Pause from "lucide-react/icons/pause";
import Pencil from "lucide-react/icons/pencil";
import Play from "lucide-react/icons/play";
import Plug from "lucide-react/icons/plug";
import Presentation from "lucide-react/icons/presentation";
import Puzzle from "lucide-react/icons/puzzle";
import RefreshCw from "lucide-react/icons/refresh-cw";
import Rocket from "lucide-react/icons/rocket";
import Scroll from "lucide-react/icons/scroll";
import Search from "lucide-react/icons/search";
import Shield from "lucide-react/icons/shield";
import ShieldCheck from "lucide-react/icons/shield-check";
import Sparkles from "lucide-react/icons/sparkles";
import Split from "lucide-react/icons/split";
import Target from "lucide-react/icons/target";
import Terminal from "lucide-react/icons/terminal";
import TestTube2 from "lucide-react/icons/test-tube-diagonal";
import Timer from "lucide-react/icons/timer";
import TrendingUp from "lucide-react/icons/trending-up";
import Users from "lucide-react/icons/users";
import Workflow from "lucide-react/icons/workflow";
import Wrench from "lucide-react/icons/wrench";
import Zap from "lucide-react/icons/zap";
import type { LucideIcon } from "lucide-react";

// lucide-react 1.0 dropped its brand icons; this is its last LinkedIn glyph (0.556.0, ISC), drawn
// with lucide's default attributes. `createLucideIcon` lives only in the package's barrel, which
// would load every icon in a dev server.
export function Linkedin({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`lucide lucide-linkedin ${className ?? ""}`}
      aria-hidden="true"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export const iconMap: Record<string, LucideIcon> = {
  analysis: BarChart3,
  "arrow-right-left": ArrowRightLeft,
  "bar-chart": BarChart3,
  book: Book,
  bot: Bot,
  brain: Brain,
  briefcase: Briefcase,
  browser: Globe,
  calendar: Calendar,
  "check-circle": CheckCircle,
  cloud: Cloud,
  code: Code,
  coins: Coins,
  compass: Compass,
  database: Database,
  decision: Split,
  document: FileText,
  eye: Eye,
  factory: Factory,
  file: File,
  "file-type": FileType,
  "git-pull-request": GitPullRequest,
  graduation: GraduationCap,
  graph: BarChart3,
  key: Key,
  layers: Layers,
  lightbulb: Lightbulb,
  log: ListChecks,
  map: Map,
  palette: Palette,
  pause: Pause,
  pencil: Pencil,
  play: Play,
  plug: Plug,
  presentation: Presentation,
  puzzle: Puzzle,
  question: HelpCircle,
  refresh: RefreshCw,
  review: MessageSquare,
  rocket: Rocket,
  script: Scroll,
  search: Search,
  shield: Shield,
  "shield-check": ShieldCheck,
  sparkles: Sparkles,
  target: Target,
  terminal: Terminal,
  test: TestTube2,
  timer: Timer,
  "trending-up": TrendingUp,
  users: Users,
  workflow: Workflow,
  wrench: Wrench,
  zap: Zap,
};

export type { LucideIcon };
