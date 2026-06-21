# Product Requirements Document — PantryPilot *(working name)*

| | |
|---|---|
| **Version** | 0.1 (Draft) |
| **Status** | For review |
| **Owner** | Shyam |
| **Date** | 16 June 2026 |
| **Target market** | India-first, architected to scale globally |

---

## 1. One-line summary

A pantry-aware nutrition app that turns grocery **receipts into a live inventory**, watches that inventory deplete as you cook, automatically **rebuilds your shopping list**, and uses what you actually eat to coach you toward healthier, higher-protein meals — built on a **multi-agent backend**.

---

## 2. The problem

People already track *one* of three things — what they buy, what they cook, or what nutrition they get — but never the loop between them. Manual nutrition apps fail because logging every meal by hand is tedious and gets abandoned in two weeks. Pantry/grocery apps fail because keeping inventory accurate by hand is even worse. Nobody connects "I bought 1 kg of paneer" to "I ate 150 g of it tonight" to "I'm now low and should rebuy" to "my protein this week is fine but fibre is low."

PantryPilot closes that loop by inferring most of the data from artifacts users already produce: the bill they get at checkout and the photo they'd take of their food anyway.

**Why now:** multimodal models are finally good enough to read messy receipts and recognise dishes, and quick-commerce (Blinkit, Zepto, Instamart, BigBasket) makes an auto-generated shopping list immediately actionable.

---

## 3. Target users

**Primary — the "health-conscious home cook" (Riya, 29, Bengaluru).** Cooks most dinners, wants enough protein, hates manual logging, orders groceries online weekly, and forgets what's running low until she's mid-recipe.

**Secondary — the household manager (Arun, 41).** Buys for a family of four, cares about budget and food waste more than macros, wants a shopping list that just *appears*.

**Tertiary — the goal-driven tracker (Meghna, 24).** Actively cutting or bulking, will tolerate more manual input for accuracy, wants real macro tracking and meal suggestions.

The design tension between these three is **effort vs. accuracy**. The product must work passively for Riya and Arun, while letting Meghna opt into precision.

---

## 4. Goals & success metrics

**North Star metric:** *Meals logged per active user per week* — because everything downstream (inventory accuracy, shopping lists, nutrition insight) depends on the meal-logging habit surviving.

| Metric | Target (6 mo post-launch) |
|---|---|
| Receipt-scan success rate (items correctly extracted) | ≥ 90% line items, ≥ 80% fully resolved to a food entity |
| Meal logs / active user / week | ≥ 5 |
| Shopping-list items accepted without edit | ≥ 70% |
| D30 retention | ≥ 25% |
| Self-reported "list saved me a trip / catch" | ≥ 60% in survey |

---

## 5. Core concept & product principles

The product is a **two-sided inventory ledger**: receipts are *inflows*, meals are *outflows*, and the running balance drives everything else.

1. **Effort-minimal by default, precision-optional.** The happy path is photograph-and-confirm, not type-everything. Power users can drill in.
2. **Inventory will drift — design for reconciliation, not perfection.** Snacking, eating out, spoilage and spills mean the ledger is always an estimate. The product earns trust through periodic, low-friction "pantry checks" rather than pretending to be exact.
3. **Confidence is a first-class citizen.** Every inferred quantity carries a confidence score; low-confidence items get a one-tap confirmation instead of silently corrupting the inventory.
4. **Healthy, not extreme.** Nutrition coaching nudges toward balance (adequate protein, fibre, variety). It explicitly avoids crash-diet mechanics, aggressive calorie restriction, or anything that reads as disordered-eating encouragement, and it is framed as wellness guidance, not medical advice.
5. **Privacy by design.** Receipts and food photos are personal data; the app is built to India's DPDP Act from day one (see §13).

---

## 6. The hard problem (read this before estimating anything)

The most magical-sounding feature — *"photograph a cooked dish and we'll figure out how much of each grocery it used"* — is also the least reliable, and the PRD treats it accordingly.

That single feature is really **four** stacked inference steps, each compounding error:

1. **Dish identification** from the photo (e.g. "this is dal tadka").
2. **Recipe decomposition** — what raw ingredients and roughly how much go into that dish.
3. **Portion / volume estimation** — how many servings are in the photo (monocular volume estimation is genuinely unreliable without a size reference).
4. **Back-calculation** to raw grocery quantities, then deduction from inventory.

Multiply the error of four steps and "auto-deduction from a photo alone" is not trustworthy enough to silently mutate someone's pantry. **So the reliable mechanic is different:**

