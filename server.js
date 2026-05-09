const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();

// Security: Change '*' to your live frontend URL once deployed
app.use(cors({ origin: '*' })); 
app.use(express.json());

// Initialize Groq client
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

const ISAAHI_API_KEY = process.env.ISAAHI_API_KEY;

// --- 1. ISAAHI AUTHENTICATION ROUTE ---
async function verifyIsaahiToken(token) {
  const res = await fetch("https://59eec555-1dfe-42f5-8549-58dfb413b299.lovableproject.com/api/public/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: ISAAHI_API_KEY, token }),
  });
  
  const data = await res.json();
  if (!res.ok || !data.valid) throw new Error(data.error ?? "Invalid token");
  return data.user; 
}

app.post('/api/my-login', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "No token provided" });

    const user = await verifyIsaahiToken(token);
    res.json({ success: true, user });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// --- 2. GROQ WORLD GENERATION ROUTE ---
app.post('/api/generate-world', async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) return res.status(400).json({ error: "Please provide a world description prompt." });

    const chatCompletion = await groq.chat.completions.create({
      model: "llama3-8b-8192", 
      messages: [
        { 
          role: "system", 
          content: `You are an AI World Builder. Output STRICTLY a JSON object with no markdown or extra text. Use this exact structure:
          {
            "suns": <integer 0-3>,
            "terrainColor": "<hex code or standard color name>",
            "creatureType": "<'sphere', 'cube', or 'capsule'>",
            "atmosphere": "<'clear', 'foggy', 'toxic'>"
          }`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
    });

    const rawResponse = chatCompletion.choices[0].message.content;
    const worldData = JSON.parse(rawResponse);

    res.json({ success: true, worldData });
  } catch (error) {
    console.error("Groq Generation Error:", error);
    res.status(500).json({ error: "Failed to generate world." });
  }
});

// Export the app for Vercel instead of app.listen()
module.exports = app;
