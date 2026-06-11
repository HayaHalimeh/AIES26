// index.js
import cors from "cors";
import express from "express";
import { promises as fs } from "fs";
import path from "path";
import OpenAI from "openai";
import { fileURLToPath } from "url";
import { v4 as uuid } from "uuid";
import { initDb } from "./db.js";
import { mergeState, getState, getSlotKeysForPhase, normalizeSlotValue, advanceToPhase2, getPhase } from "./state.js";
import { callRecipeRecommender, formatRecipeText } from "./recommenderClient.js";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const BASE_DIR = path.dirname(__filename);

function buildControllerSchema(slotKeys) {
  const slotProperties = Object.fromEntries(
    slotKeys.map((key) => [key, { type: ["string", "null"] }])
  );

  return {
    type: "object",
    properties: {
      assistant_text: { type: "string" },
      action: {
        type: "string",
        enum: ["ask_next_question", "recommend", "survey", "end_conversation"],
      },
      slots: {
        type: "object",
        properties: slotProperties,
        required: slotKeys,
        additionalProperties: false,
      },
      missing_slots: {
        type: "array",
        items: {
          type: "string",
          enum: slotKeys,
        },
      },
    },
    required: ["assistant_text", "action", "slots", "missing_slots"],
    additionalProperties: false,
  };
}

function safeParseController(raw, slotKeys, fallbackText) {
  const fallback = {
    assistant_text: fallbackText,
    action: "ask_next_question",
    slots: Object.fromEntries(slotKeys.map((key) => [key, null])),
    missing_slots: slotKeys,
  };

  const isValid = (obj) => {
    if (!obj || typeof obj !== "object") return false;
    if (typeof obj.assistant_text !== "string") return false;
    if (!["ask_next_question", "recommend", "survey", "end_conversation"].includes(obj.action)) return false;

    if (!obj.slots || typeof obj.slots !== "object") return false;
    for (const key of slotKeys) {
      const value = obj.slots[key];
      if (!(typeof value === "string" || value === null)) return false;
    }

    if (!Array.isArray(obj.missing_slots)) return false;
    for (const key of obj.missing_slots) {
      if (!slotKeys.includes(key)) return false;
    }

    return true;
  };

  if (raw == null) return fallback;

  if (typeof raw === "object") return isValid(raw) ? raw : fallback;

  if (typeof raw === "string") {
    try {
      const parsedOnce = JSON.parse(raw);
      if (isValid(parsedOnce)) return parsedOnce;

      if (parsedOnce && typeof parsedOnce === "object" && typeof parsedOnce.text === "string") {
        try {
          const parsedTwice = JSON.parse(parsedOnce.text);
          return isValid(parsedTwice) ? parsedTwice : fallback;
        } catch {
          return fallback;
        }
      }

      return fallback;
    } catch {
      return fallback;
    }
  }

  return fallback;
}


const db = await initDb();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "-",
});






