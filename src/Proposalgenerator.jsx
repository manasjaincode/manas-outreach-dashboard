import { useState, useRef } from "react";

const COLORS = {
  paper: "#FCFAF6",
  surface: "#F7F1E6",
  card: "#FFFFFF",
  border: "#E9DFC9",
  borderHover: "#C08A2E",
  ink: "#221D14",
  inkSoft: "#5B5342",
  inkMuted: "#9A9078",
  gold: "#B9862E",
  goldDim: "#B9862E1A",
  rose: "#D85C6E",
  roseDim: "#D85C6E17",
  teal: "#2C7A72",
  tealDim: "#2C7A7217",
  red: "#C4415A",
  redDim: "#C4415A15",
};

const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');`;

// The engine. Everything the proposal "feels like" lives here, not in the UI.
const SYSTEM_PROMPT = `You are an elite freelance closer — the ghostwriter top 1% Upwork/Freelancer earners quietly pay to write their proposals. You don't sound like an assistant. You sound like someone who has already solved this exact problem for someone else and is deciding, calmly, whether this client is worth the next hour of your week.

You will receive:
1. A COMPANY PROFILE as JSON — real services, past projects, tech stack, results, testimonials, USPs, pricing style.
2. A JOB POST — the client's actual listing.

Write ONE ready-to-paste proposal that wins the job. Follow this exact psychological arc — it is the core of the job, not a suggestion:

1. PROOF OF READING (1 line). Reference their specific problem or goal in your own words — not their title reworded. This is the line that separates you from the 40 template pitches they'll ignore in the first three seconds.

2. THE MIRROR (1-2 lines). Before you sell anything, say back to them — in plain, human language — what it's actually costing them to leave this unsolved (time bleeding out, revenue left on the table, trust with their own users/customers eroding, their week eaten by something that shouldn't be their problem anymore). This has to feel like you've stood exactly where they're standing, not like a diagnosis from a stranger. This is the line that builds togetherness: you're not describing their problem from the outside, you're stepping inside it with them.

3. THE TURN — "here's how this stops being your problem" (2-3 lines). Shift from their pain to your solve using ONE concrete proof point pulled directly from the JSON — a similar project, a measurable result, a recognizable stack or client. Specificity beats claims, always. Frame it collaboratively: not "I will build X for you" (vendor framing) but "here's how we get this shipped / off your plate / live" (partner framing). The client should feel like they just gained a second brain on their team, not that they're being sold to.

4. QUIET AUTHORITY, NO BEGGING (0-1 lines, optional, only if it earns its place). One line that shows you've done this exact thing before and know the shape of it — never "I'd love the opportunity" or "I am confident I can." State it like a fact, not a hope.

5. HONEST MOMENTUM (0-1 lines, optional). If genuinely true from context — approach clarity, a fast first step, current availability — let a sense of "I could start moving on this immediately" come through. Never fabricate urgency, never claim fake scarcity, never lie about availability.

6. THE CLOSE (1 line). One sharp, specific, easy-to-answer question about THEIR project — not "let's hop on a call," not "let me know if interested." The question itself should prove you're already thinking about their build, and make saying yes feel like the natural next sentence, not a decision.

Rules that are not optional:
- Never invent facts not in the JSON. If the JSON is thin, lean harder on what IS there rather than padding with generic claims.
- Match tone/register to the job post — formal client gets polished, casual client gets conversational (light emoji only if the job post itself uses them).
- 120-180 words for the proposal body. Every sentence earns its place — no "I am a hard worker," no "Dear Sir/Madam," no stacked em-dashes, no filler.
- Write in first person as the freelancer/agency in the JSON.
- The togetherness feeling is the difference between a proposal that gets archived and one that gets replied to in ten minutes. If you're not sure a line builds that feeling, cut it.

OUTPUT FORMAT — follow exactly, no deviation, no preamble, no markdown fences:

PROPOSAL:
<the proposal text only, ready to paste, 120-180 words>
---
ANGLES: <2-4 short tags, comma-separated, each 2-4 words, naming the specific psychological levers you actually used in THIS proposal — e.g. "mirrored their cost", "proof over claims", "partner framing", "quiet authority", "low-friction close". Tags must be true to what you actually wrote, not a generic list.>
WHY: <one sentence, for the freelancer's own learning, naming which single lever you leaned on hardest and why it fit this specific job post>`;