- **Inflows (receipts + barcodes):** high accuracy, this is the dependable backbone.
- **Outflows (cooking):** the user confirms a **recipe + serving count** at cook time (often pre-filled from the photo and from what's in the pantry). The photo *assists and pre-fills*; it does not act unsupervised until confidence is proven.
- **Truth-up:** a periodic **pantry reconciliation** ("Quick check — how much rice is left? Lots / Some / Almost out") corrects drift.

The fully passive "photo-only auto-deduct" is a **Phase 3** goal gated on measured accuracy, never an MVP promise. Selling it as MVP magic is the fastest way to lose user trust.

---

## 7. Key user journeys

**Onboarding.** Pick goals (maintain / more protein / lose / gain / just track pantry & waste), dietary profile (veg / non-veg / Jain / eggetarian / allergies / diabetic-friendly), household size. Scan first receipt → instant populated pantry → "aha" moment.

**Receipt capture.** Snap or upload a bill (or forward an email/PDF invoice from BigBasket/Blinkit). The system extracts line items, normalises cryptic names ("AMUL TST BTR 500G" → *Amul Toast Butter, 500 g*) and units, shows a review screen, user taps to fix the few it got wrong. Inventory updates.

**Meal logging.** Snap the cooked dish (or pick from "what can I make with what I have"). App proposes a dish + recipe + serving estimate. User confirms servings (and who ate). Inventory deducts; nutrition logs automatically.

**Shopping list.** List builds continuously as items deplete or near expiry, ranked by "needed soon." One tap to export, or hand off to a quick-commerce cart (Phase 2 integration).

**Nutrition view.** Weekly macro/micro dashboard, protein progress, gaps ("fibre low 4 days running"), and meal suggestions that *also* use up what's in the pantry and what's about to expire.

---

## 8. Functional requirements

Prioritised with MoSCoW (**M**ust / **S**hould / **C**ould / **W**on't-yet).

### 8.1 Receipt & inflow ingestion
- **FR-R1 (M)** Capture receipt via camera, gallery upload, or PDF/email invoice import.
- **FR-R2 (M)** Extract line items, quantities, units, prices via OCR + LLM parsing.
- **FR-R3 (M)** Resolve each raw line to a canonical food/product entity; normalise units (kg/g/L/ml/pcs).
- **FR-R4 (M)** Human review/correction screen before committing to inventory.
- **FR-R5 (S)** Barcode scan for packaged goods → Open Food Facts lookup (more reliable than OCR for packaged SKUs).
- **FR-R6 (C)** Learn user-specific abbreviations from past corrections.

### 8.2 Pantry / inventory
- **FR-I1 (M)** Maintain per-item running quantity with unit.
- **FR-I2 (M)** Apply inflows (receipts) and outflows (meals) as a ledger with full history.
- **FR-I3 (S)** Expiry / shelf-life estimation per item; spoilage alerts.
- **FR-I4 (S)** Periodic reconciliation prompts to correct drift.
- **FR-I5 (C)** Multiple storage locations (fridge / freezer / pantry).
- **FR-I6 (C)** Shared household pantry across multiple user accounts.

### 8.3 Meal logging & dish decomposition
- **FR-M1 (M)** Log a meal by photo, by recipe pick, or manually.
- **FR-M2 (M)** Propose dish + recipe + servings from a photo (assistive, confirm-before-deduct).
- **FR-M3 (M)** Deduct estimated raw ingredients from inventory with confidence scores.
- **FR-M4 (S)** Save user recipes; reuse for fast repeat logging.
- **FR-M5 (S)** Split a dish across multiple eaters / partial portions / leftovers.
- **FR-M6 (C)** Voice/text logging ("made dal and 4 rotis for three people").

### 8.4 Nutrition engine
- **FR-N1 (M)** Compute calories + macros (protein, carbs, fat) per meal and per day.
- **FR-N2 (S)** Track key micros (fibre, iron, calcium) and flag gaps.
- **FR-N3 (M)** Goal tracking with healthy, non-extreme targets and clear "not medical advice" framing.
- **FR-N4 (S)** Weekly trends and insights.

### 8.5 Shopping list
- **FR-S1 (M)** Auto-generate list from depleted / soon-to-expire / below-threshold items.
- **FR-S2 (S)** Predict run-out dates from consumption velocity.
- **FR-S3 (S)** Manual add/remove; recurring staples.
- **FR-S4 (C)** Export to / deep-link into quick-commerce carts; price comparison.
- **FR-S5 (C)** Budget view from receipt spend history.

### 8.6 Recommendations & coaching
- **FR-C1 (S)** "Cook with what I have" recipe suggestions, prioritising expiring items.
- **FR-C2 (S)** Meal suggestions to hit nutrition gaps (e.g. higher-protein options).
- **FR-C3 (C)** Weekly meal plan generation tied to goals + pantry + budget.

---

## 9. Recommended additional features (your "recommend me more")

Ordered by impact-to-effort, in my view:

1. **Food-waste reduction as a headline value prop.** Expiry tracking + "use it before it spoils" recipe nudges. This resonates with budget-minded households (Arun) far more than macros do, and it's a strong differentiator and marketing hook (rupees and kilos saved).
2. **Barcode scanning** for packaged goods — cheap to build, dramatically more accurate than receipt OCR for branded SKUs, and it makes the pantry feel precise.
3. **"What can I cook right now"** from current inventory — the single most delightful recurring feature; pulls users back in daily.
4. **Quick-commerce handoff** (Blinkit / Zepto / Instamart / BigBasket cart deep-links). Turns the shopping list from a note into a one-tap reorder.
5. **Household / family sharing** of one pantry — essential for the secondary persona; also a viral growth loop (one family member invites the others).
6. **Budget & spend analytics** derived for free from receipts already being scanned.
7. **Health-app integration** (Apple Health / Google Fit / Health Connect) so calories-in meets activity/calories-out.
8. **Conversational logging** ("I made khichdi for two") via the same agent stack — lowers logging friction further.
9. **Gamification** — streaks, "zero-waste week," protein-goal streaks — to protect the North Star (logging habit).
10. **Diet/sustainability scoring** (e.g. estimated dietary carbon footprint) — niche but distinctive and increasingly relevant.
11. **Festival / seasonal modes** (India): bulk-buy patterns, fasting-day diets — culturally specific and sticky.

I'd consciously **defer** restaurant/eating-out tracking and deep micronutrient lab-grade accuracy — both are high-effort and dilute the core loop.

---

## 10. Data model (core entities)

- **User / Household** — profile, dietary preferences, goals, members.
- **Receipt** — image ref, merchant, date, raw OCR text, parse status.
- **InventoryItem** — canonical food entity, quantity, unit, location, expiry, confidence.
- **FoodEntity** — canonical item with nutrition per 100 g/ml, density, typical units, barcode(s). Sourced from IFCT 2017 (India), USDA FoodData Central (global), Open Food Facts (packaged/barcode).
- **Recipe** — ingredient list with quantities per serving (curated + user + LLM-generated).
- **MealLog** — dish, recipe ref, servings, eaters, photo ref, computed nutrition, deducted items.
- **LedgerEntry** — append-only inflow/outflow record (audit trail; enables reconciliation and "why is my rice low?").
- **ShoppingListItem** — food entity, suggested qty, reason, status.

A canonical **FoodEntity** layer that everything resolves into is the make-or-break piece — get this right and receipts, recipes, nutrition and shopping all line up. `pgvector` embeddings on food names enable fuzzy resolution of messy receipt strings to entities.

---

## 11. Agentic architecture (the tech approach you asked for)

You can read "build with agents" two ways and both apply here. **(a) Runtime:** the product's intelligence is a coordinated set of specialised AI agents. **(b) Build process:** the codebase is developed largely via coding agents (Claude Code et al.). The PRD specifies (a); (b) is a delivery choice you can adopt freely on top.

### 11.1 Agent roster

| Agent | Job | Input → Output | Confidence / HITL |
|---|---|---|---|
| **Orchestrator** | Routes requests, sequences agents, assembles results | user action → plan | — |
| **Receipt Parser** | OCR + extract line items, qty, unit, price | image/PDF → structured lines | flags low-OCR lines |
| **Item Resolver** | Map raw strings → FoodEntity, normalise units | lines → entities | confirm-screen for low match |
| **Vision/Dish** | Identify dish + estimate portions/servings | photo → dish + servings est. | always confirm pre-deduct |
| **Recipe Decomposition** | Dish → ingredient list w/ quantities | dish + servings → raw qty | uses curated recipes first |
| **Nutrition** | Compute macros/micros, evaluate vs goals | meal → nutrition + insight | — |
| **Inventory** | Apply inflows/outflows, expiry, reconciliation | events → ledger + balances | — |
| **Shopping List** | Predict depletion, build/rank list | balances + velocity → list | — |
| **Coach / Recommender** | Pantry-aware recipes, gap-filling meals, plans | pantry + goals → suggestions | — |

### 11.2 Orchestration & flow

Treat each agent invocation as an **async job on a queue** (Redis + a worker queue such as BullMQ), with **idempotency keys** so a re-submitted receipt or retried photo never double-counts the ledger — exactly the distributed-systems hygiene this kind of pipeline needs. Long-running multimodal jobs stream progress to the UI over **SSE** ("reading receipt… resolving 12 items… done"). A framework like **LangGraph** (or CrewAI) gives you typed state and explicit agent hand-offs; a thin custom orchestrator is also viable if you want tighter control.

### 11.3 Models & cost posture

The expensive, hard work is **vision** (dish recognition, portion estimation) and **receipt OCR**. A tiered strategy keeps spend sane:

- **Self-hosted / open where it's good enough:** OCR via PaddleOCR; text parsing, item resolution, recipe decomposition and coaching via local LLMs (Ollama-hosted) — aligning with a low-spend posture.
- **Cloud multimodal for the hard cases:** route only genuinely ambiguous dish photos to a strong vision model (Claude / GPT-4o / Gemini) as a fallback, not the default. A confidence threshold decides escalation.
- Cache aggressively (a given barcode, dish, or receipt merchant format only needs solving once).

### 11.4 Stack (recommended, not mandated)

- **Mobile app:** React Native (or Flutter) for one codebase across iOS/Android.
- **Web:** Next.js, sharing the design system and API.
- **Backend:** Python + FastAPI (best fit for the AI/agent layer); async workers for the agent pipeline.
- **Data:** PostgreSQL (relational core + append-only ledger) with `pgvector` (food matching/semantic search); Redis (queues/cache); object storage (S3-compatible) for images.
- **Realtime:** SSE for job-progress streaming; WebSockets only if/when shared-household live updates need it.
- **Multi-tenant** isolation from day one if you intend B2B (e.g. wellness/insurer partners) later.

---

## 12. Non-functional requirements

- **Performance:** receipt-to-reviewable-inventory in < 15 s typical; meal-photo suggestion in < 8 s.
- **Offline-tolerant:** capture receipts/photos offline, process when connected.
- **Accuracy transparency:** show confidence; never silently mutate inventory on low confidence.
- **Cost ceiling:** per-active-user AI cost target set explicitly (tiered model strategy above).
- **Accessibility & localisation:** Indian English + key regional languages on the roadmap; metric units default.

---

## 13. Privacy & compliance

Food photos, receipts, dietary and health goals are personal — and some (health goals, allergies) edge toward sensitive — data.

- **DPDP Act, 2023 (India):** explicit consent for each processing purpose, purpose limitation, data-minimisation, user rights (access/erasure), and consent for any model-training use of user images. Receipts/photos are never required to be retained longer than needed.
- **EU AI Act:** the nutrition coaching is a **limited-risk** system → transparency obligations (users know they're getting AI guidance, clear "not medical advice" disclosure). Avoid anything that could be construed as a medical device.
- **ISO/IEC 42001:** align the AI management system (model governance, evaluation, human oversight of the confidence/HITL gates) if you want enterprise/partner credibility.
- **Practical controls:** image retention policy + easy delete; on-device or in-region processing where feasible; audit trail on the inventory ledger (also a product feature, not just compliance).

---

## 14. Phased roadmap

**Phase 0 — MVP (the reliable loop).** Receipt scan → reviewed inventory → manual/recipe-based meal logging with confirm-before-deduct → auto shopping list → basic calories + protein. *Photo is "snap to attach + pre-fill," not auto-deduct.* Proves the core loop works and retains.

**Phase 1 — Habit & accuracy.** Barcode scanning, expiry/waste alerts, "cook with what I have," full macro/micro dashboard, reconciliation prompts, household sharing.

**Phase 2 — Reach & convenience.** Quick-commerce list handoff, budget analytics, health-app integration, conversational logging, meal planning.

**Phase 3 — The magic.** Photo-only dish auto-deduction *once measured accuracy clears a trust bar*, predictive restocking, sustainability scoring.

---

## 15. Risks & open questions

**Risks**
- **Dish/portion accuracy** undermines trust → mitigated by confirm-before-deduct + confidence + reconciliation (§6).
- **Receipt variety** (kirana handwritten bills, thermal prints, app invoices) is huge → start with high-volume formats (DMart, Reliance, BigBasket, Blinkit) and learn.
- **Logging-habit decay** is the existential risk for any nutrition app → North Star, gamification, and ruthless friction reduction directly target it.
- **Cost blowout** from cloud vision → tiered/cached model strategy with a hard per-user ceiling.

**Open questions for you**
1. Primary market confirmation — India-first as assumed, or global from the start?
2. Monetisation — freemium (free pantry + paid nutrition coaching/family/integrations), affiliate on quick-commerce handoff, or B2B (wellness/insurer/corporate)? This shapes scope.
3. Is the food-waste angle a co-headline with nutrition, or secondary?
4. Build-with-coding-agents — do you want the delivery plan to assume an agent-driven dev workflow, with that reflected in repo/structure conventions?
5. How precise must the pantry actually be to be useful — "roughly right and waste-aware" (easier) vs "gram-accurate" (much harder)?

---

## 16. Glossary

- **Inflow / Outflow** — items entering (receipts) vs leaving (meals) the pantry ledger.
- **FoodEntity** — the canonical record everything resolves to; carries nutrition + units.
- **HITL** — human-in-the-loop; a confirmation step before a low-confidence action commits.
- **Reconciliation** — periodic user correction of inventory drift.
- **IFCT / USDA FDC / Open Food Facts** — nutrition data sources (Indian / global / packaged-barcode).