async function saveRecommendations(db, conversationId, assistantMessageId, recipes) {
  const toText = (v) => (v == null ? null : String(v));

  for (let i = 0; i < recipes.length; i++) {
    const r = recipes[i] || {};

    const recipeTitle = r.name ?? r.title ?? r.recipe_name ?? null;

    await db.run(
      `INSERT INTO recipe_recommendations
       (id, conversation_id, assistant_message_id, rank, recipe_title, total_time, dish_type, complexity, distance, raw_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuid(),
        conversationId,
        assistantMessageId,
        i + 1,
        toText(recipeTitle),
        toText(r.total ?? r.total_time ?? null),
        toText(r.dish_type_normalised ?? r.dish_type ?? null),
        toText(r.ingredient_count ?? null),
        r._knn_distance ?? r.distance ?? null,
        JSON.stringify(r),
      ]
    );
  }
}


const app = express();
app.use(express.json());
app.use(cors());
const port = process.env.PORT || 3000;

// Load main system prompt from file once at startup
const SYSTEM_PROMPT_PATH = path.join(BASE_DIR, "prompts", "system_prompt.txt");
let SYSTEM_PROMPT = "";
try {
  SYSTEM_PROMPT = await fs.readFile(SYSTEM_PROMPT_PATH, "utf8");
  console.log(`Loaded system prompt from ${SYSTEM_PROMPT_PATH}`);
} catch (e) {
  console.warn(
    `Could not read system_prompt.txt at ${SYSTEM_PROMPT_PATH}. Falling back to a minimal prompt.`
  );
  SYSTEM_PROMPT = "You are a personal recipe assistant. Output only valid JSON matching the schema.";
}

// Load phase 2 system prompt (returning user, no re-introduction)
const PHASE2_PROMPT_PATH = path.join(BASE_DIR, "prompts", "additional_prompt_phase2.txt");
let PHASE2_PROMPT = "";
try {
  PHASE2_PROMPT = await fs.readFile(PHASE2_PROMPT_PATH, "utf8");
  console.log(`Loaded phase 2 prompt from ${PHASE2_PROMPT_PATH}`);
} catch (e) {
  console.warn(`Could not read ${PHASE2_PROMPT_PATH}. Phase 2 will use main prompt.`);
  PHASE2_PROMPT = SYSTEM_PROMPT;
}


// Serve recipe images from data/recipe_images/
app.use(
  "/recipe-images",
  express.static(path.join(BASE_DIR, "data", "recipe_images"))
);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/health", (_, res) => res.status(200).send("ok"));

app.post("/chat", async (req, res) => {
  try {
    console.log("Received chat request:", req.body);
    const { message: userMessage, conversationId: clientConversationId, prolificPid } = req.body;

    if (!userMessage) {
      res.send({
        messages: [
          {
            role: "assistant",
            text: "Hello! I'm Alex, your personal recipe assistant. Before we start, what should I call you?",
          },
        ],
      });
      return;
    }

    if (openai.apiKey === "-") {
      res.send({
        messages: [
          {
            role: "assistant",
            text: "OpenAI API key is not configured!",
          },
        ],
      });
      return;
    }

    // Create/reuse conversation
    let conversationId = clientConversationId;
    if (!conversationId) {
      conversationId = uuid();
      await db.run(
        `INSERT INTO conversations (conversation_id, prolific_pid) VALUES (?, ?)`,
        [conversationId, prolificPid ?? null]
      );
      // Seed greeting so the LLM always has opening context
      await db.run(
        `INSERT INTO messages (id, conversation_id, role, text) VALUES (?, ?, 'assistant', ?)`,
        [uuid(), conversationId, "Hello! I'm Alex, your personal recipe assistant. Before we start, what should I call you?"]
      );
    }

    // Save user message
    await db.run(
      `INSERT INTO messages (id, conversation_id, role, text)
       VALUES (?, ?, ?, ?)`,
      [uuid(), conversationId, "user", userMessage]
    );

    // Fetch conversation history (text-only)
    const history = await db.all(
      `SELECT role, text FROM messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC`,
      [conversationId]
    );

    // Fetch current slot state (optional context for the model)
    const state = await getState(db, conversationId);
    const phase = state.task_phase ?? 1;
    const slotKeys = getSlotKeysForPhase(phase);
    const fallbackQuestion = phase === 2
      ? "Sorry, I had trouble understanding that. Could you tell me more about what you are looking for?"
      : "Sorry, I had trouble understanding that. What type of dish are you looking for?";


    const response = await openai.responses.create({
      model: "gpt-5.2",
      max_output_tokens: 700,
      text: {
        format: {
          type: "json_schema",
          name: "recipe_controller",
          schema: buildControllerSchema(slotKeys),
          strict: true,
        },
      },
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        ...(phase === 2 ? [{ role: "system", content: PHASE2_PROMPT }] : []),
        {
          role: "system",
          content: `Current slot state (may be nulls): ${JSON.stringify(state)}. Current task phase: ${phase}.`,
        },
        ...history.map((m) => ({ role: m.role, content: m.text })),
      ],
    });

    const rawOutput = response.output_text;
    const controller = safeParseController(rawOutput, slotKeys, fallbackQuestion);

    if (controller.assistant_text?.startsWith("Sorry, I had trouble understanding")) {
      console.warn("OpenAI output_text (unparsed):", rawOutput);
    }

    // Merge slots into persistent state
    const mergedSlots = await mergeState(db, conversationId, controller.slots);

    // Build outgoing assistant messages
    let outgoing = [
      {
        text: controller.assistant_text ?? "",
      },
    ];

    // If survey → show inline survey overlay.
    if (controller.action === "survey") {
      const surveyResponse = await openai.responses.create({
        model: "gpt-5.2",
        max_output_tokens: 300,
        text: {
          format: {
            type: "json_schema",
            name: "survey_presentation",
            schema: {
              type: "object",
              properties: {
                assistant_text: { type: "string" },
              },
              required: ["assistant_text"],
              additionalProperties: false,
            },
            strict: true,
          },
        },
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          ...(phase === 2 ? [{ role: "system", content: PHASE2_PROMPT }] : []),
          ...history.map((m) => ({ role: m.role, content: m.text })),
        ],
      });

      let surveyText = controller.assistant_text ?? "";
      try {
        const parsed = JSON.parse(surveyResponse.output_text);
        if (parsed.assistant_text) surveyText = parsed.assistant_text;
      } catch { /* use controller text */ }

      outgoing[0].text = surveyText;
      outgoing[0].showSurvey = true;
      outgoing[0].surveyPhase = phase;
    }

    // If recommend, call the right recommender based on phase
    if (controller.action === "recommend") {
      const allFilled = slotKeys.every((k) => normalizeSlotValue(mergedSlots[k]) !== null);

      if (!allFilled) {
        const missing = slotKeys.filter((k) => normalizeSlotValue(mergedSlots[k]) === null);
        outgoing = [
          {
            text: `Quick question: what ${missing[0].replace("_", " ")} are you looking for?`,
          },
        ];
      } else {
        let recPayload;
        try {
          recPayload = await callRecipeRecommender(mergedSlots, phase, 3);
        } catch (e) {
          console.error("Recommender error:", e);
          outgoing.push({
            text: "I had trouble generating recommendations from the dataset. Can you try rephrasing your preferences?",
          });
          recPayload = null;
        }

        if (recPayload?.recipes) {
          outgoing[0] = {
            text: controller.assistant_text ?? "Here are your recipe recommendations!",
            _recipes: recPayload.recipes,
          };
        }
      }
    }

    console.log("Controller from LLM:", controller);
    console.log("Merged slots:", mergedSlots, "Phase:", phase);

    const messages = await Promise.all(
      outgoing.map(async (message) => {
        const messageId = uuid();

        // Persist in DB
        await db.run(
          `INSERT INTO messages
           (id, conversation_id, role, text)
           VALUES (?, ?, 'assistant', ?)`,
          [messageId, conversationId, message.text]
        );

        // Save recipe recommendations if this message carries them
        const recipes = message._recipes || null;
        if (message._recipes) {
          await saveRecommendations(db, conversationId, messageId, message._recipes);
          delete message._recipes;
        }

        return { role: "assistant", text: message.text, recipes, showSurvey: message.showSurvey || false, surveyPhase: message.surveyPhase || null };
      })
    );

    res.send({ messages, conversationId, phase });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Something went wrong generating the reply." });
  }
});

app.post("/survey", async (req, res) => {
  try {
    const { conversationId, phase, responses, timing } = req.body;
    if (!conversationId || !phase || !responses) {
      return res.status(400).send({ error: "conversationId, phase, and responses are required." });
    }

    await db.run(
      `INSERT INTO survey_responses (id, conversation_id, phase, responses, timing) VALUES (?, ?, ?, ?, ?)`,
      [uuid(), conversationId, phase, JSON.stringify(responses), timing ? JSON.stringify(timing) : null]
    );

    if (phase === 1) {
      await advanceToPhase2(db, conversationId);

      const triggerText = "The user has completed the first survey and is ready for the second recipe task.";
      await db.run(
        `INSERT INTO messages (id, conversation_id, role, text) VALUES (?, ?, 'user', ?)`,
        [uuid(), conversationId, triggerText]
      );

      const history = await db.all(
        `SELECT role, text FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
        [conversationId]
      );
      const state = await getState(db, conversationId);
      const phase2SlotKeys = getSlotKeysForPhase(2);

      const response = await openai.responses.create({
        model: "gpt-5.2",
        max_output_tokens: 700,
        text: {
          format: {
            type: "json_schema",
            name: "recipe_controller",
            schema: buildControllerSchema(phase2SlotKeys),
            strict: true,
          },
        },
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "system", content: PHASE2_PROMPT },
          {
            role: "system",
            content: `Current slot state (may be nulls): ${JSON.stringify(state)}. Current task phase: 2. This is the very first message of the second task – greet the user warmly and start the conversation.`,
          },
          ...history.map((m) => ({ role: m.role, content: m.text })),
        ],
      });

      const fallback = "Welcome back! Let's find you some more great recipes. What type of dish are you looking for?";
      const parsed = safeParseController(response.output_text, phase2SlotKeys, fallback);
      const phase2Text = parsed.assistant_text || fallback;

      const msgId = uuid();
      await db.run(
        `INSERT INTO messages (id, conversation_id, role, text) VALUES (?, ?, 'assistant', ?)`,
        [msgId, conversationId, phase2Text]
      );

      return res.send({
        success: true,
        messages: [{ role: "assistant", text: phase2Text }],
        conversationId,
        phase: 2,
      });
    }

    return res.send({ success: true, conversationId, phase });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Failed to save survey responses." });
  }
});

app.listen(port, () => {
  console.log(`AI Assistant listening on port ${port}`);
});