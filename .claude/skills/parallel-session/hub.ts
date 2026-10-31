// Builds the review hub index.html from its topic folders (default ~/Downloads/stand-entscheidungen).
// Per folder: the <title> of its index.html (one level down if needed) and review.json, of which
// only `current` reaches the page. A topic with `current.decision`, or whose `row` is `decided` in
// any given repo's docs/tracking/decisions/items.js, lands under "Decided". A topic ticked
// "reviewed" moves to a collapsed section at the bottom. Folders starting with "_" or "." are
// skipped. The index also lists every open GOAL.md (else TODO.md) row per repo. Usage:
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

const LABEL = { decide: "decision", use: "upload or use", info: "information" };

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
              `<li>${k.recommended ? "<b>Recommended:</b> " : ""}${htmlEscape(k.label)}${k.score ? ` <span class="score">${htmlEscape(String(k.score))}</span>` : ""}</li>`,
          )
          .join("")}</ol>`
      : "";
  return `<article data-topic="${htmlEscape(t.name)}" data-title="${htmlEscape(t.title)}" data-question="${htmlEscape(ask)}">
  <a class="thumb" href="${htmlEscape(link)}">${t.thumb ? `<img loading="lazy" src="${htmlEscape(`${t.name}/${t.thumb}`)}" alt="">` : "<span>no image</span>"}</a>
  <div><h3>${htmlEscape(t.title)} <small>${r.status ? LABEL[r.status] : "new, not classified"}</small>${isDecided ? ' <span class="badge">decided</span>' : ""}</h3>
  ${isDecided ? `<p><b>Decided:</b> ${htmlEscape(c.decision ?? "see the row")}</p>` : c.question ? `<p><b>Question:</b> ${htmlEscape(c.question)}</p>` : ""}${c.todo ? `<p><b>To do:</b> ${htmlEscape(c.todo)}</p>` : ""}${c.result ? `<p>${htmlEscape(c.result)}</p>` : ""}
  ${list}
  <p class="links"><a href="${htmlEscape(link)}">Open topic</a>${r.report ? ` · Report: <a href="${htmlEscape(reportHref(r.report))}">${htmlEscape(r.report)}</a>` : ""}${r.row ? ` · Row <code>${htmlEscape(r.row)}</code>` : ""}
  <label class="seen"><input type="checkbox"> reviewed</label></p>
  <textarea placeholder="Your feedback"></textarea></div>
</article>`;
}

const decisionListItem = ({ path, key }: { path: string; key: string }) => {
  const l = decisionWindow.DECISION_REPOS![key];
  const n = (st: string) => l.filter((r) => r.status === st).length;
  const href = "file://" + join(path, ".claude/skills/parallel-session/decisions.html");
  return `<li><a href="${htmlEscape(href)}">${htmlEscape(key)}</a>: ${n("open")} open, ${n("assumed")} assumptions</li>`;
};
const urgent = lists.flatMap(({ key }) =>
  decisionWindow
    .DECISION_REPOS![key].filter((r) => r.status === "open" && r.priority === 1)
    .map((row) => ({ key, row })),
);
// Open work: the rows under each repo's GOAL.md (else TODO.md) "##" sections, minus the goal and
// done-means ones. A row is a table line (Punkt | Owner | Beleg), a top-level "- " bullet whose
// owner and evidence follow "Owner:" and "Evidence:"/"Beleg:", or an unticked "- [ ]".
const oneLine = (s: string, n = 140) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, t.lastIndexOf(" ", n - 1)) + " …" : t;
};
const work = repos.flatMap((r) => {
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
  return items.map((i) => ({ ...i, label, file }));
});
const workSection = () => {
  if (!work.length) return "";
  const byRepo = [...new Set(work.map((w) => w.label))].map((label) => {
    const rows = work.filter((w) => w.label === label);
    return `<h3>${htmlEscape(label)} (${rows.length}) <small><a href="${htmlEscape("file://" + rows[0].file)}">${htmlEscape(rows[0].file.split("/").pop()!)}</a></small></h3>\n<table>${rows
      .map(
        (w) =>
          `<tr><td>${htmlEscape(oneLine(w.point))}</td><td>${htmlEscape(oneLine(w.owner, 60) || "–")}</td><td class="note">${htmlEscape(oneLine(w.evidence) || "–")}</td></tr>`,
      )
      .join("")}</table>`;
  });
  const assumed = lists.map(({ path, key }) => {
    const n = decisionWindow.DECISION_REPOS![key].filter((r) => r.status === "assumed").length;
    const href = "file://" + join(path, ".claude/skills/parallel-session/decisions.html");
    return `<a href="${htmlEscape(href)}">${htmlEscape(key)} ${n}</a>`;
  });
  return `<h2>Später zu tun (${work.length})</h2>
