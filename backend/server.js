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
const insightsCache = new Map();

const getOrGenerateGlobalPatterns = async (lang = "en") => {
  const cacheKey = `global-patterns-${lang}`;
  if (insightsCache.has(cacheKey)) {
    console.log(`CACHE HIT for global patterns (lang: ${lang})`);
    return insightsCache.get(cacheKey);
  }
  console.log(`CACHE MISS for global patterns (lang: ${lang}). Calling AI...`);

  const languageInstruction =
    lang === "ar"
      ? "IMPORTANT: Your entire response must be in a formal, high-class Egyptian Arabic dialect suitable for elite salespeople. All keys and values in the JSON must be in this Arabic. Use Direct Catching words, Your response should be Passive"
      : "IMPORTANT: Your entire response must be in a sharp, motivational sales language. All keys and values in the JSON must be in English.";

  const prompt = `
    You are an elite Sales Director, a master strategist with years of experience in high-value real estate. Your task is to analyze the entire portfolio of leads to uncover 2-3 critical, actionable insights that will drive sales.
    The current date is ${new Date().toLocaleDateString()}.
    The entire leads portfolio is provided below as a JSON string.
    ${languageInstruction}

    Look for the hidden opportunities and risks. For example:
    - "Leads from Source X are proving to be low-quality; they waste our time. We need to re-evaluate that channel."
    - "Clients interested in Y but with a budget of Z are hesitant. We need a specific financial offer to close them."
    - "Salesperson A is a hunter with new leads, while Salesperson B excels at nurturing long-term clients."

    Avoid generic observations. Deliver sharp, decisive intelligence.

    Provide the output as a single, valid JSON object with ONLY the key "strategicPatterns".
    "strategicPatterns" should be an array of objects, where each object has THREE keys:
    1. "pattern": A concise, impactful summary of the market signal you've detected.
    2. "implication": The direct business consequence or strategic move we must make.
    3. "confidence": Your confidence in this insight ("High", "Medium", "Low").

    ENTIRE LEADS PORTFOLIO:
    ---
    ${JSON.stringify(leadsData)}
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
    const generatedPatterns = JSON.parse(text);
    insightsCache.set(cacheKey, generatedPatterns);
    return generatedPatterns;
  } catch (error) {
    console.error(
      `❌ ERROR during Global Strategic Analysis for ${lang}:`,
      error
    );
    return { error: "Could not generate global patterns." };
  }
};

(async () => {
  globalPatterns = await getOrGenerateGlobalPatterns("en");
  if (!globalPatterns.error) {
    console.log(
      "✅ Initial English Global Strategic Analysis COMPLETE. Patterns are now in memory for context."
    );
  }
  serverStatus = "ready";
})();

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
  const lang = req.headers["accept-language"] || "en";
  console.log(`---> SUCCESS: Matched /api/leads route. Language: ${lang}`);
  const localizedLeads = leadsData.map((lead) => ({
    ...lead,
    name: lang === "ar" && lead.nameAr ? lead.nameAr : lead.nameEn,
  }));
  res.json(localizedLeads);
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

app.get("/api/performance/global-patterns", async (req, res) => {
  const lang = req.headers["accept-language"] || "en";
  console.log(
    `---> SUCCESS: Matched the /api/performance/global-patterns route. Language: ${lang}`
  );
  const patterns = await getOrGenerateGlobalPatterns(lang);
  if (patterns.error) {
    res.status(500).json(patterns);
  } else {
    res.json(patterns);
  }
});

app.get("/api/users", (req, res) => {
  console.log(`---> SUCCESS: Matched the /api/users route.`);
  const ownerIdToNameMap = new Map();
  for (const lead of leadsData) {
    if (!lead.ownerId) continue;
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
  res.json({ totalLeads, openDeals, freshLeads, conversionRate, chartData });
});

app.get("/api/performance/individual/:ownerId", async (req, res) => {
  const { ownerId } = req.params;
  const lang = req.headers["accept-language"] || "en";
  console.log(
    `---> SUCCESS: Matched individual performance route for owner: ${ownerId}. Language: ${lang}`
  );
  const cacheKey = `individual-performance-${ownerId}-${lang}`;

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


  const languageInstruction =
    lang === "ar"
      ? "IMPORTANT: Your entire response must be in a formal, high-class Egyptian Arabic dialect suitable for elite salespeople. All keys and values in the JSON must be in this Arabic. Use Direct Catching words, Your response should be Passive"
      : "IMPORTANT: Your entire response must be in a sharp, motivational sales language. All keys and values in the JSON must be in English.";

  const prompt = `
    You are a top-tier Sales Director, mentoring one of your salespeople. Your tone is sharp, insightful, and focused on results.
    Analyze their performance statistics and provide a direct, actionable coaching plan.
    The current date is ${new Date().toLocaleDateString()}.
    ${languageInstruction}

    Output a valid JSON object with ONLY these keys: "performanceSummary", "keyGap", "coachingTip", and "keywords".
    - "performanceSummary": A quick, bottom-line assessment of their performance.
    - "keyGap": The single biggest weakness or missed opportunity in their pipeline.
    - "coachingTip": A direct, actionable piece of advice to fix the key gap.
    - "keywords": An array of important phrases from your analysis to be highlighted.

    Global Strategic Context (what the market is doing): ${JSON.stringify(
      globalPatterns
    )}

    Salesperson's Performance Snapshot:
    ---
    Total Leads Assigned: ${stats.totalLeads}
    Current Pipeline Status: ${JSON.stringify(stats.statusBreakdown)}
    Stale Leads (unresponsive for >14 days): ${stats.staleLeads}
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
  const lang = req.headers["accept-language"] || "en";
  console.log(
    `---> SUCCESS: Matched team performance route. Language: ${lang}`
  );
  const cacheKey = `team-performance-${lang}`;

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


  const languageInstruction =
    lang === "ar"
      ? "IMPORTANT: Your entire response must be in a formal, high-class Egyptian Arabic dialect suitable for elite salespeople. All keys and values in the JSON must be in this Arabic. Use Direct Catching words, Your response should be Passive"
      : "IMPORTANT: Your entire response must be in a sharp, motivational sales language. All keys and values in the JSON must be in English.";

  const prompt = `
    You are the Head of Sales, presenting a strategic overview to your team of elite agents. Your language is decisive and focused on winning.
    Analyze the entire team's sales pipeline data.
    The current date is ${new Date().toLocaleDateString()}.
    ${languageInstruction}

    Output a valid JSON object with ONLY these keys: "pipelineHealthCheck", "significantPattern", "overallStrategy", and "keywords".
    - "pipelineHealthCheck": A direct assessment of our pipeline's health (e.g., "Strong but needs optimization," "Stalled," "Vulnerable").
    - "significantPattern": The single most important trend you see in the data right now.
    - "overallStrategy": A clear, high-level strategic directive for the entire team.
    - "keywords": An array of important phrases from your analysis to be highlighted.

    Global Strategic Context (what the market is doing): ${JSON.stringify(
      globalPatterns
    )}

    Team-wide Data:
    ---
    Total Pipeline Distribution: ${JSON.stringify(pipeline)}
    Top Performers (by open deals): ${JSON.stringify(performers)}
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
  const { id } = req.params;
  const lang = req.headers["accept-language"] || "en";
  console.log(
    `---> SUCCESS: Matched the /api/leads/:id/ai-summary route. Language: ${lang}`
  );
  const cacheKey = `lead-summary-${id}-${lang}`;

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


  const languageInstruction =
    lang === "ar"
      ? "IMPORTANT: Your entire response must be in a formal, high-class Egyptian Arabic dialect suitable for elite salespeople. All keys and values in the JSON must be in this Arabic. Use Direct Catching words, Your response should be Passive"
      : "IMPORTANT: Your entire response must be in a sharp, motivational sales language. All keys and values in the JSON must be in English.";

  const prompt = `
    You are a senior sales consultant preparing a pre-call briefing for a salesperson. Your analysis is sharp, concise, and focused on closing the deal.
    Analyze the provided lead data.
    The current date is ${new Date().toLocaleDateString()}.
    ${languageInstruction}

    Provide the output as a single, valid JSON object with ONLY these keys: "summary", "nextBestAction", "engagementApproach", "timingAdvice", "recommendedOffer".
    - "summary": A quick summary of the client's situation and temperature.
    - "nextBestAction": The single most effective next step to move this deal forward.
    - "engagementApproach": The exact tone and angle to use with this client (e.g., "Create urgency," "Build rapport," "Focus on investment value").
    - "timingAdvice": When to execute the next action (e.g., "Immediately," "End of day," "Wait for them to call").
    - "recommendedOffer": The specific property or deal structure to present.

    Global Strategic Context (what the market is doing): ${JSON.stringify(
      globalPatterns
    )}

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
