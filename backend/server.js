require("dotenv").config();

console.log(`--- SERVER SCRIPT STARTING AT ${new Date().toISOString()} ---`);
console.log("Attempting to load environment variables and modules...");

const express = require("express");
const cors = require("cors");
const leadsData = require("./Lead (1).json");

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

let globalPatterns = null;

let serverStatus = "analyzing";

const createGlobalAnalysisPrompt = () => {
  const prompt = `
    You are a master data scientist and sales strategist for a real estate company. Your task is to perform a one-time, deep analysis of the entire leads dataset to uncover 2-3 high-level, non-obvious strategic patterns.
    The current date is ${new Date().toLocaleDateString()}.
    The entire dataset is provided below as a JSON string.

    Analyze this data to find correlations. For example:
    - "Leads from a specific source (e.g., 'Facebook') tend to have a lower conversion rate (e.g., more 'cancellation' statuses)."
    - "Leads with a 'hot' interest level but a low budget often become 'not_interested_now'."
    - "A specific sales agent might be particularly good or bad with a certain type of lead."

    Do not state obvious facts like "there are many follow-up leads." Find the hidden relationships.

    Provide the output as a single, valid JSON object with ONLY the key "strategicPatterns".
    "strategicPatterns" should be an array of objects, where each object has THREE keys:
    1. "pattern": A concise description of the finding.
    2. "implication": The business impact or recommendation based on the pattern.
    3. "confidence": A string representing your confidence in this pattern (e.g., "High", "Medium", "Low") based on the strength of the evidence in the data.

    ENTIRE LEADS DATASET:
    ---
    ${JSON.stringify(leadsData)}
    ---
  `;
  return prompt;
};

const analyzeGlobalPatterns = async () => {
  console.log("--- Starting Global Strategic Analysis (RAG)... ---");
  try {
    const prompt = createGlobalAnalysisPrompt();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch[0]) {
      text = jsonMatch[0];
    }

    globalPatterns = JSON.parse(text);
    console.log(
      "✅ Global Strategic Analysis COMPLETE. Patterns are now in memory."
    );
    serverStatus = "ready";
  } catch (error) {
    console.error("❌ ERROR during Global Strategic Analysis:", error);
    globalPatterns = { error: "Could not generate global patterns." };
    serverStatus = "ready";
  }
};

(async () => {
  await analyzeGlobalPatterns();
})();

