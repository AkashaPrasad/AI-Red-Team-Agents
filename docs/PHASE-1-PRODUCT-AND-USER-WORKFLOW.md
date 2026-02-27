# PHASE 1 — Product & User Workflow

---

## 1. End-to-End User Workflow

The platform guides users through a linear, security-oriented lifecycle. Each step depends on the previous one.

### Step 1: Setup Model Provider

- User navigates to **Settings → Model Providers**
- Clicks **"Add Provider"** and selects a supported provider (OpenAI, Azure OpenAI, etc.)
- Enters credentials:
  - **OpenAI**: API Key only
  - **Azure OpenAI**: API Key + Endpoint URL (includes deployment name and API version)
- The platform validates the key and stores it encrypted at rest
- **Why first**: The model provider powers both adversarial test generation and the LLM-as-a-Judge evaluation engine — nothing works without it

### Step 2: Create Project

- User clicks **"Create Project"** from the dashboard
- Fills in:
  - **Name** — descriptive, business-focused (e.g. "Customer Support Chatbot")
  - **Description** — brief overview of the AI's purpose (max 255 chars)
  - **Business Scope** — free-text block describing what the AI does, who uses it, and its operating context
  - **Allowed Intents** — list of things the AI *should* be able to do
  - **Restricted Intents** — list of things the AI *must never* do
- User clicks **"Analyze"** — the platform processes, deduplicates, and structures the scope into a clean list
- User reviews the refined scope and clicks **"Create Project"**
- **Result**: A container is created that holds all experiments, firewall config, analytics, and scope rules for that AI system

### Step 3: Create Experiment

- From within a Project, user navigates to the **Experiments** tab
- Clicks **"Create Experiment"** and configures:
  - **Basic Info**: Name, description, language, model provider
  - **Experiment Type** (one of):
    - **Adversarial Testing**: OWASP LLM Top 10, OWASP Agentic, Adaptive (multi-turn)
    - **Behavioural QA**: User interaction, functional, edge case testing
  - **Turn Type**: Single-turn (one prompt/response) or Multi-turn (full conversation)
  - **Testing Level**:
    - Quick (~500 tests, 5–15 min)
    - Thorough (~1,200 tests, 15–30 min)
    - Comprehensive (~2,000+ tests, 30–60 min)
  - **Integration Config**: API endpoint URL, headers, payload format, auth, optional streaming toggle
  - For multi-turn: separate thread initialization endpoint
- Clicks **"Create Experiment"** to launch
- **Pipeline**: Initialize → Generate Tests → Execute Against Target AI → Evaluate with LLM-as-Judge → Compile Report

### Step 4: View Results

- User returns to the Experiments list, finds the completed experiment (status: "Finished")
- **Overview Dashboard** shows:
  - **Total Performance Index (TPI)**: 0–100 composite score
  - **Reliability Score**: statistical confidence (90%+ = high)
  - **Fail Impact**: severity assessment of failures
  - **Pass Rate**: percentage of correctly handled tests (color-coded: green ≥95%, blue 85–94%, orange 70–84%, red <70%)
  - **Error Rate**: percentage of technical failures
  - **Results by Category**: breakdown by risk category, risk level, failed count, OWASP mapping
  - **AI-Powered Insights**: AI-generated analysis with severity assessment and pattern recognition
- **Logs Tab** provides:
  - Filtering by result (Pass/Fail/Error), risk category, data strategy
  - "Representatives Only" toggle to focus on ~50–100 key samples out of thousands
  - Click-to-expand detail pane per test: ID, timestamps, result badge, severity, risk category, AI explanation, full conversation flow

### Step 5: Provide Feedback

- Human-in-the-loop review improves the LLM-as-a-Judge over time
- **Quick Confirmation (Thumbs Up)**: one-click to confirm correct evaluation
- **Detailed Correction (Thumbs Down)**: opens modal to:
  - Change result (e.g. "Should be marked as Pass", "Should be High Severity")
  - Add comment (max 150 chars) with specific context
- **Efficient workflow**: Use "Representatives Only" filter → review ~50–100 samples → feedback scales to broader set
- Target: 80%+ feedback coverage on representative samples

### Step 6: Next Steps (Iterative Cycle)

- **Immediate**: Review failed tests (high severity first) → implement fixes → re-run experiments to verify
- **Ongoing**: Run experiments weekly or after major changes to the target AI
- **Advanced**: Enable the AI Firewall for real-time production protection

### Step 7: Firewall Usage (Production Protection)

- From the Project, access the **Firewall** settings page
- Obtain: API endpoint (`/firewall/{project-id}`), API key
- Integrate into application code — the firewall sits between user input and the target AI
- **Request flow**: User Request → Firewall Evaluation (LLM-as-Judge, same engine as experiments) → Verdict → Your Application
- **Verdict structure**:
  - `status: true` → safe, proceed to AI
  - `status: false` + `fail_category`:
    - `"off_topic"` — outside defined scope (low risk)
    - `"violation"` — violates allowed intents (medium risk)
    - `"restriction"` — attempts restricted action (high risk)
  - `CannotDecide` — uncertain; developer decides handling strategy
- **Key principle**: The firewall provides *verdicts*, not automatic blocking — the developer controls the response strategy
- Optional: pass `agent_prompt` for multi-turn context awareness

---

## 2. Core Product Concepts

### What is a Project?

