import { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { loadSession, saveSession } from "./useSession";

const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ChatContext = createContext();

const extractLinksByLineAndClean = (rawText) => {
  const text = String(rawText ?? "");
  const lines = text.split("\n");

  const mdLinkRegex = /\[View Recipe\]\((https?:\/\/[^\s)]+)\)/gi;
  const urlRegex = /(https?:\/\/[^\s)]+)/g;

  const linksByLine = [];
  const cleanedLines = lines.map((line) => {
    const urls = [];

    // Extract markdown links
    let m;
    while ((m = mdLinkRegex.exec(line)) !== null) {
      urls.push(m[1]);
    }

    // Remove markdown syntax from visible text
    let cleaned = line.replace(mdLinkRegex, "").trim();

    // Extract raw urls (if any remain)
    const rawUrls = cleaned.match(urlRegex) || [];
    rawUrls.forEach((u) => urls.push(u));

    // Remove raw urls from visible text
    cleaned = cleaned.replace(urlRegex, "").trim();

    // Clean dangling separators like "—" or "-"
    cleaned = cleaned.replace(/\s*[—-]\s*$/g, "").trim();
    cleaned = cleaned.replace(/\s{2,}/g, " ");

    // De-dupe urls (per line)
    const deduped = Array.from(new Set(urls));

    linksByLine.push(deduped);
    return cleaned;
  });

  return {
    cleanedText: cleanedLines.join("\n").trim(),
    linksByLine,
  };
};


export const ChatProvider = ({ children }) => {
  const _saved = loadSession();

  const [conversationId, setConversationId] = useState(_saved?.conversationId ?? null);

  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [cameraZoomed, setCameraZoomed] = useState(true);

  const [phase, setPhase] = useState(_saved?.phase ?? 1);

  // Persist chat-level state on every change
  useEffect(() => {
    saveSession({ ...(loadSession() ?? {}), conversationId, phase });
  }, [conversationId, phase]);

  const [soundEnabled, setSoundEnabled] = useState(false);

  const enableSound = async () => {
    try {
      const a = new Audio("data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAA...");
      a.muted = true;
      await a.play();
      setTimeout(() => {
        a.pause();
        a.remove();
      }, 0);
      setSoundEnabled(true);
    } catch (e) {
      console.error("Audio unlock failed:", e);
    }
  };

  const prolificPid = new URLSearchParams(window.location.search).get("PROLIFIC_PID") ?? undefined;

  const chat = async (text) => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, prolificPid }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create conversation. HTTP ${res.status}`);
      }

      const res_json = await res.json();

      if (!conversationId && res_json.conversationId) {
        setConversationId(res_json.conversationId);
      }

      if (res_json.phase != null) setPhase(res_json.phase);

      if (Array.isArray(res_json.messages) && res_json.messages.length) {
        const MAX_QUEUE = 50;
        const incoming = res_json.messages.map((m) => {
          if (m?.role === "assistant" && typeof m.text === "string") {
            return { ...m, showSurvey: m.showSurvey || false, surveyPhase: m.surveyPhase || null };
          }
          return m;
        });
        setMessages((prev) => [...prev, ...incoming].slice(-MAX_QUEUE));
      }
    } catch (e) {
      console.error("chat() error:", e);
    } finally {
      setLoading(false);
    }
  };

  const submitSurvey = async (surveyPhase, responses, timing) => {
    try {
      const res = await fetch(`${backendUrl}/survey`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, phase: surveyPhase, responses, timing }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.phase != null) setPhase(data.phase);
      if (Array.isArray(data.messages) && data.messages.length) {
        const incoming = data.messages.map((m) => {
          if (m?.role === "assistant" && typeof m.text === "string") {
            return { ...m, showSurvey: false, surveyPhase: null };
          }
          return m;
        });
        setMessages((prev) => [...prev, ...incoming].slice(-50));
      }
      return data;
    } catch (e) {
      console.error("submitSurvey() error:", e);
    }
  };

  const onMessagePlayed = useCallback(() => {
    setMessages((prev) => prev.slice(1));
  }, []);

  useEffect(() => {
    setMessage(messages.length ? messages[0] : null);
  }, [messages]);

  /* ---- Show text only after TTS finishes ---- */
  const [showText, setShowText] = useState(false);

  // Reset when message changes
  useEffect(() => {
    if (!message) {
      setShowText(false);
    } else if (!message.audio || message.local) {
      // No audio → show text immediately
      setShowText(true);
    } else {
      setShowText(false);
    }
  }, [message]);

  // Called by Avatar when audio.onended fires (before advancing queue)
  const onShowTextAfterAudio = useCallback(() => {
    setShowText(true);
  }, []);

  return (
    <ChatContext.Provider
      value={{
        chat,
        message,
        showText,
        onMessagePlayed,
        onShowTextAfterAudio,
        loading,
        cameraZoomed,
        setCameraZoomed,
        conversationId,
        setConversationId,
        soundEnabled,
        enableSound,
        phase,
        submitSurvey,
        backendUrl,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};