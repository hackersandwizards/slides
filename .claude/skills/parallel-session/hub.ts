// Builds the review hub index.html from its topic folders (default ~/Downloads/stand-entscheidungen).
// Per folder: the <title> of its index.html (one level down if needed) and review.json, of which
// only `current` reaches the page. A topic with `current.decision`, or whose `row` is `decided` in
// any given repo's docs/tracking/decisions/items.js, lands under "Entschieden". A topic ticked
// "gesehen" moves to a collapsed section at the bottom. Folders starting with "_" or "." are
// skipped. The index also lists every open items.js row and every open GOAL.md (else TODO.md) row,
// grouped by who acts and ordered by priority. Usage:
// bun hub.ts [--check] [--dir <hub>] [<repo> ...] (repos default to the current directory). --check only validates every items.js row and review.json and exits 1 on a defect.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const htmlEscape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

type Candidate = {
  label: string;
  score?: string | number;
  image?: string;
  recommended?: boolean;
};
type Review = {
  status?: "decide" | "use" | "info";
  title?: string;
  thumb?: string;
  report?: string;
  row?: string;
  current?: {
    question?: string;
    todo?: string;
    decision?: string;
    result?: string;
    candidates?: Candidate[];
  };
};

const args = process.argv.slice(2);
const checkAt = args.indexOf("--check");
const checkOnly = checkAt >= 0 && !!args.splice(checkAt, 1);
const dirAt = args.indexOf("--dir");
const root = resolve(
  dirAt >= 0 ? args.splice(dirAt, 2)[1] : join(homedir(), "Downloads", "stand-entscheidungen"),
);
const repos = (args.length ? args : ["."]).map((r) => resolve(r));
const repo = repos[0];
const IMAGE = /\.(png|jpe?g|webp|avif|gif|svg)$/i;

type Row = { id: string; status: string; [k: string]: unknown };
const decisionWindow: { DECISION_REPOS?: Record<string, Row[]> } = {};
const lists: { path: string; key: string }[] = [];
for (const r of repos) {
  const file = join(r, "docs/tracking/decisions/items.js");
  if (!existsSync(file)) continue;
  const before = new Set(Object.keys(decisionWindow.DECISION_REPOS ?? {}));
  new Function("window", readFileSync(file, "utf8"))(decisionWindow);
  for (const key of Object.keys(decisionWindow.DECISION_REPOS ?? {}))
    if (!before.has(key)) lists.push({ path: r, key });
}
const rows = Object.values(decisionWindow.DECISION_REPOS ?? {}).flat();
// Defects the build cannot survive; --check reports them with the rest.
const broken: string[] = [];
const REQUIRED = ["id", "title", "area", "priority", "order", "status", "context"];
const defects = Object.entries(decisionWindow.DECISION_REPOS ?? {}).flatMap(([repoKey, list]) => {
  const seen = new Set<string>();
  return list.flatMap((r, i) => {
    if (!r.id) {
      broken.push(`${repoKey} row ${i + 1} (${String(r.title ?? "untitled")}) has no id`);
      return [];
    }
    const at = `${repoKey}:${r.id}`;
    const out = REQUIRED.filter((k) => r[k] === undefined || r[k] === "").map(
      (k) => `${at} lacks ${k}`,
    );
    if (seen.has(r.id)) out.push(`${at} duplicate id`);
    seen.add(r.id);
    if (!["open", "assumed", "decided"].includes(r.status)) out.push(`${at} status ${r.status}`);
    if (![1, 2, 3].includes(r.priority as number)) out.push(`${at} priority ${r.priority}`);
    const keys = ((r.options as { key: string }[]) ?? []).map((o) => o.key);
    if (r.recommended && !keys.includes(r.recommended as string))
      out.push(`${at} recommended not an option`);
    if (r.status === "decided" && !r.decision) out.push(`${at} decided without decision`);
    return out;
  });
});
const ids = new Set(rows.map((r) => r.id));
if (!existsSync(root)) {
  console.error(`hub folder ${root} does not exist`);
  process.exit(1);
}
const reviewFiles = readdirSync(root)
  .filter((n) => !/^[_.]/.test(n) && existsSync(join(root, n, "review.json")))
  .map((n) => join(root, n, "review.json"));