- The **foundational organizational unit** — a container representing one AI application or system
- Holds: business scope definition, allowed/restricted intents, experiments, firewall config, analytics, logs
- Analogy: A project is to this platform what a "repository" is to GitHub — it groups everything about one AI system in one place
- Scope analysis (AI-powered) deduplicates and structures the user's free-text input into clean, testable rules

### What is an Experiment?

- A **structured test run** against a target AI system, analogous to a penetration test in cybersecurity
- Each experiment: generates contextual test prompts → sends them to the target AI → evaluates responses via LLM-as-Judge → produces a scored report
- Experiments are scoped to a Project and inherit its business scope, allowed intents, and restricted intents
- Can be re-run iteratively to measure improvement after fixes

### What is AI Assurance?

- The **umbrella discipline** covering the entire AI security lifecycle:
  - **Pre-production**: Adversarial testing + Behavioural QA (experiments)
  - **Production**: AI Firewall (real-time evaluation)
  - **Post-production**: Log analysis, trend tracking, risk scoring
  - **Continuous improvement**: Feedback loops, policy management, compliance tracking
- Goes beyond "test once and ship" — it's an ongoing practice

### What is Adversarial Testing?

- **Security-focused testing** that simulates real-world attacks against the target AI
- Generates contextual attacks *tailored to the project's business scope* (not generic)
- Tests against frameworks: OWASP LLM Top 10, OWASP Agentic threats
- Supports adaptive multi-turn attacks that build on previous responses
- Process: Context Analysis → Attack Generation → Execution → LLM-as-Judge Evaluation → Vulnerability Report
- Output: Risk-scored vulnerabilities with remediation guidance

### What is Behavioural Testing?

- **Quality-assurance-focused testing** that validates the AI behaves correctly from a *user's perspective*
- Categories:
  - **User Interaction**: Happy path, edge cases, error handling, accessibility
  - **Functional**: Core functionality, integrations, performance, scalability
  - **Behavioural Alignment**: Policy compliance, scope validation, ethical behavior, cultural sensitivity
- Not about finding exploits — about ensuring the AI does what the business intends it to do

### What is the Firewall?

- A **real-time evaluation gateway** that sits in front of the target AI in production
- Uses the same LLM-as-Judge technology used in experiments, applied per-request at runtime
- Provides verdicts with categories (off_topic, violation, restriction) and explanations
- Does **not** automatically block — gives the developer a verdict and lets them decide the response
- Leverages the Project's scope/intents configuration to make decisions
- Handles uncertainty explicitly (`CannotDecide` exception)

---

## 3. System Boundaries

### What the Platform Does (v1 Scope — IN)

- **Model Provider Management**: CRUD for API keys and endpoints (OpenAI, Azure OpenAI); encrypted storage; validation
- **Project Management**: Create/edit/delete projects with business scope, allowed intents, restricted intents; AI-powered scope analysis and deduplication
- **Experiment Execution**:
  - Adversarial experiments (OWASP LLM Top 10, OWASP Agentic, Adaptive multi-turn)
  - Behavioural QA experiments (user interaction, functional, edge case)
  - Single-turn and multi-turn conversation modes
  - Three testing levels (Quick / Thorough / Comprehensive)
  - Integration with target AI via configurable HTTP endpoints (URL, headers, payload, auth)
- **Test Pipeline**: Automated prompt generation (using PyRIT + custom templates) → execution against target → LLM-as-Judge evaluation → scored results
- **Results & Analytics**: TPI score, pass/fail/error rates, risk category breakdown, OWASP mapping, AI-generated insights, per-test detail with full conversation logs
- **Human Feedback**: Thumbs up/down on individual test results, severity adjustment, comments; representative sampling for efficient review
- **AI Firewall**: Real-time request evaluation endpoint per project; verdict API (safe/off_topic/violation/restriction/undecided); Python and JS SDK examples
- **Deployment Options**: Self-hosted (Docker Compose for v1); designed for future SaaS and private cloud
- **Security Baseline**: Encrypted secrets at rest, RBAC (admin/user roles), audit logging, input validation, rate limiting

### What the Platform Does NOT Do (v1 Scope — OUT)

- **Does NOT host or serve the target AI** — it only tests/evaluates external AI systems via their APIs
- **Does NOT provide automatic blocking** — the firewall returns verdicts; the integrator's code decides the response
- **Does NOT train or fine-tune models** — it evaluates existing models, it does not modify them
- **Does NOT support non-LLM AI systems** — v1 is scoped to text-based LLM applications only (no image/audio/video)
- **Does NOT include a public SaaS multi-tenant deployment** — v1 is single-tenant, self-hosted
- **Does NOT include SSO/SAML/OIDC** — v1 uses local auth (email/password + JWT); enterprise SSO is v2
- **Does NOT include CI/CD pipeline integration** — no GitHub Actions, no automated re-testing on deploy; manual only in v1
- **Does NOT include MCP Server integration** — documented in aiandme.io but out of scope for v1
- **Does NOT include billing, usage metering, or subscription management**
- **Does NOT include real-time WebSocket streaming of experiment progress** — v1 uses polling; WebSocket is v2
- **Does NOT include custom plugin/extension architecture** — experiment types are built-in, not user-extensible in v1
- **Does NOT include PDF/export report generation** — results are viewed in-app only in v1

---

*This document defines the functional and conceptual foundation for all subsequent phases. No database, API, or UI design is included.*