const insightsCache = new Map();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] INCOMING REQUEST: ${req.method} ${
      req.originalUrl
    }`
  );
  next();
});

app.get("/api/leads", (req, res) => {
  console.log(`---> SUCCESS: Matched the /api/leads route.`);
  res.json(leadsData);
});

app.get("/api/leads/filters", (req, res) => {
  console.log(
    `---> SUCCESS: Matched the /api/leads/filters route! Preparing to send filter data.`
  );

  const statuses = [...new Set(leadsData.map((lead) => lead.status))];
  const sources = [...new Set(leadsData.map((lead) => lead.source))];
  const interests = [...new Set(leadsData.map((lead) => lead.interest))];

  res.json({
    statuses: statuses.sort(),
    sources: sources.sort(),
    interests: interests.sort(),
  });
});

app.get("/api/status", (req, res) => {
  res.json({ status: serverStatus });
});

app.get("/api/performance/global-patterns", (req, res) => {
  console.log(
    `---> SUCCESS: Matched the /api/performance/global-patterns route.`
  );
  res.json(globalPatterns);
});

app.get("/api/users", (req, res) => {
  console.log(`---> SUCCESS: Matched the /api/users route.`);

  const ownerIdToNameMap = new Map();

  for (const lead of leadsData) {
    if (!lead.ownerId) {
      continue;
    }

    const currentName = ownerIdToNameMap.get(lead.ownerId);
    if (!currentName || currentName.startsWith("[")) {
      if (
        lead.nameEn &&
        lead.nameEn.trim() !== "" &&
        lead.nameEn.trim().toLowerCase() !== "no name"
      ) {
        ownerIdToNameMap.set(lead.ownerId, lead.nameEn.trim());
      } else if (!currentName) {
        ownerIdToNameMap.set(
          lead.ownerId,
          `[Unnamed User] - ${lead.ownerId.substring(0, 8)}`
        );
      }
    }
  }

  const users = Array.from(ownerIdToNameMap, ([id, name]) => ({ id, name }));

  users.sort((a, b) => a.name.localeCompare(b.name));

  res.json(users);
});

app.get("/api/dashboard-kpis", (req, res) => {
  console.log(`---> SUCCESS: Matched the /api/dashboard-kpis route.`);

  const totalLeads = leadsData.length;
  const openDeals = leadsData.filter(
    (lead) => lead.status === "open_deal"
  ).length;
  const freshLeads = leadsData.filter(
    (lead) => lead.status === "fresh_lead"
  ).length;

  const conversionRate =
    totalLeads > 0 ? ((openDeals / totalLeads) * 100).toFixed(1) : 0;

  const pipelineDistribution = leadsData.reduce((acc, lead) => {
    const status = lead.status.replace("_", " ");
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.entries(pipelineDistribution).map(
    ([name, count]) => ({ name, count })
  );

  res.json({
    totalLeads,
    openDeals,
    freshLeads,
    conversionRate,
    chartData,
  });
});

app.get("/api/performance/individual/:ownerId", async (req, res) => {
  const { ownerId } = req.params;
  console.log(
    `---> SUCCESS: Matched individual performance route for owner: ${ownerId}.`
  );
  const cacheKey = `individual-performance-${ownerId}`;

  if (insightsCache.has(cacheKey)) {
    console.log(`CACHE HIT for key: ${cacheKey}`);
    return res.json(insightsCache.get(cacheKey));
  }
  console.log(`CACHE MISS for key: ${cacheKey}. Calling AI...`);

  const userLeads = leadsData.filter((lead) => lead.ownerId === ownerId);

  if (userLeads.length === 0) {
    return res.status(404).json({ message: "No leads found for this user." });
  }

  const stats = {
    totalLeads: userLeads.length,
    statusBreakdown: userLeads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {}),
    staleLeads: userLeads.filter((lead) => {
      const fourteenDaysAgo = new Date(
        new Date().setDate(new Date().getDate() - 14)
      );
      return (
        lead.status === "follow_up" &&
        new Date(lead.createdAt) < fourteenDaysAgo
      );
    }).length,
  };

  const prompt = `
    You are an expert sales coach reviewing a sales representative's performance based on their lead data.
    Analyze the following statistics and provide a concise, actionable analysis.
    The current date is ${new Date().toLocaleDateString()}.
    Output a valid JSON object with ONLY these keys: "performanceSummary", "keyGap", "coachingTip", and "keywords".
    The "keywords" key should be an array of important single or two-word phrases from your analysis that should be highlighted.

    ---
    NEW: Use the following high-level strategic context to enrich your analysis. This context was derived from a deep analysis of the entire dataset.
    Global Strategic Context: ${JSON.stringify(globalPatterns)}
    ---

    Statistics for the sales rep:
    ---
    Total Leads: ${stats.totalLeads}
    Leads by Status: ${JSON.stringify(stats.statusBreakdown)}
    Number of Stale Leads (in follow-up for >14 days): ${stats.staleLeads}
    ---
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch[0]) {
      text = jsonMatch[0];
    }
    const aiJson = JSON.parse(text);

    insightsCache.set(cacheKey, aiJson);

    res.json(aiJson);
  } catch (error) {
    console.error("Error in individual performance AI endpoint:", error);
    res.status(500).json({ message: "Failed to generate AI coaching." });
  }
});

