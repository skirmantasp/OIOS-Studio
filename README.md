# OIOS Studio

**Organizational Intelligence OS** — An internal workspace for an Organizational Intelligence Architect to manage companies, assessments, discovery notes, insights, system ideas, projects, and reports.

---

## Overview

OIOS Studio is a single-page application (SPA) built with vanilla HTML, CSS, and JavaScript (ES Modules). It requires no build step and no backend. All data is persisted locally in the browser's `localStorage`.

### Core Workflow

```
Company → Assessment → Discovery → Insights → System Ideas → Projects → Reports
```

### Pages

| Page | Description |
|---|---|
| **Dashboard** | KPI overview, stage progress, active projects, next actions checklist |
| **Companies** | Company list with search, filtering by status and stage |
| **Company Workspace** | Tabbed workspace: Overview, Assessment, Discovery, Insights, System Ideas, Projects, Reports |
| **Reports** | Global report store with PDF-ready viewer and report builder |
| **Settings** | Export, import, and reset the local database |

### Technology Stack

- **Frontend**: HTML5, Vanilla CSS, JavaScript ES Modules
- **Icons**: [Lucide](https://lucide.dev/) (CDN)
- **Markdown**: [Marked.js](https://marked.js.org/) (CDN)
- **Persistence**: Browser `localStorage`
- **Server**: [serve](https://github.com/vercel/serve) (static file server)

---

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm v8 or higher

### Setup

```bash
# Clone the repository
git clone https://github.com/skirmantasp/OIOS-Studio.git
cd OIOS-Studio

# Install the static server
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> **Note:** The app must be served over HTTP (not opened as a `file://` path) because ES Modules require a proper server origin.

### Mock Data

On first launch, the app auto-populates with three realistic business transformation scenarios:

- **Aetheric Quantum Systems** — Quantum hardware, schema registry and cleanroom telemetry challenges
- **Apex Foundry Works** — Heavy industrial foundry, predictive maintenance and inventory tracking
- **Valence Advisory Partners** — Management consulting, knowledge management and proposal indexing

To reset to this mock data at any time: **Settings → Reset to Baseline Mock Templates**.

---

## Deployment

### Deploy to Railway

OIOS Studio is configured for zero-configuration deployment on [Railway](https://railway.app).

#### Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: OIOS Studio v1.0"
   git branch -M main
   git remote add origin https://github.com/skirmantasp/OIOS-Studio.git
   git push -u origin main
   ```

2. **Create a Railway project**
   - Go to [railway.app](https://railway.app) and log in
   - Click **New Project → Deploy from GitHub repo**
   - Select `OIOS-Studio`

3. **Railway auto-detects configuration**
   - Build: `npm install` (from `package.json`)
   - Start: `npm start` (runs `serve . -l $PORT --single`)
   - Railway injects `$PORT` automatically

4. **Generate a public URL**
   - In Railway project settings: **Settings → Networking → Generate Domain**
   - Your app will be live at `https://oios-studio-xxxx.up.railway.app`

#### Railway Environment Variables

No environment variables are required. Railway auto-provides `PORT`.

#### Why hash routing works on Railway

OIOS Studio uses **hash-based routing** (`/#/dashboard`, `/#/companies`, etc.). Because the route is in the URL fragment (after `#`), it is never sent to the server — the browser handles it entirely. This means no special server configuration is needed for deep links to work correctly on Railway or any other static host.

---

## Data Persistence

All data is stored in **browser `localStorage`** under the key `oios_studio_db_v1`.

- Data persists across browser sessions on the same device and browser
- Data does **not** sync across devices or browsers
- Clearing browser cache/localStorage will reset the app to mock data on next load

### Backup & Restore

Use **Settings → Export Database Ledger** to download a `.json` backup file.  
Use **Settings → Select File & Import** to restore from a backup.

---

## Project Structure

```
OIOS-Studio/
├── css/
│   ├── style.css          # Design system: tokens, layout, typography
│   └── components.css     # Component styles: cards, tables, modals, drawers
├── js/
│   ├── app.js             # Router, theme manager, app initialization
│   ├── state.js           # Data store, localStorage persistence, CRUD operations
│   ├── utils.js           # Shared utilities: icons, markdown, toasts, modal/drawer API
│   └── pages/
│       ├── dashboard.js   # Dashboard: KPIs, stage progress, next actions
│       ├── companies.js   # Companies list with search and filters
│       ├── workspace.js   # Company workspace with 7 tabs
│       ├── reports.js     # Report builder, viewer, and global list
│       └── settings.js    # Database export, import, and reset
├── index.html             # App shell: sidebar, topbar, viewport, modal, drawer
├── package.json           # Dependencies and start scripts
├── railway.toml           # Railway deployment configuration
├── .gitignore
└── README.md
```

---

## Post-Deployment Validation Checklist

After deploying to Railway, verify the following:

- [ ] App loads at the public URL
- [ ] Dashboard renders KPI cards and stage progression
- [ ] Clicking **Companies** shows the company list with 3 mock companies
- [ ] Clicking a company opens the Company Workspace
- [ ] All 7 workspace tabs are accessible and render content
- [ ] **Assessment** tab shows pre-filled fields
- [ ] **Discovery** tab shows mock notes; adding a new note saves correctly
- [ ] **Insights** tab shows mock insights
- [ ] **System Ideas** tab shows mock ideas
- [ ] **Projects** tab shows mock projects with progress bars
- [ ] **Reports** tab links to the report builder
- [ ] **Settings → Export** downloads a `.json` file
- [ ] **Settings → Import** restores data from that file
- [ ] **Settings → Reset** restores mock data
- [ ] Hash routing works: navigating to `/#/companies` directly renders correctly
- [ ] Theme toggle (dark/light) works and persists on refresh
- [ ] KPI card clicks navigate correctly (Total Companies, Active Accounts, drawers for Projects/Ideas)
- [ ] No red errors in browser DevTools console

---

## License

Internal use only. Not licensed for public distribution.