for (const file of reviewFiles) {
  const at = file.slice(root.length + 1);
  let rv: Review;
  try {
    rv = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    broken.push(`${at} is not valid JSON: ${(e as Error).message}`);
    continue;
  }
  if (!rv || typeof rv !== "object" || Array.isArray(rv)) {
    broken.push(`${at} is not a JSON object`);
    continue;
  }
  if (rv.status && !["decide", "use", "info"].includes(rv.status))
    defects.push(`${at} status ${rv.status}`);
  if ((rv.current?.candidates?.length ?? 0) > 3) defects.push(`${at} more than three candidates`);
  if (rv.row && !rv.row.endsWith("*") && !rv.current?.decision && ids.size && !ids.has(rv.row))
    defects.push(`${at} row ${rv.row} not found`);
}
defects.unshift(...broken);
if (checkOnly) {
  console.log(defects.length ? defects.join("\n") : `ok: ${repos.length} repo(s)`);
  process.exit(defects.length ? 1 : 0);
}
if (broken.length) {
  console.error(broken.join("\n"));
  process.exit(1);
}
const decided = (row?: string) => {
  if (!row) return false;
  const hits = rows.filter((r) =>
    row.endsWith("*") ? r.id.startsWith(row.slice(0, -1)) : r.id === row,
  );
  return hits.length > 0 && hits.every((r) => r.status === "decided");
};

function findIndex(dir: string): string | undefined {
  if (existsSync(join(dir, "index.html"))) return "index.html";
  for (const sub of readdirSync(dir).sort()) {
    if (existsSync(join(dir, sub, "index.html"))) return `${sub}/index.html`;
  }
}

function firstImage(dir: string, index?: string): string | undefined {
  if (index) {
    const src = readFileSync(join(dir, index), "utf8").match(
      /<img[^>]*\ssrc=["']([^"']+)["']/,
    )?.[1];
    if (src && !/^(data:|https?:)/.test(src)) return join(index, "..", src);
  }
  return readdirSync(dir)
    .sort()
    .find((f) => IMAGE.test(f));
}

const topics = readdirSync(root)
  .filter((name) => !/^[_.]/.test(name) && statSync(join(root, name)).isDirectory())
  .map((name) => {
    const dir = join(root, name);
    const reviewPath = join(dir, "review.json");
    const review: Review = existsSync(reviewPath)
      ? JSON.parse(readFileSync(reviewPath, "utf8"))
      : {};
    const index = findIndex(dir);
    const title =
      review.title ??
      (index &&
        readFileSync(join(dir, index), "utf8")
          .match(/<title>([^<]*)<\/title>/)?.[1]
          ?.trim()) ??
      name;
    const candidates = [...(review.current?.candidates ?? [])]
      .sort((a, b) => Number(!!b.recommended) - Number(!!a.recommended))
      .slice(0, 3);
    const thumb = review.thumb ?? candidates.find((c) => c.image)?.image ?? firstImage(dir, index);
    const mtime = statSync(index ? join(dir, index) : dir).mtimeMs;
    return { name, review, index, title, candidates, thumb, mtime };
  })
  .sort((a, b) => b.mtime - a.mtime);

const reportHref = (p: string) =>
  "file://" +
  (p.startsWith("/") ? p : p.startsWith("~/") ? join(homedir(), p.slice(2)) : join(repo, p));

const listHref = (path: string) =>
  "file://" + join(path, ".claude/skills/parallel-session/decisions.html");
const oneLine = (s: string, n = 140) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, t.lastIndexOf(" ", n - 1)) + " …" : t;
};
const dateDe = (iso: string) => iso.split("-").reverse().join(".");

