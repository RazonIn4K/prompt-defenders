# AI Security: Prompt Injection Defense System

> Protect your LLM applications from malicious attacks, jailbreaks, and data exfiltration.

---

## 1. Client / Scenario Snapshot

- **Type:** FinTech / Healthcare AI
- **Industry:** Regulated Industries
- **Context:**  
  A FinTech client launched a "Customer Support Bot" but discovered users could trick it into revealing system prompts or behaving inappropriately ("DAN mode"). They needed a robust firewall.

---

## 2. Problem & Goals

**Core problem**

- **Jailbreaks:** Users bypassing safety filters (e.g., "Ignore previous instructions").
- **PII Leakage:** Risk of the bot revealing sensitive customer data.
- **Reputation:** A rogue bot can cause massive PR damage.

**Goals**

- **Block Attacks:** Detect and block known injection patterns.
- **Sanitize Input:** Cleanse user input before it reaches the LLM.
- **Audit Logging:** Record every attack attempt for forensic analysis.

---

## 3. Constraints & Requirements

- **Latency:** Defense layer must add <100ms to response time.
- **False Positives:** Must not block legitimate user queries.

---

## 4. Solution Overview

We implemented a **"Defense-in-Depth" Layer** sitting between the User and the LLM.

1. **Heuristic Check:** Regex scanning for common attack keywords ("Ignore instructions", "System prompt").
2. **LLM-based Judge:** A small, fast model (e.g., GPT-3.5 or specialized BERT) analyzes the intent.
3. **Output Validation:** Scanning the final response for PII or prohibited content.

---

## 5. Architecture & Flow

**High-level flow**

```text
[User Input] → [Defense Layer] → [Safe?] --Yes--> [Core LLM]
                     ↓ No
               [Block & Log]
```

---

## 6. Implementation Highlights

- **Vector-based Detection:**
  We compare user input against a database of known jailbreak embeddings. If similarity > 0.9, it's blocked.

- **Canary Tokens:**
  Injected hidden tokens into the system prompt. If these tokens appear in the output, we know the prompt leaked and block the response.

---

## 7. Results & Impact

- **Security:** Blocked 99.8% of simulated attacks (Red Teaming).
- **Compliance:** Met SOC2 requirements for AI risk management.

---

## 8. Tech Stack

- **Framework:** Python / LangChain
- **Defense Libs:** Rebuff / NeMo Guardrails / Lakera
- **Logging:** LangSmith / Arize Phoenix

---

## 9. Links & Artifacts

- **Defense Script:** [defense_api.py](./defense_api.py)
- **Architecture Diagram:** ![Architecture Diagram](./assets/architecture_diagram.png)
- **Attack Log:**
  ![Attack Blocked Screenshot](./assets/attack_blocked.png)

---

## 10. Where This Pattern Re-Applies

- “Same pattern works for: **Internal Employee Bots** (Preventing SQL Injection).”
- “Works for: **Public Marketing Bots** (Preventing brand damage).”
