# OIOS Project Master Context

This document provides a comprehensive overview of the OIOS Project, its brand alignment, system architecture, database structure, APIs, user journey, and core development rules. It is designed to give AI assistants (such as Claude, ChatGPT, and others) a deep context of the codebase and project structure before assisting with coding, code reviews, or architectural planning.

---

## 1. What is OIOS?
* **Internal Operating System:** OIOS (Organizational Intelligence Operating System) is an internal management and analysis platform built to support consulting operations.
* **Usage:** It is used exclusively by internal consultants/operators (not by external clients) to manage client data, map business findings, structure project deliverables, and plan technical implementations.
* **Core Value:** OIOS supports the AI strategy, discovery phase, implementation planning, and project structuring workflows by translating qualitative intake data into actionable design concepts and traceability matrices.

---

## 2. What is PRAGMA AI SYSTEMS?
* **Public-Facing Brand:** **PRAGMA AI SYSTEMS** is the public brand and service surface that clients interact with. 
* **Visibility:**
  * Clients only see the public **PRAGMA AI SYSTEMS** website and its onboarding tools.
  * Clients **never** see or access OIOS Studio, which remains completely hidden and secured.
* **Lead Generation and Discovery:** The public-facing website hosts onboarding workflows designed to capture initial lead information, which will later lead to automated, chatbot-driven discovery sessions.

---

## 3. Current Architecture Overview
The project is built as a **hybrid, single-server web application** with clear separation between its public and authenticated admin areas.
* **Backend:** Node.js with the Express framework (`server.js`).
* **Database Layer:** Dual-mode persistence.
  * **PostgreSQL:** Used in production (identified via the `DATABASE_URL` environment variable).
  * **Local DB Fallback (`db.json`):** Used during local development if no database URL is set.
* **Hybrid Layout/Surfaces:**
  * **Public Surface:** Served out of the `/public` directory (contains landing pages, onboarding forms, and public css/assets).
  * **Studio Surface:** Served out of the `/studio` directory. This is a protected Single Page Application (SPA) utilizing modular JavaScript clients.
  * **Shared Data Layer:** Backend models and JSON schemas mapped to Postgres tables or local JSON objects (Companies, Notes, Insights, System Ideas, Projects, Reports, Next Actions, Logs).

---

## 4. Route Map

### Public Routes
These pages and endpoints are publicly accessible and do not require user authentication.
* `/` — The main landing page for PRAGMA AI SYSTEMS.
* `/onboarding` — The multi-step client onboarding intake form.
* `/discovery` — Redirects (302) directly to `/onboarding`.
* `/login.html` — The login page for OIOS Studio.
* `/api/login` — Endpoint to verify the administrator password and issue a `session_token` cookie.
* `/api/logout` — Endpoint to clear the `session_token` cookie.

### Internal (Protected) Routes
These pages require a valid `session_token` cookie (SHA-256 hashed password with salt). Unauthenticated requests are redirected back to `/login.html` or returned as a 401 Unauthorized response.
* `/studio` — Serves the main entry point (`studio/index.html`) for OIOS Studio.
* `/studio/*` — Internal Single Page Application (SPA) sub-routes resolved on the client side.
* `/api/studio/*` — Internal administrative APIs (internally rewritten by middleware to `/api/*` for routing purposes).

---

## 5. API Reference

### Public API Endpoints
* **`POST /api/public/onboarding/start`**
  * **Purpose:** Registers a new client onboarding/lead session.
  * **Payload:** `{ name, industry, description, website, contactName, contactEmail, companySize, country }`
  * **Behavior:** Creates a new company record in the database with status `"Lead"` and stage `"Discovery"`. It sets a temporary `discovery_token` cookie on the user's browser, permitting them to continue onboarding interactions.
* **`POST /api/public/logs`**
  * **Purpose:** Allows client-side logging from the public surface.
  * **Payload:** `{ level, message, stack, context }`

### Internal API Endpoints (`/api/studio/*` rewritten to `/api/*`)
All endpoints below are protected by authentication checks.
* **`GET /api/studio/state`**
  * Returns the full state of the workspace (all companies, discovery notes, insights, system ideas, projects, reports, and next actions).
* **`POST /api/studio/state/migrate`**
  * Overwrites/migrates the entire database state with the incoming JSON payload.
