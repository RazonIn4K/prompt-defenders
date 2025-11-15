import express from "express";
import { scanInput } from "../../src/lib/scanner";

const app = express();
app.use(express.json());

app.post("/chat", (req, res) => {
  const prompt = String(req.body?.prompt ?? "");
  const scan = scanInput(prompt);
  if (!scan.success) {
    return res.status(500).json({ error: scan.error ?? "scan_failed" });
  }

  if (scan.analysis.score >= 50) {
    return res.status(422).json({
      message: "Prompt blocked by Prompt Defenders",
      advisories: scan.analysis.advisories,
      risk_score: scan.analysis.score,
    });
  }

  const fakeReply = `LLM would respond to: ${prompt}`;
  return res.json({ reply: fakeReply, scan });
});

const port = process.env.PORT ?? 4000;
app.listen(port, () => {
  console.log(`Prompt Defenders demo server running on http://localhost:${port}`);
});
