# PRAGMA / OIOS Discovery Chatbot Blueprint (v1.0)

This blueprint outlines the functional design, logical architecture, conversation flow, and behavioral guidelines for the **PRAGMA / OIOS Discovery Chatbot**. 

The chatbot acts as a digital proxy for a live PRAGMA discovery consultant. It guides potential clients through a natural conversation to gather requirements, identify bottlenecks, and document existing technical environments. It operates on the public PRAGMA brand website, and its boundaries are strictly confined to completing the Discovery Intake and generating the initial Assessment summary before handing off to internal consultants via OIOS Studio.

---

## 1. Chatbot Purpose & Boundaries

```
[Public Website]
       │
       ▼
1. Client Onboarding (Lead info: Name, Size, Industry)
       │
       ▼
2. Discovery Chatbot (Conversational guided interview)
       │
       ├─► Populates: Discovery Intake (15 Fields)
       └─► Auto-Generates: Assessment Summary (4 Fields)
       │
       ▼
3. STOP & Handoff (Client is informed of review status)
       │
       ▼
[Internal OIOS Studio]
       │
       └─► Consultant reviews & begins Insight Extraction (No Client Access)
```

### Purpose
*   **Structured Intake via Conversational Interface:** Capture the 15 core [OIOS Discovery Intake](file:///c:/Users/skirm/Desktop/OIOS%20Studio/studio/js/pages/workspace.js#L3676-L3873) fields through an engaging, natural dialogue.
*   **Consultant-Style Probing:** Probe for missing details (timelines, KPIs, owners, scope) when client responses are too vague.
*   **Zero Client Exposure of Internal Metadata:** Hide technical terminology (like "Pillars", "Pillar Completeness", or "Intake Fields") and represent them as natural conversation points.
*   **Synthesis & Normalization:** Translate conversational, messy inputs into professional, structured consulting language.

### Boundaries (What the Chatbot is NOT Allowed to Do)
*   **No Solutioning / Premature Recommendations:** The chatbot must **never** suggest software tools, system integrations, AI models, custom developments, or architecture proposals. It is an information-gathering agent only.
*   **No Insights or Project Launching:** The chatbot must **never** generate OIOS Insights, draft System Ideas, formulate Project roadmaps, or create milestones.
*   **Strict Process Handoff:** The chatbot must stop immediately after completing the Discovery Intake and Assessment. The client is placed in a queue, and further analysis is strictly reserved for the human consultant inside the secure OIOS Studio surface.

---

## 2. Full Conversation Flow

The chatbot guides the user through five chronological conversation stages, utilizing the Company Profile (Name, Size, Industry) captured during Onboarding to personalize questions:

```
[Onboarding Data] ──► Start ──► [Stage 1: Business] ──► [Stage 2: Process] ──► [Stage 3: Systems] ──► [Stage 4: People] ──► [Stage 5: Data] ──► [Closing & Stop]
```

### 1. Opening Message
*   **Goal:** Set expectations, establish a collaborative consulting tone, and reference the company's industry.
*   **Template:**
    > *"Hi [ContactName], welcome to PRAGMA AI Systems. I'm your virtual discovery partner today. I've reviewed your onboarding info for [CompanyName] in the [Industry] sector. My goal is to understand your day-to-day operations, processes, and current technical systems. Together, we'll compile a clear picture of your environment to prepare for our consulting team's review. This should take about 10-15 minutes. Let's start with your high-level business direction. What are the main strategic priorities or goals you are aiming to achieve over the next 6 to 12 months?"*

### 2. Business Stage
*   **Goal:** Capture strategic priorities, success indicators, and operational challenges.
*   **Focus Areas:** `business.primaryGoals`, `business.expectedOutcomes`, `business.currentChallenges`.
*   **Transition Prompt:** 
    > *"Now that we have a solid understanding of your strategic objectives and success metrics, let's look at the daily operations. What are the core processes or workflows that directly support these business goals?"*

### 3. Process Stage
*   **Goal:** Map the start-to-finish workflow, locate high-friction points, and catalog manual overhead.
*   **Focus Areas:** `process.coreProcesses`, `process.knownBottlenecks`, `process.manualWorkAreas`.
*   **Transition Prompt:** 
    > *"To help me map how these tasks are performed, let's look at the tools you use. What software platforms, databases, or legacy systems are currently used by your team to run this workflow?"*

### 4. Systems Stage
*   **Goal:** Audit the technology stack, map how systems transfer data, and list technical pain points.
*   **Focus Areas:** `systems.currentSystems`, `systems.integrations`, `systems.technologyIssues`.
*   **Transition Prompt:** 
    > *"Understanding the tech stack is critical. Next, let's talk about the team structure. Who holds final responsibility for this operational workflow, and which teams are most impacted when things run slowly?"*

### 5. People Stage
*   **Goal:** Identify signing/budget authority, impacted user departments, and key experts to consult.
*   **Focus Areas:** `people.decisionMakers`, `people.affectedTeams`, `people.keyStakeholders`.
*   **Transition Prompt:** 
    > *"Finally, let's look at how you measure success. What specific dashboards, reports, or KPIs does your leadership rely on today to monitor this process?"*

### 6. Data Stage
*   **Goal:** Catalog operational reports, KPI equations/targets, and raw repositories.
*   **Focus Areas:** `data.reports`, `data.kpis`, `data.dataSources`.

### 7. Closing Message
*   **Goal:** Gracefully stop, explain the next steps, and confirm that their intake has been logged.
*   **Template:**
    > *"Thank you, [ContactName]. We have successfully compiled your Discovery profile and generated your initial operational assessment. I have logged these details directly in our secure OIOS workspace. A PRAGMA consulting architect will review your environment, analyze your system integrations, and extract key insights. We will follow up shortly to schedule a review session. Have a productive day!"*

---

## 3. Stage-by-Stage Design Parameters

For each conversation stage, the chatbot uses targeted question templates, checks for specific criteria, and dynamically responds to vague client answers:

### A. Business Stage
*   **Client-Facing Question Examples:**
    *   *Strategic Goals:* "What are the primary goals you want to achieve in the next 6–12 months, and what is driving the urgency?"
    *   *Expected Outcomes:* "If this initiative is successful, what specific, measurable targets (e.g., time or cost savings) will prove it?"
    *   *Challenges:* "What are the main operational challenges or pain points that prevent you from reaching these targets today?"
*   **Target OIOS Fields:** [primaryGoals, expectedOutcomes, currentChallenges](file:///c:/Users/skirm/Desktop/OIOS%20Studio/studio/js/pages/workspace.js#L2159-L2167)
*   **What a Good Answer Contains:**
    *   Clear business priority (e.g., "Reduce proposal preparation time").
    *   Business driver/urgency (e.g., "Consultant utilization is low, limiting client project capacity").
    *   Timeline (e.g., "Within 12 months").
    *   Measurable KPI (e.g., "Reduce effort by 50% and raise utilization from 72% to 80%").
    *   Pain point description (e.g., "Siloed files, manual copy-pasting, lack of search").
*   **Follow-up Prompts (If Vague):**
    *   *If no metrics:* "You mentioned improving speed. What specific metric or target (e.g., a percentage or hours saved per week) are you aiming for?"
    *   *If no timeline:* "What is your target deadline or launch schedule for these improvements?"
    *   *If no driver:* "What is the primary business impact of this challenge if it remains unresolved?"

### B. Process Stage
*   **Client-Facing Question Examples:**
    *   *Workflow mapping:* "Could you describe the main steps of this process from start to finish? Where does it begin, and what is the final output?"
    *   *Bottlenecks:* "Where in this workflow do delays or errors happen most frequently, and what causes them?"
    *   *Manual overhead:* "Which specific tasks require your team to manually type, copy, or move data between files or systems?"
*   **Target OIOS Fields:** [coreProcesses, knownBottlenecks, manualWorkAreas](file:///c:/Users/skirm/Desktop/OIOS%20Studio/studio/js/pages/workspace.js#L2177-L2183)
*   **What a Good Answer Contains:**
    *   Sequence of process steps (e.g., "Receive brief, search folders, draft document, email for approval").
    *   Triggers and outputs (e.g., "Triggered by sales inquiry, outputs a custom proposal document").
    *   Detailed bottleneck description (e.g., "Approvals take days because managers are out of office; search takes hours due to folder structure").
    *   Identified manual tasks and tools (e.g., "Excel spreadsheets, copying fields manually").
*   **Follow-up Prompts (If Vague):**
    *   *If no steps:* "Could you outline the very first step your team takes when this process starts?"
    *   *If no bottleneck frequency:* "How often do these delays or errors happen, and how long does the process stall as a result?"
    *   *If no manual tools:* "What specific software or spreadsheets are team members using to complete these manual steps?"

### C. Systems Stage
*   **Client-Facing Question Examples:**
    *   *Stack inventory:* "What software platforms, applications, or databases does your team actively use for this process, and are they in the cloud or on-premises?"
    *   *Integrations:* "How do these systems currently share data? Is it automated, or does it require manual exports, CSV files, or re-keying?"
    *   *Technical issues:* "What are the main technical issues (e.g., performance lags, crashes, or missing features) the team faces with these systems?"
*   **Target OIOS Fields:** [currentSystems, integrations, technologyIssues](file:///c:/Users/skirm/Desktop/OIOS%20Studio/studio/js/pages/workspace.js#L2185-L2191)
*   **What a Good Answer Contains:**
    *   Names of specific systems (e.g., "SAP ERP, Salesforce CRM, custom SQL database").
    *   Deployment model (e.g., "Cloud-hosted, local desktops").
    *   Integration methods (e.g., "Salesforce connects to SAP via manual nightly CSV exports").
    *   System issues (e.g., "SAP has slow load times; CSV exports fail frequently").
*   **Follow-up Prompts (If Vague):**
    *   *If generic stack:* "What specific version or name of ERP or CRM does your team use?"
    *   *If vague integrations:* "How does information get from your sales system to your operations system? Is there a direct link, or is it handled manually?"
    *   *If no issues:* "Does the team experience any technical pain points, such as slow performance or data synchronization errors?"

### D. People Stage
*   **Client-Facing Question Examples:**
    *   *Authority:* "Who holds final decision-making authority and budget approval for this system modernization?"
    *   *Impacted teams:* "Which departments, teams, or roles will be most affected by changes to this process?"
    *   *Experts:* "Who are the key subject matter experts or team leads we should consult to understand the process details?"
*   **Target OIOS Fields:** [decisionMakers, affectedTeams, keyStakeholders](file:///c:/Users/skirm/Desktop/OIOS%20Studio/studio/js/pages/workspace.js#L2169-L2175)
*   **What a Good Answer Contains:**
    *   Specific authority roles (e.g., "Operations Director owns the process; CFO approves the budget").
    *   Specific departments/roles impacted (e.g., "Sales representatives, proposal coordinators, database administrators").
    *   SMEs/Champions (e.g., "Senior Estimator who knows the legacy pricing logic").
*   **Follow-up Prompts (If Vague):**
    *   *If authority is vague:* "Who has the final sign-off to approve changes to your software stack or operational budgets?"
    *   *If impacted teams are vague:* "Who are the daily users of the current tools, and how will their day-to-day workflow change?"
    *   *If experts are missing:* "Who is the primary person we should speak to if we need to trace a transaction step-by-step?"

### E. Data Stage
*   **Client-Facing Question Examples:**
    *   *Reporting:* "What specific reports, trackers, or dashboards does leadership rely on, and how are they compiled?"
    *   *KPI metrics:* "What key performance indicators are tracked for this process, and what are the target levels?"
    *   *Repositories:* "Where does the raw data reside before it is consolidated (e.g., SQL server, local drives, SharePoint, ERP)?"
*   **Target OIOS Fields:** [reports, kpis, dataSources](file:///c:/Users/skirm/Desktop/OIOS%20Studio/studio/js/pages/workspace.js#L2193-L2199)
*   **What a Good Answer Contains:**
    *   Specific report names (e.g., "Monthly Operations Report, Weekly Sales Dashboard").
    *   Audience and compilation (e.g., "Emailed to VP as a PDF compiled manually from Excel").
    *   KPI metrics with targets (e.g., "Turnaround time under 24 hours; data accuracy at 98%").
    *   Data source details (e.g., "Raw transactions stored in postgres database on AWS, user logs stored on SharePoint").
*   **Follow-up Prompts (If Vague):**
    *   *If reports are vague:* "How is your weekly progress reported to management? Is it compiled automatically, or is it done manually?"
    *   *If metrics are missing:* "How does the organization measure if this process is running efficiently? What is the current value vs. the target value?"
    *   *If sources are vague:* "Where is the original transaction or log data saved when it is first created?"

---

## 4. Sufficiency Logic

The chatbot evaluates client responses in real-time to determine if the gathered detail is sufficient to proceed to the next stage or if a follow-up prompt is required. This is modeled on the OIOS [analyzeDiscoveryAnswer](file:///c:/Users/skirm/Desktop/OIOS%20Studio/studio/js/pages/workspace.js#L3999-L4420) algorithm.

### Real-Time Answer Parser
The chatbot parses the user's text for **6 Core Diagnostic Components**:

1.  **Priority Indicator:** Matches keywords expressing criticality.
    *   *Regex pattern:* `\b(priority|highest priority|critical|important|main goal|objective|strategic objective|primary|urgent|must|required|essential|key|main|highest)\b`
2.  **Driver / Business Reason:** Matches keywords expressing motivation.
    *   *Regex pattern:* `\b(because|due to|impacts|limits|affects|drives|reason|so that|in order to|motivation|why|need|demand|drive|competition|growth|revenue|improve|reduce|save|cost|value)\b`
3.  **Timeline:** Matches keywords specifying schedules or durations.
    *   *Regex pattern:* `\b(next 12 months|next 6 months|over the next year|within|by q[1-4]|this year|next year|deadline|target period)\b` or matches expressions containing durations (`next X weeks/months/years`).
4.  **Measurable Outcome / KPI:** Matches metrics, targets, or math units.
    *   *Regex pattern:* `\b(increase|reduce|decrease|improve|percent|hours|days|utilization|kpi|metric|target|from|to|measurable|measure|dollars|metrics|numbers)\b` or matches `%` symbol.
5.  **Owner / Responsible Person:** Matches organization roles and departments.
    *   *Regex pattern:* `\b(owner|responsible|accountable|sponsor|manager|director|vp|cfo|ceo|team lead|department owner|process owner|champion|role|supervisor|user|team|staff|lead|person|operations|who)\b`
6.  **Scope / Affected Process or System:** Matches technical tools, workflows, or platforms.
    *   *Regex pattern:* `\b(process|workflow|reporting|production|inventory|database|system|tool|spreadsheet|sheet|software|platform|intake|sap|excel|salesforce|jira|sharepoint)\b`

### Sufficiency Thresholds & Rules

```
                  ┌──────────────────────────────┐
                  │      Analyze User Input      │
                  └──────────────┬───────────────┘
                                 │
                 Length < 10 chars or 0 criteria?
                                 │
                   ┌─────────────┴─────────────┐
                   ▼ Yes                       ▼ No
           [INSUFFICIENT]              Count met criteria
         Ask follow-up query             (Out of 6 components)
                                               │
                                  ┌────────────┴────────────┐
                                  ▼                         ▼
                              1-5 met                    6 met
                           [PARTIAL]                 [SUFFICIENT]
                         Ask follow-up           Proceed to next step
                        for missing parts
```

*   **Insufficient (🔴):**
    *   *Rule:* Answer length $< 10$ characters OR none of the 6 diagnostic components are present.
    *   *Behavior:* The chatbot rejects the input and asks the standard follow-up question.
*   **Partial (🟡):**
    *   *Rule:* 1 to 5 diagnostic components are present.
    *   *Behavior:* If the current step's minimum criteria are met (e.g., goals require priority + timeline), the chatbot accepts it but notes the missing details in the *Optional Clarifications* database array. If critical details are missing, it asks one targeted follow-up question before proceeding.
*   **Sufficient (🟢):**
    *   *Rule:* All 6 diagnostic components are present AND the answer length $> 50$ characters.
    *   *Behavior:* The chatbot marks the field as fully completed and immediately transitions to the next conversation block.

---

## 5. Hidden Field Mapping

Clients do not think in terms of structured relational databases; their answers are naturally conversational and cross-cutting. The chatbot must map a single client statement to populate multiple [OIOS Discovery Intake](file:///c:/Users/skirm/Desktop/OIOS%20Studio/studio/js/pages/workspace.js#L2039-L2045) fields simultaneously.

### Mapping Engine Scenarios

```
              ┌─────────────────────────────────────────────────────────┐
              │                     Client Statement                    │
              │ "We manually run reports out of Salesforce into Excel"  │
              └───────────────────────────┬─────────────────────────────┘
                                          │
                  ┌───────────────────────┼───────────────────────────┐
                  ▼                       ▼                           ▼
          [Manual Work Areas]     [Current Systems]             [Integrations]
         "Manually run reports"  "Salesforce, Excel"   "Manual export from SF to Excel"
```

#### Scenario 1: Manual Reporting Workarounds
*   *Client Input:* *"We use Excel spreadsheets to manually compile monthly sales metrics because our Salesforce setup doesn't connect to our inventory system."*
*   *Multi-Field Mapping:*
    *   `systems.currentSystems` $\rightarrow$ Salesforce, Excel, Inventory system
    *   `systems.integrations` $\rightarrow$ Salesforce and Inventory system are disconnected; manual Excel transfer is used.
    *   `process.manualWorkAreas` $\rightarrow$ Manual compilation of sales metrics in Excel spreadsheets.
    *   `data.reports` $\rightarrow$ Monthly sales report compiled manually.

#### Scenario 2: System Performance Gaps
*   *Client Input:* *"Our shop floor operators have to wait for the legacy SAP terminal to sync inventory data, which crashes twice a day and slows down dispatch."*
*   *Multi-Field Mapping:*
    *   `systems.currentSystems` $\rightarrow$ SAP ERP (Legacy Terminal), Dispatch system
    *   `systems.technologyIssues` $\rightarrow$ Inventory synchronization lag, terminal crashes (twice daily).
    *   `process.knownBottlenecks` $\rightarrow$ Operator delay waiting for data sync, dispatch bottlenecks.
    *   `people.affectedTeams` $\rightarrow$ Shop floor operators, dispatch/operations team.

#### Scenario 3: Missing Ownership & Metrics
*   *Client Input:* *"The Sales Lead, Sarah, needs to reduce client onboarding turnaround time from 5 days to 24 hours by next quarter, but Salesforce is missing the customer data."*
*   *Multi-Field Mapping:*
    *   `business.primaryGoals` $\rightarrow$ Reduce client onboarding turnaround time (Target: next quarter).
    *   `business.expectedOutcomes` $\rightarrow$ Turnaround time reduced from 5 days to 24 hours.
    *   `systems.technologyIssues` $\rightarrow$ Salesforce customer data is missing.
    *   `people.keyStakeholders` $\rightarrow$ Sarah (Sales Lead).

---

## 6. Normalization Logic

The chatbot translates informal client statements into professional, structured OIOS language using standard normalization rules. This is based on the [generateSuggestedCopy](file:///c:/Users/skirm/Desktop/OIOS%20Studio/studio/js/pages/workspace.js#L4422-L4500) function:

### Normalization Rules
1.  **Remove Conversational Fillers:** Strip introductory phrases like *"well"*, *"honestly"*, *"basically"*, *"today"*, *"right now"*, *"we currently"*, or *"the client said"*.
2.  **Pronoun & Verb Substitution:**
    *   *"We use"* / *"We are using"* $\rightarrow$ *"The organization utilizes"*
    *   *"We need to"* / *"We want to"* $\rightarrow$ *"The objective is to"*
    *   *"Our"* / *"My"* $\rightarrow$ *"The"*
    *   *"Us"* / *"We"* $\rightarrow$ *"The team"* / *"The organization"*
3.  **Formal Prefixing:** Add standard professional headers depending on the target field:
    *   `primaryGoals` $\rightarrow$ *"Primary strategic objective is to..."*
    *   `expectedOutcomes` $\rightarrow$ *"Target outcome is to..."*
    *   `currentChallenges` $\rightarrow$ *"Operational challenge identified:..."*

### Normalization Examples

| Client Conversational Input | Normalized OIOS Intake Text | Target OIOS Fields |
| :--- | :--- | :--- |
| *"We use Excel a lot because our ERP does not give us the reports we need."* | **Current Systems:** ERP, Excel<br>**Technology Issues:** ERP reporting limitations.<br>**Manual Work Areas:** Spreadsheet-based reporting and manual data handling.<br>**Known Bottlenecks:** Lack of reliable automated reporting from ERP. | `systems.currentSystems`<br>`systems.technologyIssues`<br>`process.manualWorkAreas`<br>`process.knownBottlenecks` |
| *"Our managers have to sign off on orders on paper, which takes days because they are busy."* | **Core Processes:** Order authorization workflow.<br>**Known Bottlenecks:** Order approvals are delayed due to paper-based sign-off dependencies.<br>**Manual Work Areas:** Paper-based order approval routing.<br>**People > Affected Teams:** Management and operations team. | `process.coreProcesses`<br>`process.knownBottlenecks`<br>`process.manualWorkAreas`<br>`people.affectedTeams` |
| *"Sales reps copy client addresses from our database into Outlook emails to send proposals. It's a huge waste of time."* | **Current Systems:** Database, Microsoft Outlook.<br>**Integrations:** Disconnected database and email client.<br>**Manual Work Areas:** Manual copy-pasting of client addresses for proposals.<br>**Known Bottlenecks:** Manual data replication overhead slows down proposal delivery. | `systems.currentSystems`<br>`systems.integrations`<br>`process.manualWorkAreas`<br>`process.knownBottlenecks` |

---

## 7. Assessment Generation

Once the chatbot completes the Discovery Intake (15 fields), it runs the **Assessment Generator**. This generator maps the intake data to compile the 4 primary assessment fields, matching the OIOS [getAssessmentContext](file:///c:/Users/skirm/Desktop/OIOS%20Studio/studio/js/pages/workspace.js#L3875-L3883) structure:

```
[Discovery Intake Fields]
          │
          ├─► Primary Goals + Expected Outcomes ───────► Core Business Goals (businessGoals)
          ├─► Current Challenges ──────────────────────► Core Problems & Pain Points (coreProblems)
          ├─► Bottlenecks + Manual Work Areas ─────────► Operational Bottlenecks (operationalBottlenecks)
          └─► Systems + Integrations + Issues ─────────► Current Technology Stack (techStack)
```

### Assessment Mapping Schema

1.  **Core Business Goals (`businessGoals`):**
    *   *Sources:* `business.primaryGoals` + `business.expectedOutcomes`
    *   *Shorthand Logic:* Combines the client's strategic goals with their target timeline and success metrics.
    *   *Template Output:* 
        > *"Strategic goals focus on [primaryGoals]. Success metrics include [expectedOutcomes]."*
2.  **Core Problems & Pain Points (`coreProblems`):**
    *   *Sources:* `business.currentChallenges` + `people.affectedTeams`
    *   *Shorthand Logic:* Focuses on the primary business pain points and identifies which specific departments are most impacted.
    *   *Template Output:* 
        > *"Core operational challenges include [currentChallenges], which directly impact [affectedTeams]."*
3.  **Operational Bottlenecks (`operationalBottlenecks`):**
    *   *Sources:* `process.knownBottlenecks` + `process.manualWorkAreas`
    *   *Shorthand Logic:* Lists process delays and manual workarounds (e.g. spreadsheet compilation, duplicate data entry).
    *   *Template Output:* 
        > *"Operational bottlenecks are driven by [knownBottlenecks] and manual tasks in [manualWorkAreas]."*
4.  **Current Technology Stack (`techStack`):**
    *   *Sources:* `systems.currentSystems` + `systems.integrations` + `systems.technologyIssues`
    *   *Shorthand Logic:* Lists the client's software, how data flows between them, and any performance issues.
    *   *Template Output:* 
        > *"Current stack includes [currentSystems] with integrations via [integrations]. Technical issues reported: [technologyIssues]."*

---

## 8. Stopping Rule

The chatbot operates within a strict lifecycle. It is designed to capture intake data and generate the initial assessment, then stop.

```
Conversation Complete
        │
        ▼
Run Assessment Generator ──► Save to Company Record ──► Terminate Session
                                                               │
                                                               ▼
                                                     Show Closing Message:
                                                    "Intake logged. Status
                                                     is in Review."
```

### Stopping Sequence
1.  **Intake Completion:** The chatbot verifies that overall completeness $\ge 70\%$ (and ideally all stages have been addressed).
2.  **Assessment Compiler:** The chatbot runs the compilation schema to update the company profile's `discoveryIntake` and `assessment` records in `localStorage` or PostgreSQL.
3.  **Audit Log Entry:** The system writes a system log entry (e.g., `"Discovery Chatbot session completed for Company: [CompanyName]"`).
4.  **Handoff Message:** The chatbot presents the closing message, informs the client that their session is complete, and disables the chat input interface.
5.  **State Protection:** The temporary client `discovery_token` cookie is cleared or marked as expired to prevent further updates.

---

## 9. Consultant Behavior Principles

To maintain the quality of a live PRAGMA discovery, the chatbot must adhere to these 7 behavioral principles during the conversation:

1.  **Ask Like a Consultant:** Frame questions from a business perspective. Avoid technical jargon (e.g., instead of asking *"What databases do you use?"*, ask *"Where does your team store transaction records?"*).
2.  **Probe for Missing Detail:** Never accept brief, single-sentence answers. If a client says, *"We want to speed up sales,"* the chatbot must probe: *"What is the current turnaround time, and what specific target timeline are you aiming for?"*
3.  **Avoid Assumptions:** Do not assume a client's tools, workflows, or roles. Always ask for clarification rather than guessing based on industry defaults.
4.  **Avoid Premature AI Recommendations:** The chatbot must **never** suggest solutions. If a client asks, *"Can AI fix our reporting delay?"*, the chatbot must respond: *"AI can address data pipelines, but our goal today is to map your current processes. We will evaluate technical solutions during our architectural review."*
5.  **Avoid Solution Design:** Do not discuss software products (e.g., Snowflake, Databricks, custom Python scripts) or database schemas. Focus on documenting the current operational realities.
6.  **Keep the Client Focused:** If the client goes off-topic (e.g., discussing marketing plans or brand design), gently guide them back to business goals, processes, systems, and data.
7.  **Translate Messy Answers into OIOS Language:** In the background, convert informal statements into formal, system-oriented summaries.

---

## 10. Future Implementation Components

To build this chatbot in the next phase, the following software components will be required on the server and client surfaces:

### 1. Chat Session Schema
A data structure to track the conversation session, stored in the database (`localStorage` for development or PostgreSQL for production):
```json
{
  "id": "session_uuid",
  "companyId": "company_id",
  "currentStage": "business|process|systems|people|data|completed",
  "currentQuestionIndex": 0,
  "completedQuestions": [],
  "skippedQuestions": [],
  "answers": {
    "primaryGoals": "Client's response text...",
    "expectedOutcomes": "Client's response text..."
  },
  "optionalClarifications": {
    "primaryGoals": ["Timeline", "KPI Targets"]
  },
  "normalizedDrafts": {
    "business.primaryGoals": "Normalized OIOS text..."
  },
  "isTerminated": false
}
```

### 2. Message History Logger
Tracks the messages exchanged in the UI, enabling a clean conversational UI:
```json
{
  "sessionId": "session_uuid",
  "messages": [
    { "sender": "bot", "text": "What are the primary strategic goals...", "timestamp": "ISO_DATE" },
    { "sender": "user", "text": "We want to speed up proposal times...", "timestamp": "ISO_DATE" }
  ]
}
```

### 3. Chatbot Backend Middleware (`server.js`)
*   **`POST /api/public/discovery/message`**
    *   *Purpose:* Process the user's message, run sufficiency checks, update the session state, and return the chatbot's response.
    *   *Payload:* `{ sessionId, messageText }`
    *   *Response:* `{ replyText, sessionStatus, progressPercent }`
*   **`POST /api/public/discovery/complete`**
    *   *Purpose:* Finalize the session, generate the assessment fields, write to the company record, and clear the session token.

### 4. Client-Side Chat Interface (`/public/discovery`)
*   A responsive, clean chat interface served at `/onboarding/chat` or `/discovery`.
*   Connects to `/api/public/discovery/message` to handle the conversation.
*   Enforces inputs, handles loading states, and transitions to the final handoff screen on completion.
