// Vercel serverless function: turns reports and suggested clues into GitHub issues.
// Needs a GITHUB_TOKEN environment variable in Vercel (fine-grained, Issues: Read and write).
const REPO = "shllomo/meduyakli";
const KINDS = ["פתרון שגוי", "רמז בעייתי", "אחר"];
const clip = (s, n) => String(s || "").slice(0, n).trim();

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "method" }); return; }
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  if (b.website) { res.status(200).json({ ok: true }); return; } // honeypot field: bots fill it, people don't

  const token = process.env.GITHUB_TOKEN;
  if (!token) { res.status(500).json({ error: "config" }); return; }

  let title, body, labels;
  if (b.type === "report") {
    const kind = KINDS.includes(b.kind) ? b.kind : "אחר";
    title = `[דיווח] ${kind}: ${clip(b.answer, 40)}`;
    body = `**סוג:** ${kind}\n**מזהה:** ${clip(b.clueId, 80)}\n**הגדרה:** ${clip(b.clue, 300)}\n**תשובה:** ${clip(b.answer, 60)}\n\n${clip(b.text, 2000) || "(בלי פירוט)"}`;
    labels = ["דיווח"];
  } else if (b.type === "submission") {
    const clue = clip(b.clue, 300), answer = clip(b.answer, 60);
    if (!clue || !answer) { res.status(400).json({ error: "missing" }); return; }
    title = `[חידה] ${answer}`;
    body = `**הגדרה:** ${clue}\n**פתרון:** ${answer}\n\n**הסבר:**\n${clip(b.explanation, 2000) || "(בלי הסבר)"}`;
    labels = ["חידה חדשה"];
  } else { res.status(400).json({ error: "type" }); return; }

  const r = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "meduyakli" },
    body: JSON.stringify({ title, body, labels }),
  });
  if (!r.ok) { res.status(502).json({ error: "github", status: r.status }); return; }
  res.status(200).json({ ok: true });
};