// Open work: the rows under each repo's GOAL.md (else TODO.md) "##" sections, minus the goal and
// done-means ones. A row is a table line (Punkt | Owner | Beleg), a top-level "- " bullet whose
// owner and evidence follow "Owner:" and "Evidence:"/"Beleg:", or an unticked "- [ ]". The owner
// starts with P1 to P3 and an optional ISO deadline, then whoever moves next: Benedikt, an agent
// of the fleet (AGENT), or anyone else.
const AGENT = /^(Ada|Poppy|Guy|Ray|Blaise|Rachel|Nora|Agent)\b/;
type Work = {
  point: string;
  actor: string;
  evidence: string;
  label: string;
  prio: number;
  due?: string;
  who: "me" | "others" | "agents";
};
const work: Work[] = repos.flatMap((r) => {
  const file = ["GOAL.md", "TODO.md"].map((f) => join(r, f)).find(existsSync);
  if (!file) return [];
  const label = lists.find((l) => l.path === r)?.key ?? r.split("/").pop()!;
  const items: { point: string; owner: string; evidence: string }[] = [];
  let skip = file.endsWith("GOAL.md");
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (line.startsWith("## ")) skip = /goal|ziel|done means|waiting/i.test(line);
    if (skip) continue;
    if (line.startsWith("|")) {
      const [point, owner = "", evidence = ""] = line
        .split(/(?<!\\)\|/)
        .slice(1, -1)
        .map((c) => c.trim());
      if (!point || /^:?-+:?$/.test(point) || /^(punkt|item|point)$/i.test(point)) continue;
      items.push({ point, owner, evidence });
    } else if (/^- (?!\[x\])/i.test(line)) {
      const text = line.replace(/^- (\[ \] )?/, "");
      items.push({
        point: text.split(/ Owner: | Beleg: | Evidence: /)[0],
        owner: text.match(/Owner: ([^.]*)\./)?.[1] ?? "",
        evidence: text.match(/(?:Evidence|Beleg): (.*)$/)?.[1] ?? "",
      });
    }
  }
  return items.map(({ point, owner, evidence }) => {
    const m = owner.match(/^P([1-3])\b\s*(\d{4}-\d{2}-\d{2})?[\s,:]*/);
    const actor = owner.slice(m?.[0].length ?? 0);
    const who = /^Benedikt\b/.test(actor)
      ? "me"
      : !actor || AGENT.test(actor)
        ? "agents"
        : "others";
    return { point, actor, evidence, label, prio: m ? +m[1] : 4, due: m?.[2], who } as Work;
  });
});
work.sort((a, b) => a.prio - b.prio || (a.due ?? "9").localeCompare(b.due ?? "9"));
const mine = work.filter((w) => w.who === "me");
const others = work.filter((w) => w.who === "others");
const agents = work.filter((w) => w.who === "agents");

type Open = { row: Row; key: string; path: string; prio: number };
const openRows: Open[] = lists
  .flatMap(({ path, key }) =>
    decisionWindow
      .DECISION_REPOS![key].filter((r) => r.status === "open")
      .map((row) => ({ row, key, path, prio: row.priority as number })),
  )
  .sort((a, b) => a.prio - b.prio || (a.row.order as number) - (b.row.order as number));
const topicOf = (id: string) =>
  topics.find((t) => {
    const r = t.review.row;
    return r && (r.endsWith("*") ? id.startsWith(r.slice(0, -1)) : r === id);
  });

// One row per point: a tick (stored in this browser), the point, who acts and the deadline;
// a click opens the recommendation and options, or the owner and evidence.
const tick = (k: string) =>
  `<label class="tick" title="besprochen"><input type="checkbox" data-key="${htmlEscape("done:" + k.slice(0, 80))}"></label>`;
const slot = (who: string, due?: string) =>
  `<span class="slot">${due ? `<span class="due">bis ${dateDe(due)}</span> ` : ""}${htmlEscape(oneLine(who, 28))}</span>`;
