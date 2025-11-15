# Prompt Defenders Examples

Quick copy/paste prompts to demo the scanner during security reviews:

- **injection_simple.txt** – Canonical override attack that asks to ignore previous instructions and leak the system prompt.
- **injection_complex.txt** – Multi-step jailbreak mixing developer-mode activation with SQLi-like payloads.
- **benign_prompt.txt** – Safe business request you can use to show a clean, low-risk scan.

Run a scan:

```bash
npx prompt-defender scan examples/injection_simple.txt --rules basic
```

Pipe from stdin:

```bash
cat examples/benign_prompt.txt | promptdefenders scan -
```