export default function ProposalGenerator() {
  const [companyJson, setCompanyJson] = useState(null);
  const [jsonError, setJsonError] = useState(null);
  const [fileName, setFileName] = useState("");
  const [jobPrompt, setJobPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { body, angles: [], why }
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      try {
        const parsed = JSON.parse(text);
        setCompanyJson(parsed);
        setJsonError(null);
      } catch {
        setCompanyJson(null);
        setJsonError("Ye valid JSON nahi lag raha — file check karo.");
      }
    };
    reader.readAsText(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const clearFile = () => {
    setCompanyJson(null);
    setJsonError(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const parseResult = (raw) => {
    // Expects: PROPOSAL:\n...\n---\nANGLES: a, b, c\nWHY: sentence
    const proposalMatch = raw.match(/PROPOSAL:\s*([\s\S]*?)\n---/i);
    const anglesMatch = raw.match(/ANGLES:\s*(.*)/i);
    const whyMatch = raw.match(/WHY:\s*(.*)/i);

    const body = proposalMatch ? proposalMatch[1].trim() : raw.split(/\n---\n/)[0].trim();
    const angles = anglesMatch
      ? anglesMatch[1].split(",").map((t) => t.trim()).filter(Boolean)
      : [];
    const why = whyMatch ? whyMatch[1].trim() : "";
    return { body, angles, why };
  };

  const generate = async () => {
    if (!companyJson) return setError("Pehle company ka JSON upload karo.");
    if (!jobPrompt.trim()) return setError("Job post / prompt paste karo.");
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: `COMPANY PROFILE (JSON):\n${JSON.stringify(companyJson, null, 2)}\n\nJOB POST:\n${jobPrompt}\n\nWrite the winning proposal now.`,
            },
          ],
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "API error");

      const text = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();

      if (!text) throw new Error("Khaali response mila — dobara try karo.");
      setResult(parseResult(text));
    } catch (e) {
      setError(e.message || "Kuch gadbad ho gayi.");
    } finally {
      setLoading(false);
    }
  };

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const label = {
    fontSize: 11, color: COLORS.inkMuted, letterSpacing: "0.08em", textTransform: "uppercase",
    marginBottom: 10, display: "block", fontWeight: 600, fontFamily: "'Inter', sans-serif",
  };
  const textareaStyle = {
    width: "100%", padding: "14px 15px", background: COLORS.paper, border: `1px solid ${COLORS.border}`,
    borderRadius: 8, color: COLORS.ink, fontSize: 13.5, fontFamily: "'Inter', sans-serif", outline: "none",
    resize: "vertical", lineHeight: 1.65,
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.paper, fontFamily: "'Inter', system-ui, sans-serif", color: COLORS.ink, padding: "40px 24px" }}>
      <style>{FONT_IMPORT}</style>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <HandshakeMark />
          <h1 style={{
            fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, margin: 0,
            letterSpacing: "-0.3px", color: COLORS.ink,
          }}>
            The Closer's Desk
          </h1>
        </div>
        <p style={{ fontSize: 13, color: COLORS.inkSoft, margin: "0 0 30px 50px", lineHeight: 1.6 }}>
          Company profile daalo, job post paste karo — proposal aisa jo padhte hi lage "yeh banda already mere side pe hai."
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>

          {/* Company JSON upload */}
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "20px 22px" }}>
            <label style={label}>1 · Company profile (JSON)</label>

            {!companyJson && !jsonError && (
              <div
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `1.5px dashed ${dragActive ? COLORS.borderHover : COLORS.border}`, borderRadius: 8,
                  padding: "30px 16px", textAlign: "center", cursor: "pointer",
                  background: dragActive ? COLORS.goldDim : "transparent",
                  transition: "border-color 0.15s ease, background 0.15s ease",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 10, color: COLORS.gold }}>⇪</div>
                <div style={{ fontSize: 12.5, color: COLORS.inkSoft }}>Click ya drag-drop karo — .json file</div>
                <input ref={fileInputRef} type="file" accept=".json,application/json" style={{ display: "none" }}
                  onChange={(e) => handleFile(e.target.files?.[0])} />
              </div>
            )}

            {jsonError && (
              <div style={{ padding: "14px 16px", background: COLORS.redDim, border: `1px solid ${COLORS.red}44`, borderRadius: 8 }}>
                <div style={{ fontSize: 12.5, color: COLORS.red, marginBottom: 8 }}>{jsonError}</div>
                <button onClick={clearFile} style={{ fontSize: 12, color: COLORS.red, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline", fontFamily: "inherit" }}>Dusri file try karo</button>
              </div>
            )}

            {companyJson && (
              <div style={{ padding: "14px 16px", background: COLORS.tealDim, border: `1px solid ${COLORS.teal}44`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: COLORS.teal, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>✓ {fileName || "Loaded"}</div>
                  <div style={{ fontSize: 11, color: COLORS.inkMuted, marginTop: 2 }}>{Object.keys(companyJson).length} top-level fields mile</div>
                </div>
                <button onClick={clearFile} style={{ fontSize: 12, color: COLORS.inkSoft, background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "4px 10px", cursor: "pointer", flexShrink: 0, fontFamily: "inherit" }}>Change</button>
              </div>
            )}
          </div>

          {/* Job prompt */}
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "20px 22px" }}>
            <label style={label}>2 · Job post / prompt</label>
            <textarea
              value={jobPrompt}
              onChange={(e) => setJobPrompt(e.target.value)}
              placeholder="Client ka Upwork job description yahan paste karo..."
              style={{ ...textareaStyle, minHeight: 148 }}
            />
          </div>
        </div>

        {/* Generate button */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}>
          <button
            onClick={generate}
            disabled={loading}
            style={{
              padding: "13px 38px", background: COLORS.ink, border: "none", borderRadius: 8,
              color: COLORS.paper, fontSize: 14, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Inter', sans-serif", opacity: loading ? 0.7 : 1,
              boxShadow: `0 6px 20px ${COLORS.ink}22`, transition: "transform 0.12s ease",
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
          >
            {loading ? "◈ Likh raha hai..." : "Write the proposal that gets a reply"}
          </button>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: COLORS.redDim, border: `1px solid ${COLORS.red}44`, borderRadius: 8, marginBottom: 20, fontSize: 12.5, color: COLORS.red, textAlign: "center" }}>
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "13px 22px", borderBottom: `1px solid ${COLORS.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: COLORS.surface }}>
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: 15, fontWeight: 600, color: COLORS.ink }}>Your proposal</span>
              <button onClick={copyResult} style={{
                fontSize: 12, fontWeight: 600, color: copied ? COLORS.teal : COLORS.gold,
                background: copied ? COLORS.tealDim : COLORS.goldDim, border: "none", borderRadius: 6,
                padding: "5px 13px", cursor: "pointer", fontFamily: "inherit",
              }}>
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>

            <div style={{ padding: "24px 24px 18px", fontSize: 14, lineHeight: 1.8, whiteSpace: "pre-wrap", color: COLORS.ink }}>
              {result.body}
            </div>

            {result.angles.length > 0 && (
              <div style={{ padding: "0 24px 18px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 10.5, color: COLORS.inkMuted, letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, marginRight: 2 }}>
                  Angles used
                </span>
                {result.angles.map((angle, i) => (
                  <span key={i} style={{
                    fontSize: 11.5, color: COLORS.rose, background: COLORS.roseDim,
                    border: `1px solid ${COLORS.rose}33`, borderRadius: 999, padding: "4px 11px",
                    fontFamily: "'Inter', sans-serif", fontWeight: 600,
                  }}>
                    {angle}
                  </span>
                ))}
              </div>
            )}

            {result.why && (
              <div style={{ padding: "14px 24px 20px", borderTop: `1px solid ${COLORS.border}`, background: COLORS.surface }}>
                <span style={{ fontSize: 10.5, color: COLORS.inkMuted, letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 700 }}>
                  Why it lands —{" "}
                </span>
                <span style={{ fontSize: 12.5, color: COLORS.inkSoft, lineHeight: 1.6 }}>{result.why}</span>
              </div>
            )}
          </div>
        )}

        {!result && !loading && (
          <div style={{ textAlign: "center", padding: "44px 20px", color: COLORS.inkMuted }}>
            <p style={{ fontSize: 12.5 }}>JSON upload karo, job post paste karo, aur likhwao.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Signature mark: two overlapping rings — the freelancer and the client, meeting in the middle.
// Stands in for "togetherness" instead of a generic sparkle/star icon.
function HandshakeMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="15" cy="18" r="11" fill="#B9862E" fillOpacity="0.85" />
      <circle cx="23" cy="18" r="11" fill="#D85C6E" fillOpacity="0.85" style={{ mixBlendMode: "multiply" }} />
    </svg>
  );
}