const decRow = ({ row, key, path }: Open) => {
  const t = topicOf(row.id);
  const opts = (row.options as { key: string; label: string; detail?: string }[]) ?? [];
  const rec = opts.find((o) => o.key === row.recommended);
  const domId = `${key}:${row.id}`.replace(/[^A-Za-z0-9_-]/g, "_");
  return `<details class="item"><summary>${tick(key + row.id)}<span class="t">${htmlEscape(String(row.title))} <small>${htmlEscape(key)}</small></span>${slot("Du entscheidest")}</summary>
<div class="body">${rec ? `<p class="recline"><span class="tag">Empfehlung</span> <b>${htmlEscape(rec.label)}</b>${rec.detail ? ` · ${htmlEscape(rec.detail)}` : ""}</p>` : ""}<p>${htmlEscape(String(row.context))}</p>${
    opts.length
      ? `<ol class="opts">${opts.map((o) => `<li${o === rec ? ' class="rec"' : ""}><b>${htmlEscape(o.label)}</b>${o.detail ? ` <span class="note">${htmlEscape(o.detail)}</span>` : ""}</li>`).join("")}</ol>`
      : ""
  }<p class="links">${htmlEscape(key)} · <a href="${htmlEscape(listHref(path))}#c-${domId}">antworten</a>${t ? ` · <a href="${htmlEscape(`${t.name}/${t.index ?? ""}`)}">Thema mit Bildern</a>` : ""}</p></div></details>`;
};
const taskRow = (w: Work) => {
  const who =
    w.who === "me"
      ? "Du erledigst"
      : (w.actor.match(/^[^(,;:]+/)?.[0].trim() ?? "").replace(/^Agent /, "");
  return `<details class="item"><summary>${tick(w.label + w.point)}<span class="t">${htmlEscape(oneLine(w.point, 110))} <small>${htmlEscape(w.label)}</small></span>${slot(who, w.due)}</summary>
<div class="body"><p>${htmlEscape(w.point)}</p>${w.actor ? `<p><b>Wer:</b> ${htmlEscape(w.actor)}</p>` : ""}${w.evidence ? `<p class="note"><b>Beleg:</b> ${htmlEscape(w.evidence)}</p>` : ""}<p class="links">${htmlEscape(w.label)}</p></div></details>`;
};
const byPrio = <T extends { prio: number }>(l: T[], render: (x: T) => string) =>
  [1, 2, 3, 4]
    .map((p) => l.filter((x) => x.prio === p))
    .filter((g) => g.length)
    .map(
      (g) =>
        `<h3>${g[0].prio < 4 ? `Priorität ${g[0].prio}` : "Ohne Priorität"} (${g.length})</h3>${g.map(render).join("")}`,
    )
    .join("");
const part = (id: string, title: string, note: string, inner: string) =>
  `<section class="part" id="${id}"><h2>${title} <span class="prog" data-for="${id}"></span></h2>${note ? `<p class="note">${note}</p>` : ""}${inner}</section>`;
const box = (title: string, inner: string) =>
  `<details class="box"><summary>${title}</summary>${inner}</details>`;

const LABEL = { decide: "Entscheidung", use: "hochladen oder nutzen", info: "Information" };
function card(t: (typeof topics)[number]): string {
  const r = t.review;
  const c = r.current ?? {};
  const link = `${t.name}/${t.index ?? ""}`;
  const ask = c.question ?? c.todo ?? "";
  const isDecided = decided(r.row) || !!c.decision;
  const list =
    !isDecided && t.candidates.length
      ? `<ol>${t.candidates
          .map(
            (k) =>
              `<li>${k.recommended ? "<b>Empfehlung:</b> " : ""}${htmlEscape(k.label)}${k.score ? ` <span class="score">${htmlEscape(String(k.score))}</span>` : ""}</li>`,
          )
          .join("")}</ol>`
      : "";
  return `<article data-topic="${htmlEscape(t.name)}" data-title="${htmlEscape(t.title)}" data-question="${htmlEscape(ask)}">
  <a class="thumb" href="${htmlEscape(link)}">${t.thumb ? `<img loading="lazy" src="${htmlEscape(`${t.name}/${t.thumb}`)}" alt="">` : "<span>kein Bild</span>"}</a>
  <div><h3><a href="${htmlEscape(link)}">${htmlEscape(t.title)}</a> <small>${r.status ? LABEL[r.status] : "nicht eingeordnet"}</small></h3>
  ${isDecided ? `<p><b>Entschieden:</b> ${htmlEscape(c.decision ?? "siehe Zeile")}</p>` : c.question ? `<p><b>Frage:</b> ${htmlEscape(c.question)}</p>` : ""}${c.todo ? `<p><b>Zu tun:</b> ${htmlEscape(c.todo)}</p>` : ""}${c.result ? `<p class="note">${htmlEscape(c.result)}</p>` : ""}
  ${list}
  <p class="links">${r.report ? `Bericht: <a href="${htmlEscape(reportHref(r.report))}">${htmlEscape(r.report.split("/").pop()!)}</a> · ` : ""}<label class="seen"><input type="checkbox"> gesehen</label></p>
  <textarea placeholder="Dein Feedback"></textarea></div>
</article>`;
}

const done = topics.filter((t) => decided(t.review.row) || !!t.review.current?.decision);
const info = topics.filter((t) => !done.includes(t) && t.review.status === "info");
const open = topics.filter((t) => !done.includes(t) && !info.includes(t));
const stamp = new Date().toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" });
const assumed = lists
  .map(({ path, key }) => {
    const n = decisionWindow.DECISION_REPOS![key].filter((r) => r.status === "assumed").length;
    return n ? `<a href="${htmlEscape(listHref(path))}">${htmlEscape(key)} ${n}</a>` : "";
  })
  .filter(Boolean);
const p1 = openRows.filter((o) => o.prio === 1);
const firstMine = mine.filter((w) => w.prio === 1 || w.due);
const first = [
  ...firstMine.filter((w) => w.due).map(taskRow),
  ...p1.map(decRow),
  ...firstMine.filter((w) => !w.due).map(taskRow),
];

writeFileSync(
  join(root, "index.html"),
  `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>Offene Punkte</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
/* Brand tokens of @hackersandwizards/brand, inlined because this page installs no package; each names its token.
   Sizes are the expert layer's UI steps. */
:root{--color-bg:#f7f9fa;--color-white:#ffffff;--color-ink:#19283a;--color-muted:#545861;--color-border:#d0d2d8;--color-tint:#eef1f4;--color-teal:#1a7285;--color-purple:#9333ea;
--gradient-magic:linear-gradient(135deg,#1a7285 0%,#9333ea 100%);--radius-sm:5px;--radius-brand:20px 5px;--radius-pill:9999px;
--text-page:1.5rem;--text-heading:1.25rem;--text-subheading:1rem;--text-ui:.875rem;--text-micro:.75rem}
body{font:var(--text-subheading)/1.5 Inter,system-ui,sans-serif;color:var(--color-ink);background:var(--color-bg);margin:0}
main{max-width:1040px;margin:0 auto;padding:0 24px 64px;overflow-wrap:anywhere}
header{position:sticky;top:0;background:var(--color-bg);border-top:3px solid;border-image:var(--gradient-magic) 1;padding:16px 0 12px;display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:space-between;z-index:1}
h1,h2,h3,summary{font-family:"JetBrains Mono",ui-monospace,monospace;font-weight:600;margin:0}
h1{font-size:var(--text-page)}h2,.box>summary{font-size:var(--text-heading);margin:32px 0 12px;color:var(--color-teal);cursor:pointer}h3{font-size:var(--text-subheading);margin:16px 0 8px}
small{color:var(--color-muted);font-weight:400;font-size:var(--text-micro);margin-left:6px}
.jump{flex-basis:100%;display:flex;gap:18px;font:500 var(--text-ui) "JetBrains Mono",monospace;overflow-x:auto;white-space:nowrap}.jump a{text-decoration:none}.jump small{margin-left:4px}
section.part,details.item{scroll-margin-top:120px}.prog{font-size:var(--text-ui);color:var(--color-muted);font-weight:400}
details.item{background:var(--color-white);border:1px solid var(--color-border);border-radius:var(--radius-sm);margin-bottom:6px}
details.item>summary{display:flex;gap:10px;align-items:baseline;list-style:none;font:500 var(--text-subheading)/1.4 Inter,system-ui,sans-serif;padding:8px 12px;cursor:pointer}
details.item>summary::-webkit-details-marker{display:none}
details.item>summary .t{flex:1}
details.item>summary .t::before{content:"";display:inline-block;border-left:7px solid var(--color-teal);border-top:5px solid transparent;border-bottom:5px solid transparent;margin-right:10px;vertical-align:1px;transition:transform .15s}
details.item[open]>summary .t::before{transform:rotate(90deg)}
details.item.done>summary .t{color:var(--color-muted);text-decoration:line-through}
.slot{font-size:var(--text-micro);color:var(--color-muted);white-space:nowrap;text-align:right}
.due{font:600 var(--text-micro) "JetBrains Mono",monospace;color:var(--color-purple)}
.tick input{margin:0;accent-color:var(--color-teal)}
details.item .body{padding:0 12px 12px;font-size:var(--text-ui)}
.recline{background:var(--color-tint);border-radius:var(--radius-sm);padding:8px 10px}
.opts{padding-left:22px}.opts li{margin:4px 0}.opts .rec b{color:var(--color-teal)}
.tag{font-size:var(--text-micro);background:var(--color-teal);color:var(--color-white);padding:1px 8px;border-radius:var(--radius-pill)}
article{display:grid;grid-template-columns:140px minmax(0,1fr);gap:16px;background:var(--color-white);border:1px solid var(--color-border);border-radius:var(--radius-brand);padding:14px;margin-bottom:10px}
.thumb img{width:140px;max-height:110px;object-fit:contain;background:var(--color-tint);border-radius:var(--radius-brand)}
.thumb span{display:block;width:140px;padding:40px 0;text-align:center;background:var(--color-tint);color:var(--color-muted);border-radius:var(--radius-brand);font-size:var(--text-ui)}
article h3{margin:0}article h3 a{color:inherit;text-decoration:none}
p{margin:6px 0}ol{margin:6px 0;padding-left:22px}.links{font-size:var(--text-ui);color:var(--color-muted)}a{color:var(--color-teal)}
.seen{white-space:nowrap}
.score{font-family:"JetBrains Mono",monospace;font-size:var(--text-micro);background:var(--color-tint);padding:1px 6px;border-radius:var(--radius-pill)}
textarea{width:100%;box-sizing:border-box;min-height:44px;margin-top:6px;font:inherit;font-size:var(--text-ui);border:1px solid var(--color-border);border-radius:var(--radius-sm);padding:8px}
button{font:600 var(--text-ui) "JetBrains Mono",monospace;background:var(--color-teal);color:var(--color-white);border:0;border-radius:var(--radius-sm);padding:10px 14px;cursor:pointer}
.note{color:var(--color-muted);font-size:var(--text-ui)}
@media (max-width:640px){main{padding:0 14px 48px}header{position:static}.jump{flex-wrap:wrap;gap:6px 14px}details.item>summary{flex-wrap:wrap}.slot{flex-basis:100%;text-align:left;padding-left:24px}article{grid-template-columns:minmax(0,1fr)}.thumb img{width:100%;max-height:160px}}
</style></head><body><main>
<header><div><h1>Offene Punkte</h1><div class="note">Stand ${htmlEscape(stamp)}. Feedback und Häkchen bleiben in diesem Browser gespeichert.</div></div>
<button id="export">Feedback exportieren</button>
<nav class="jump"><a href="#zuerst">1 Zuerst<small class="prog" data-for="zuerst"></small></a><a href="#entscheiden">2 Entscheiden<small class="prog" data-for="entscheiden"></small></a><a href="#ansehen">3 Ansehen</a><a href="#aufgaben">4 Aufgaben<small class="prog" data-for="aufgaben"></small></a><a href="#andere">5 Andere<small class="prog" data-for="andere"></small></a><a href="#agenten">6 Agenten<small class="prog" data-for="agenten"></small></a></nav></header>
${part("zuerst", "1 Zuerst: braucht dich", "Entscheidungen und Aufgaben mit Priorität 1, Fristen oben. Ein Klick öffnet Empfehlung und Optionen; das Häkchen links markiert, was ihr besprochen habt.", first.join(""))}
${part(
  "entscheiden",
  "2 Weitere Entscheidungen",
  "",
  byPrio(
    openRows.filter((o) => o.prio !== 1),
    decRow,
  ),
)}
${part("ansehen", "3 Themen zum Ansehen", "", `<div id="open">${open.map(card).join("\n")}</div>`)}
${part(
  "aufgaben",
  "4 Deine weiteren Aufgaben",
  "",
  byPrio(
    mine.filter((w) => !firstMine.includes(w)),
    taskRow,
  ),
)}
${part("andere", "5 Wartet auf andere", "Menschen außerhalb dieser Session und andere Sessions; nachfragen, wenn es hängt.", byPrio(others, taskRow))}
<section class="part" id="agenten">${box(`6 Agenten in dieser Session (${agents.length})`, byPrio(agents, taskRow))}</section>
${assumed.length ? box(`Annahmen zum Prüfen (${rows.filter((r) => r.status === "assumed").length})`, `<p class="note">Was Agenten selbst entschieden haben und du kippen kannst, je Entscheidungsliste: ${assumed.join(" · ")}</p>`) : ""}
${done.length ? box(`Entschieden (${done.length})`, `<div id="decided">${done.map(card).join("\n")}</div>`) : ""}
${info.length ? box(`Zur Information (${info.length})`, `<div id="info">${info.map(card).join("\n")}</div>`) : ""}
<details class="box"><summary>Gesehen (<span id="seen-n"></span>)</summary><div id="seen"></div></details>
<article data-topic="_allgemein" data-title="Allgemein" data-question=""><span></span><div><h3>Allgemeines Feedback</h3><textarea placeholder="Was für alle Themen gilt"></textarea></div></article>
<p class="note">Ältere Stände liegen in <a href="_archiv/">_archiv</a>. „gesehen“ verschiebt ein Thema nach „Gesehen“, die Dateien bleiben. „Feedback exportieren“ lädt jedes ausgefüllte Feld als eine Markdown-Datei.</p>
</main>
<script>
const key = (t) => "stand-entscheidungen:" + t;
const seenBox = document.getElementById("seen");
const counts = () => (document.getElementById("seen-n").textContent = seenBox.querySelectorAll("article").length);
for (const a of document.querySelectorAll("article")) {
  const ta = a.querySelector("textarea");
  ta.value = localStorage.getItem(key(a.dataset.topic)) || "";
  ta.addEventListener("input", () => localStorage.setItem(key(a.dataset.topic), ta.value));
  const box = a.querySelector(".seen input");
  if (!box) continue;
  const home = a.parentElement;
  const place = () => (box.checked ? seenBox : home).append(a);
  box.checked = localStorage.getItem(key("seen:" + a.dataset.topic)) === "1";
  place();
  box.addEventListener("change", () => {
    localStorage.setItem(key("seen:" + a.dataset.topic), box.checked ? "1" : "0");
    place();
    counts();
  });
}
counts();
function prog() {
  for (const s of document.querySelectorAll(".prog")) {
    const part = document.getElementById(s.dataset.for);
    const all = part.querySelectorAll(".tick input").length;
    const n = part.querySelectorAll(".tick input:checked").length;
    if (all) s.textContent = s.closest(".jump") ? n + "/" + all : n + " / " + all + " besprochen";
  }
}
for (const c of document.querySelectorAll(".tick input")) {
  const item = c.closest("details");
  c.checked = localStorage.getItem(key(c.dataset.key)) === "1";
  item.classList.toggle("done", c.checked);
  c.addEventListener("click", (e) => e.stopPropagation());
  c.addEventListener("change", () => {
    localStorage.setItem(key(c.dataset.key), c.checked ? "1" : "0");
    item.classList.toggle("done", c.checked);
    prog();
  });
}
prog();
document.getElementById("export").addEventListener("click", () => {
  const now = new Date();
  const parts = ["# Feedback zu stand-entscheidungen, " + now.toLocaleString("de-DE"), ""];
  const seen = [];
  for (const a of document.querySelectorAll("article")) {
    if (a.querySelector(".seen input:checked")) seen.push(a.dataset.topic);
    const text = a.querySelector("textarea").value.trim();
    if (!text) continue;
    parts.push("## " + a.dataset.title + " (" + a.dataset.topic + ")", "");
    if (a.dataset.question) parts.push("Frage: " + a.dataset.question, "");
    parts.push(text, "");
  }
  if (seen.length) parts.push("## Gesehen", "", seen.join(", "), "");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([parts.join("\\n")], { type: "text/markdown" }));
  link.download = "feedback-" + now.toLocaleDateString("sv-SE") + ".md";
  link.click();
});
</script></body></html>
`,
);
console.log(
  `${join(root, "index.html")}: ${openRows.length} open decisions, ${open.length} topics to review; work ${mine.length} for Benedikt, ${others.length} others, ${agents.length} agents`,
);
