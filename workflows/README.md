# n8n Workflows

These are the automation workflows powering the Life_OS dashboard.  
Each file is exported directly from n8n and can be imported in any n8n instance.

---

## How to Import a Workflow

1. Open your n8n instance (`http://localhost:5678`)
2. Click **"Add workflow"** → **"Import from file"**
3. Select the `.json` file
4. Update any credentials (Notion API key, webhook URLs) to match your setup
5. Activate the workflow

---

## Workflows

### 1. Notion Learning Plan → Glance
**File:** `Notion Learning Plan → Glance.json`

Reads the **Learning Progress Tracker** Notion database and sends formatted data to a Glance widget via webhook. Powers the progress bars on the Learning dashboard tab.

**Trigger:** Webhook (called by Glance on page load)  
**Data flow:** Glance widget → n8n webhook → Notion API → formatted response → Glance renders

**Required:**
- Notion API key
- Notion database ID for Learning Phases
- n8n webhook URL configured in `config/pages/learning.yml`

---

### 2. Notion Courses → Glance
**File:** `Notion Courses → Glance.json`

Reads the **Courses** Notion database. Calculates completion percentage from `Est.Time` and `TimeLine` formula fields and returns structured data to the dashboard.

**Trigger:** Webhook  
**Data flow:** Glance widget → n8n webhook → Notion API → percentage calculation → Glance renders

**Required:**
- Notion API key
- Notion database ID for Courses
- `Est.Time` and `TimeLine` formula properties must exist in your Notion DB

---

### 3. Notion Projects → Glance
**File:** `Notion Projects → Glance.json`

Reads the **Project Manager** Notion database and displays active projects with their current status (`Not started` / `In progress` / `Done`) on the dashboard.

**Trigger:** Webhook  
**Data flow:** Glance widget → n8n webhook → Notion API → project list → Glance renders

**Required:**
- Notion API key
- Notion database ID for Project Manager
- Status property with values: `Not started`, `In progress`, `Done`

---

### 4. Keep Warm — Webhooks
**File:** `Keep Warm — Webhooks.json`

Pings all active webhook URLs every 2 minutes to prevent n8n cold start timeouts. Without this, the first request after an idle period takes several seconds to respond, causing Glance widgets to appear broken.

**Trigger:** Schedule (every 2 minutes)  
**Data flow:** Timer → HTTP request to each webhook URL → keeps connections warm

**Required:**
- Update the webhook URLs inside the workflow to match your n8n instance URLs

---

## Notion Database Setup

If you want to replicate this setup, you need 3 Notion databases:

| Database | Required Properties |
|---|---|
| Learning Phases | Name, Status (`Not started` / `In progress` / `Done`) |
| Courses | Name, Status, Est.Time (number), TimeLine (formula) |
| Project Manager | Name, Status (`Not started` / `In progress` / `Done`) |

Create a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations) and connect it to each database.

---

## Environment Variables

Add these to your `secrets/.env.production`:

```env
NOTION_API_KEY=your_notion_integration_secret
NOTION_LEARNING_DB_ID=your_database_id
NOTION_COURSES_DB_ID=your_database_id
NOTION_PROJECTS_DB_ID=your_database_id
```