app.get("/api/performance/team", async (req, res) => {
  console.log(`---> SUCCESS: Matched team performance route.`);
  const cacheKey = "team-performance";

  if (insightsCache.has(cacheKey)) {
    console.log(`CACHE HIT for key: ${cacheKey}`);
    return res.json(insightsCache.get(cacheKey));
  }
  console.log(`CACHE MISS for key: ${cacheKey}. Calling AI...`);

  const pipeline = leadsData.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {});

  const performers = leadsData.reduce((acc, lead) => {
    if (lead.status === "open_deal" && lead.ownerId) {
      acc[lead.ownerId] = (acc[lead.ownerId] || 0) + 1;
    }
    return acc;
  }, {});

  const prompt = `
    You are a strategic sales manager analyzing the entire company's sales pipeline.
    Based on the following aggregated data, provide a high-level analysis.
    The current date is ${new Date().toLocaleDateString()}.
    Output a valid JSON object with ONLY these keys: "pipelineHealthCheck", "significantPattern", "overallStrategy", and "keywords".
    The "keywords" key should be an array of important single or two-word phrases from your analysis that should be highlighted.
    
    ---
    NEW: Use the following high-level strategic context to enrich your analysis. This context was derived from a deep analysis of the entire dataset.
    Global Strategic Context: ${JSON.stringify(globalPatterns)}
    ---

    Team-wide Data:
    ---
    Total Pipeline Distribution (by status): ${JSON.stringify(pipeline)}
    Top Performers (by number of open deals): ${JSON.stringify(performers)}
    ---
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch[0]) {
      text = jsonMatch[0];
    }
    const aiJson = JSON.parse(text);

    insightsCache.set(cacheKey, aiJson);

    res.json(aiJson);
  } catch (error) {
    console.error("Error in team performance AI endpoint:", error);
    res.status(500).json({ message: "Failed to generate AI strategy." });
  }
});

app.get("/api/leads/:id", (req, res) => {
  const { id } = req.params;
  console.log(`---> Trying to match /api/leads/:id with id: ${id}`);
  const lead = leadsData.find((l) => l.id === id);
  if (lead) {
    res.json(lead);
  } else {
    res.status(404).json({ message: "Lead not found" });
  }
});

app.post("/api/leads/:id/ai-summary", async (req, res) => {
  console.log(`---> SUCCESS: Matched the /api/leads/:id/ai-summary route.`);
  const { id } = req.params;
  const cacheKey = `lead-summary-${id}`;

  if (insightsCache.has(cacheKey)) {
    console.log(`CACHE HIT for key: ${cacheKey}`);
    return res.json(insightsCache.get(cacheKey));
  }
  console.log(`CACHE MISS for key: ${cacheKey}. Calling AI...`);

  const lead = leadsData.find((l) => l.id === id);

  if (!lead) {
    return res.status(404).json({ message: "Lead not found" });
  }

  const now = new Date();
  const formattedDateTime = now.toLocaleString("en-US", { timeZone: "UTC" });

  const leadInfo = `
    Current Date and Time: ${formattedDateTime} (UTC)
    Lead Name: ${lead.nameEn || "[Unnamed Lead]"}
    Status: ${lead.status}
    Date Created: ${lead.createdAt}
    Source: ${lead.source}
    Interest Level: ${lead.interest}
    Budget: ${lead.budget > 0 ? lead.budget : "Not Specified"}
    Notes: ${
      Array.isArray(lead.notes) ? lead.notes.join(", ") : lead.notes || "None"
    }
    Description: ${lead.description || "None"}
  `;

  const prompt = `
    You are an expert real estate sales analyst. Based on the following lead data, generate a concise summary and actionable recommendations.
    Use the "Current Date and Time" to compare against the "Date Created" to understand the lead's age and urgency. This context is critical for your analysis.
    Provide the output as a single, valid JSON object with ONLY the following keys: "summary", "nextBestAction", "engagementApproach", "timingAdvice", "recommendedOffer".
    Do not add any introductory text, markdown formatting, or explanations. Just the raw JSON object.

    ---
    NEW: Use the following high-level strategic context to enrich your analysis. This context was derived from a deep analysis of the entire dataset.
    Global Strategic Context: ${JSON.stringify(globalPatterns)}
    ---

    Lead Data:
    ---
    ${leadInfo}
    ---
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch && jsonMatch[0]) {
      text = jsonMatch[0];
    }

    const aiJson = JSON.parse(text);

    insightsCache.set(cacheKey, aiJson);

    res.json(aiJson);
  } catch (error) {
    console.error("Error in AI endpoint:", error);
    res.status(500).json({ message: "Failed to generate or parse AI summary" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

console.log("--- SERVER SCRIPT LOADED. Waiting for requests... ---");