<p class="note">Every open row of each repo's GOAL.md (personal site: TODO.md): point, owner, evidence.</p>
${byRepo.join("\n")}
${assumed.length ? `<p><b>Annahmen</b> to veto: ${assumed.join(" · ")}</p>` : ""}`;
};
const done = topics.filter((t) => decided(t.review.row) || !!t.review.current?.decision);
const info = topics.filter((t) => !done.includes(t) && t.review.status === "info");
const open = topics.filter((t) => !done.includes(t) && !info.includes(t));
const stamp = new Date().toLocaleString("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

writeFileSync(
  join(root, "index.html"),
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Decision review</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font:16px/1.5 Inter,system-ui,sans-serif;color:#19283A;background:#F7F9FA;margin:0}
main{max-width:1040px;margin:0 auto;padding:0 24px 64px}
header{position:sticky;top:0;background:#F7F9FA;border-top:3px solid;border-image:linear-gradient(90deg,#1A7285,#9333EA) 1;padding:16px 0 12px;display:flex;gap:16px;align-items:center;justify-content:space-between;z-index:1}
h1,h2,h3,summary{font-family:"JetBrains Mono",ui-monospace,monospace;font-weight:600;margin:0}
h1{font-size:22px}h2,summary{font-size:17px;margin:32px 0 12px;color:#1A7285;cursor:pointer}h3{font-size:15px}
small{color:#545861;font-weight:400;font-size:12px;margin-left:6px}
article{display:grid;grid-template-columns:200px 1fr;gap:20px;background:#fff;border:1px solid #D0D2D8;border-radius:16px 4px;padding:16px;margin-bottom:12px}
.thumb img{width:200px;max-height:150px;object-fit:contain;background:#EEF1F4;border-radius:4px}
.thumb span{display:block;width:200px;padding:60px 0;text-align:center;background:#EEF1F4;color:#545861}
p{margin:6px 0}ol{margin:6px 0;padding-left:22px}.links{font-size:14px;color:#545861}a{color:#1A7285}
.seen{margin-left:12px;white-space:nowrap}
.score{font-family:"JetBrains Mono",monospace;font-size:13px;background:#EEF1F4;padding:1px 6px;border-radius:4px}
textarea{width:100%;box-sizing:border-box;min-height:56px;margin-top:8px;font:inherit;border:1px solid #D0D2D8;border-radius:4px;padding:8px}
button{font:600 14px "JetBrains Mono",monospace;background:#1A7285;color:#fff;border:0;border-radius:4px;padding:10px 14px;cursor:pointer}
table{width:100%;border-collapse:collapse;background:#fff;font-size:14px;margin-bottom:12px}td{border-top:1px solid #D0D2D8;padding:6px 8px;vertical-align:top}td:nth-child(2){width:18%}td:nth-child(3){width:34%}
.note{color:#545861;font-size:14px}.badge{font-size:12px;background:#1A7285;color:#fff;padding:1px 8px;border-radius:4px}#count{color:#9333EA}
</style></head><body><main>
<header><div><h1>Decision review: <span id="count"></span> open</h1><div class="note">Built ${htmlEscape(stamp)}. Newest first. Feedback and ticks stay saved in this browser.</div></div>
<button id="export">Export feedback</button></header>
<p class="note">"reviewed" replaces deleting: the tick moves the topic to the bottom and the files stay. "Export feedback" downloads every field with text as one Markdown file.</p>
<article data-topic="_allgemein" data-title="General" data-question=""><span></span><div><h3>General</h3><textarea placeholder="What applies to every topic"></textarea></div></article>
${lists.length ? `<h2>Decision lists</h2>\n<ul>${lists.map(decisionListItem).join("")}</ul>${urgent.length ? `<h3>Open with priority 1</h3>\n<ol>${urgent.map((u) => `<li>${htmlEscape(u.key)}: ${htmlEscape(String(u.row.title))}</li>`).join("")}</ol>` : ""}` : ""}
${workSection()}
<h2>Open</h2>
<section id="open">${open.map(card).join("\n")}</section>
${done.length ? `<h2>Decided</h2>\n<section id="decided">${done.map(card).join("\n")}</section>` : ""}
${info.length ? `<h2>For information</h2>\n<section id="info">${info.map(card).join("\n")}</section>` : ""}
<details><summary>Reviewed (<span class="n"></span>)</summary><section id="seen"></section></details>
<p class="note">Superseded states are in <a href="_archiv/">_archiv</a>.</p>
</main>
<script>
const key = (t) => "stand-entscheidungen:" + t;
const seenBox = document.getElementById("seen");
function counts() {
  document.getElementById("count").textContent = document.querySelectorAll("#open article").length;
  for (const d of document.querySelectorAll("details")) d.querySelector(".n").textContent = d.querySelectorAll("article").length;
}
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
document.getElementById("export").addEventListener("click", () => {
  const now = new Date();
  const parts = ["# Feedback on stand-entscheidungen, " + now.toLocaleString("en-GB"), ""];
  const seen = [];
  for (const a of document.querySelectorAll("article")) {
    if (a.querySelector(".seen input:checked")) seen.push(a.dataset.topic);
    const text = a.querySelector("textarea").value.trim();
    if (!text) continue;
    parts.push("## " + a.dataset.title + " (" + a.dataset.topic + ")", "");
    if (a.dataset.question) parts.push("Question: " + a.dataset.question, "");
    parts.push(text, "");
  }
  if (seen.length) parts.push("## Reviewed", "", seen.join(", "), "");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([parts.join("\\n")], { type: "text/markdown" }));
  link.download = "feedback-" + now.toLocaleDateString("sv-SE") + ".md";
  link.click();
});
</script></body></html>
`,
);
console.log(
  `${join(root, "index.html")}: ${open.length} open, ${info.length} info, ${done.length} decided`,
);