* **Companies Endpoint (`/api/companies`)**
  * `POST /api/companies` — Create a new company profile.
  * `PUT /api/companies/:id` — Update company profile fields (e.g. status, stage, description, assessment).
  * `DELETE /api/companies/:id` — Delete a company (cascades and deletes notes, insights, projects, and reports associated with this company).
* **Discovery Notes Endpoint (`/api/discoveryNotes`)**
  * `POST`, `PUT`, `DELETE` operations for unstructured information pieces collected during client discovery.
* **Insights Endpoint (`/api/insights`)**
  * `POST`, `PUT`, `DELETE` operations for refined insights derived from discovery notes.
* **System Ideas Endpoint (`/api/systemIdeas`)**
  * `POST`, `PUT`, `DELETE` operations for conceptual solutions linked to specific insights.
* **Projects Endpoint (`/api/projects`)**
  * `POST`, `PUT`, `DELETE` operations for client delivery programs, tracking milestones, execution progress, and activity logs.
* **Reports Endpoint (`/api/reports`)**
  * `POST`, `PUT`, `DELETE` operations for compiled client deliverables, executive summaries, and strategy reports.
* **Next Actions Endpoint (`/api/nextActions`)**
  * `POST`, `PUT`, `DELETE` operations for global task management within OIOS.
* **Logs Endpoints (`/api/logs`)**
  * `GET /api/logs` — Fetches the latest 100 log entries.
  * `DELETE /api/logs` — Clears all system logs.

---

## 6. Client Journey & Lifecycle
1. **Landing:** A prospect arrives at the public **PRAGMA AI SYSTEMS** landing page.
2. **Onboarding:** The prospect initiates onboarding (`/onboarding`) and submits their company profile details.
3. **Lead Creation:** A database record is generated representing the client.
   * `status` is set to `"Lead"`
   * `stage` is set to `"Discovery"`
4. **Interactive Discovery (Future Phase):** The prospect will be guided through a deeper Discovery conversation facilitated by an interactive AI chatbot to capture detailed requirements, bottlenecks, and tech stacks.
5. **Review:** An OIOS consultant logs into OIOS Studio (`/studio`) to review the structured lead information, analyze the findings, extract insights, define system ideas, and model implementation projects.

---

## 7. Conceptual Separations
* **Onboarding vs. Discovery:** Onboarding is the initial intake process (gathering basic contact, company size, and high-level description data). Discovery is the deep-dive context gathering (conversational question-answering, system bottleneck identification, and workflow mapping).
* **AI Chatbot Role:** The future AI chatbot is solely designed to assist the prospect in the *Discovery* phase on the public website. The OIOS Studio is a human-only dashboard for reviewing and managing that intelligence.
* **Internal Methodology:** OIOS is a internal proprietary tool supporting the consultant's structured methodology. It is not offered as a SaaS product.

---

## 8. Future Chatbot & AI Roadmap
* **Conversational Discovery:** A future phase includes integrating an AI chatbot into the public path to conduct the discovery interview.
* **Integration Status:** No OpenAI, Claude, or other LLM APIs have been integrated into the current production server codebase yet.
* **Planning Rule:** Do not add AI SDKs, prompt configurations, or conversational logic to the server without a pre-approved implementation plan.

---

## 9. Current Project Status
* **Hybrid Backend Deployed:** The unified Node/Express server handling both public-facing HTML and the internal API is implemented and deployed.
* **Static Client-Side Isolation:** Public marketing pages and internal OIOS Studio client scripts are separated clean into `/public` and `/studio` folder hierarchies.
* **Public Language:** The public brand (PRAGMA AI SYSTEMS) and the public-facing UI must remain exclusively in English.

---

## 10. Development & Security Rules

> [!IMPORTANT]
> **Strict Isolation of Public and Internal Surfaces**
> * Never expose internal OIOS entities (such as notes, insights, system ideas, or reports) through the public API endpoints (`/api/public/*`).
> * Ensure `/studio` and `/api/studio/*` endpoints are protected by `checkAuth` middleware.

> [!WARNING]
> **Deployment and Branching Control**
> * Do not deploy updates directly to production environments without explicit confirmation.
> * Do not merge features or code changes directly to the `main` branch without explicit approval.

> [!CAUTION]
> **No Unplanned AI Integration**
> * Do not add LLM client code, third-party AI dependencies, or agentic loops into the codebase unless it is part of a specifically requested task.
