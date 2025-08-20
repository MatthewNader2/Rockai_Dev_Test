# AI-Powered Real Estate CRM

## Objective
This project is a standalone demo product that demonstrates how AI can generate lead summaries, performance coaching, and strategic recommendations within a Real-Estate CRM environment. It was built to fulfill the requirements of the RockAI Dev Test Task.

## Features

### Core CRM Functionality
- **Main Dashboard:** A high-level overview with KPIs (Total Leads, Open Deals, Conversion Rate), a visual pipeline distribution chart, and a proactive AI insight.
- **Interactive Leads List:** A fully searchable, filterable (by status, source, interest), and sortable list of all leads.
- **Lead Pinning:** Ability to "pin" important leads to the top of the list, with state saved locally.
- **Detailed Lead Profiles:** A dedicated view for each lead showing all their information.

### AI-Powered Intelligence
- **Individual Lead Analysis (RAG):** When viewing a lead, the AI provides a detailed summary and actionable recommendations (Next Best Action, Engagement Approach, Timing, Recommended Offer).
- **Time-Aware Context:** The AI knows the current date and analyzes the age of leads to provide more relevant advice.
- **Individual Performance Coaching:** On the Performance Dashboard, the AI acts as a sales coach, analyzing a specific rep's data to provide a performance summary, identify key gaps, and offer coaching tips.
- **Team & Strategic Analysis:** The AI analyzes the entire dataset to provide a pipeline health check, identify significant patterns, and recommend an overall strategy for the team.
- **Initial Deep Analysis:** On startup, the server performs a one-time deep analysis of all data to discover high-level patterns, which are then used as context to enrich all subsequent AI requests.
- **Keyword Highlighting:** The AI identifies key terms in its analysis, which are automatically bolded in the UI to draw the user's attention.

### Technical Features
- **Optimized Performance:** AI-generated insights are cached in memory to provide instantaneous responses on subsequent requests and reduce API calls.
- **Loading State Management:** The application displays a loading screen while the backend AI engine initializes, ensuring a smooth user experience.
- **Responsive UI:** The interface is built with Tailwind CSS and is fully responsive for desktop and mobile viewing.
- **Animated Interface:** Smooth page transitions and layout animations powered by Framer Motion.

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, Recharts
- **Backend:** Node.js, Express.js
- **AI:** Google Gemini API (`gemini-2.0-flash-lite`)

---

## Setup and Installation

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### 1. Clone the Repository
```bash
git clone https://github.com/MatthewNader2/Rockai_Dev_Test.git
cd Rockai_Dev_Test
```

### 2. Install Backend Dependencies
```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 4. Configure Environment Variables
- In the `backend` directory, create a new file named `.env`.
- Add your Google Gemini API key to this file:
  ```      GEMINI_API_KEY=YOUR_API_KEY_HERE
  ```

---

## Running the Application

You will need two separate terminals to run both the backend and frontend servers.

### Terminal 1: Start the Backend Server
```bash
cd backend
npm start
```
The backend will be running at `http://localhost:5000`. It will take 10-20 seconds for the initial AI analysis to complete.

### Terminal 2: Start the Frontend Server
```bash
cd frontend
npm run dev
```
The application will be available at `http://localhost:5173`. The app will show a loading screen until the backend analysis is complete.