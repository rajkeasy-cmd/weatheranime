var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
var ai = new import_genai.GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
app.use(import_express.default.json({ limit: "15mb" }));
app.use(import_express.default.urlencoded({ limit: "15mb", extended: true }));
app.post("/api/detect-landmark", async (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image || !mimeType) {
      return res.status(400).json({ error: "Image data and mimeType are required for photo location search." });
    }
    const imagePart = {
      inlineData: {
        mimeType,
        data: image
      }
    };
    const promptText = `Analyze this photo. Identify the specific geographical landmark, place, monument, or natural attraction. If it's a generic city photo, determine the city/region context.
Produce a perfect JSON response with estimated latitude, longitude, and description.

Response Schema Requirements:
- landmarkName: The name of the landmark, monument, building, or natural attraction.
- city: The city or region.
- country: The country.
- latitude: Number. Standard floating-point latitude coordinate.
- longitude: Number. Standard floating-point longitude coordinate.
- description: A short, 1-2 sentence description explaining what the landmark is.
- funTrivia: A single sentence of extremely fascinating, engaging trivia or safety advice regarding this location.`;
    const responseSchema = {
      type: import_genai.Type.OBJECT,
      properties: {
        landmarkName: { type: import_genai.Type.STRING },
        city: { type: import_genai.Type.STRING },
        country: { type: import_genai.Type.STRING },
        latitude: { type: import_genai.Type.NUMBER },
        longitude: { type: import_genai.Type.NUMBER },
        description: { type: import_genai.Type.STRING },
        funTrivia: { type: import_genai.Type.STRING }
      },
      required: ["landmarkName", "city", "country", "latitude", "longitude", "description", "funTrivia"]
    };
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [imagePart, { text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema,
        systemInstruction: "You are an elite geographical landmark computer vision detector. Your job is to analyze photos, determine coordinates accurately, and output pure JSON matching the response schema."
      }
    });
    const textResult = response.text || "{}";
    res.json(JSON.parse(textResult.trim()));
  } catch (error) {
    console.error("Landmark detection failure:", error);
    res.status(500).json({ error: "Failed to read location from photo.", details: error.message });
  }
});
app.post("/api/analyze-commute", async (req, res) => {
  try {
    const { weather, events, homeLocation, transitMode } = req.body;
    if (!weather) {
      return res.status(400).json({ error: "Weather data is required" });
    }
    const prompt = `
      You are an expert route optimizer, weather analyst, and clothing stylist.
      Analyze the current local weather and user's upcoming commute schedule to provide tailored clothing recommendations, commute advisories, and optimized departure suggestions.

      User Home Location: ${homeLocation || "Current location"}
      Preferred Transit Mode: ${transitMode || "driving"}

      Current Hyper-local Weather:
      - Current Temperature: ${weather.temp}\xB0C (Feels like: ${weather.feelsLike}\xB0C)
      - Humidity: ${weather.humidity}%
      - Wind Speed: ${weather.windSpeed} km/h
      - UV Index: ${weather.uvIndex} (Warning if UV >= 6)
      - Rain Probability: ${weather.rainProbability}%
      - Condition: ${weather.conditionText || "Clear"}
      - Active Alerts: Rain probability is ${weather.rainProbability}%, UV index is ${weather.uvIndex}.

      Commute Schedule (Upcoming Google Calendar Events):
      ${events && events.length > 0 ? JSON.stringify(events.map((e) => ({
      title: e.title,
      location: e.location || "Virtual / No location specified",
      startTime: e.start,
      formattedTime: e.formattedTime
    }))) : "No upcoming location-based events scheduled for today."}

      Deliverables required:
      1. Clothing recommendations: Suggest comfortable layering, accessories (e.g., umbrella, sunglasses, hoodie), and general style depending on wind, rain, and temperature.
      2. Travel timeline calculation: For any schedule event with a physical location, estimate travel time from ${homeLocation || "current location"} via ${transitMode || "driving"}. Calculate recommended departure times so the user arrives 10 minutes early. Present any delay warnings if rain or high wind could affect transit.
      3. Weather alert: Check for rain risk & high UV and flag them explicitly.
    `;
    const responseSchema = {
      type: import_genai.Type.OBJECT,
      properties: {
        clothingSuggestion: {
          type: import_genai.Type.OBJECT,
          description: "Garment recommendations perfectly tuned for the current weather.",
          properties: {
            outfit: {
              type: import_genai.Type.STRING,
              description: "Short cohesive summary of what outfit to wear."
            },
            layers: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "Specific layers (e.g., inner shirt, light cardigan, jacket)."
            },
            accessories: {
              type: import_genai.Type.ARRAY,
              items: { type: import_genai.Type.STRING },
              description: "Weather guards (e.g., umbrella, direct polaroid sunglasses, spf 30 Sunblock, broad hats)."
            }
          },
          required: ["outfit", "layers", "accessories"]
        },
        commuteSummary: {
          type: import_genai.Type.STRING,
          description: "A short, professional, and comforting personal greeting detailing commute highlights, potential delays, and layout advice."
        },
        timeline: {
          type: import_genai.Type.ARRAY,
          items: {
            type: import_genai.Type.OBJECT,
            properties: {
              eventTitle: { type: import_genai.Type.STRING, description: "Name of the calendar event." },
              eventTime: { type: import_genai.Type.STRING, description: "Start time of the event." },
              calculatedDepartureTime: { type: import_genai.Type.STRING, description: "Optimized time to depart home/current location (e.g., '08:15 AM')." },
              travelDurationMinutes: { type: import_genai.Type.INTEGER, description: "Estimated transit duration in minutes." },
              recommendedTransitMode: { type: import_genai.Type.STRING, description: "Suggested transit option (e.g., Driving, Walking, Transit)." },
              delayWarning: { type: import_genai.Type.BOOLEAN, description: "True if rain, wind, or distance warrants warning the user to leave early." },
              weatherAlert: { type: import_genai.Type.STRING, description: "Precipitation or temperature notice specific to this departure slot." }
            },
            required: ["calculatedDepartureTime", "travelDurationMinutes", "recommendedTransitMode", "delayWarning"]
          },
          description: "Chronological travel advisory block mapping upcoming routes."
        }
      },
      required: ["clothingSuggestion", "commuteSummary", "timeline"]
    };
    const completion = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema,
        systemInstruction: "You are a polite, weather-savvy personal commute assistant. Always return pristine, parseable JSON aligned with the response schema. Never return markdown blocks wrapping the JSON."
      }
    });
    const summaryText = completion.text || "{}";
    res.json(JSON.parse(summaryText.trim()));
  } catch (error) {
    console.error("Gemini Assistant Core Fail:", error);
    res.status(500).json({ error: "Failed to generate smart commute planning.", details: error.message });
  }
});
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, weather, events, homeLocation, transitMode, persona } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    let systemInstruction = "";
    if (persona === "onepiece") {
      systemInstruction = `You are a combined interactive One Piece Anime Chat Bot Assistant roleplaying as Nami (the brilliant, money-loving Straw Hat weather navigator) and Luffy (the chaotic, meat-loving Straw Hat Captain)!
Your task is to advise the user on weather conditions, commute safety, and outfit stylings, but through the highly comedic and adventurous lens of One Piece!

CRITICAL: Keep your response extremely short, concise, and snappy. Do NOT write full essays under any circumstances. Limit response to maximum 1-2 quick lines of dialogue (e.g. Nami says one thing, Luffy shouts one thing). Get straight to the point in 30-40 words or less.

Please style your response under these guidelines:
- Nami takes weather navigation very seriously. He/She will map standard Celsius, wind speeds, or rain probabilities onto Grand Line weather patterns (e.g. cyclones, Aqua Laguna). She also loves money/Beli!
- Luffy will constantly barge in with ALL CAPS shouts, wondering if there's delicious meat, or suggesting wild Luffy stunts!
- Use short dialogues, like:
  Nami: "The wind is perfect today, but prep an umbrella!"
  Luffy: "[Luffy]: HOORAY! Meat party on deck!"
- Include brief sound effects in asterisks, e.g., *bonks Luffy*, *eyes turn to Beli signs*.`;
    } else {
      systemInstruction = `You are AuraCommute's companion weather & trip planning assistant chat bot.
Your role is to guide travelers on ideal outfits and commutes.

CRITICAL: Keep your response extremely short, quick, and concise. Do NOT write long essays, paragraphs, or lists. Limit response to maximum two sentences, or 35 words total. Be friendly, to the point, and brief.

Adhere strictly to these personality guidelines:
- Be polite, encouraging, and stylish. Use the 'Natural Tones' theme concepts where relevant to describe outfits.
- Speak in simple, non-intellectual, human, and clear terms.
- Never mention internal server coordinates, database keys, or API parameters.`;
    }
    if (weather) {
      systemInstruction += `

[Current Context Snapshot]:
- Target Location: ${weather.locationName || homeLocation || "Current City"}
- Temperature: ${weather.temp}\xB0C (Feels like ${weather.feelsLike}\xB0C)
- Weather Condition: ${weather.conditionText || "Unknown"}
- Wind Speed: ${weather.windSpeed} km/h
- Humidity: ${weather.humidity}%
- UV Radiation: ${weather.uvIndex} (Safe unless >= 6)
- Rain Chance: ${weather.rainProbability}%`;
    }
    if (events && events.length > 0) {
      systemInstruction += `
- Scheduled Travel Events: ${JSON.stringify(events.map((e) => ({
        title: e.title,
        location: e.location || "Virtual",
        time: e.formattedTime
      })))}`;
    }
    if (transitMode) {
      systemInstruction += `
- Selected Commute Style: ${transitMode}`;
    }
    const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach((turn) => {
        contents.push({
          role: turn.sender === "bot" ? "model" : "user",
          parts: [{ text: turn.text }]
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });
    const completion = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.85
      }
    });
    res.json({ text: completion.text || "I was unable to synthesize a response. Let me try that again!" });
  } catch (error) {
    console.error("Gemini Chat Failure:", error);
    res.status(500).json({ error: "Failed to process companion chat.", details: error.message });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Weather Assistant Server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
