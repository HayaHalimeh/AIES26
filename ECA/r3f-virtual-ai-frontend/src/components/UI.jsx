import { useRef, useEffect, useMemo, useState } from "react";
import { useChat } from "../hooks/useChat";
import { Canvas } from "@react-three/fiber";
import { Experience } from "./Experience";
import { SurveyOverlay } from "./SurveyOverlay";
import { WelcomeOverlay } from "./WelcomeOverlay";
import { loadSession, saveSession } from "../hooks/useSession";
import { lipsyncManager } from "../App";

/* ---------- Recipe detail modal ---------- */
const RecipeModal = ({ recipe, backendUrl, onClose }) => {
  if (!recipe) return null;

  const imagePath = recipe.image_path ?? recipe.image_path_x ?? recipe.image_path_y ?? null;
  const filename  = imagePath ? imagePath.replace(/^recipe_images\//, "") : null;
  const imageUrl  = filename ? `${backendUrl}/recipe-images/${filename}` : null;
  const name      = recipe.name ?? recipe.title ?? "Recipe";

  const ingredients = recipe.ingredients
    ? String(recipe.ingredients).split(";").map((s) => s.trim()).filter(Boolean)
    : [];

  const steps = recipe.directions
    ? String(recipe.directions).split(/(?<=\.)\s+/).map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-[99999] grid place-items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className="relative z-10 w-[90%] max-w-2xl max-h-[80vh] flex flex-col rounded-3xl overflow-hidden bg-white/90 backdrop-blur-xl border border-stone-200/60 text-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {imageUrl && (
          <div className="h-52 flex-shrink-0 overflow-hidden">
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 leading-snug">{name}</h2>
          {ingredients.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">Ingredients</h3>
              <ul className="space-y-2">
                {ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-stone-400 flex-shrink-0" />
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ingredients.length > 0 && steps.length > 0 && <div className="border-t border-stone-200" />}
          {steps.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">Instructions</h3>
              <ol className="space-y-4">
                {steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-xs font-bold text-stone-500">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 px-6 py-4 border-t border-stone-200/80 bg-white/60">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-sm font-semibold text-gray-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ---------- Bigger round-style bubble (with inline links per line) ---------- */
const parseLine = (line) => {
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi;
  const urlRegex = /(https?:\/\/[^\s)]+)/g;

  const links = []; // { label, url }

  // ✅ reset lastIndex safety if reused anywhere
  mdLinkRegex.lastIndex = 0;

  // 1) extract markdown links with their labels
  let m;
  while ((m = mdLinkRegex.exec(line)) !== null) {
    links.push({ label: m[1], url: m[2] });
  }

  // 2) remove markdown tokens
  let cleaned = line.replace(mdLinkRegex, "").trim();

  // 3) extract raw urls (if present)
  const rawUrls = cleaned.match(urlRegex) || [];
  rawUrls.forEach((u) => links.push({ label: "Link", url: u }));

  // 4) remove raw urls
  cleaned = cleaned.replace(urlRegex, "").trim();

  // 5) cleanup dangling separators
  cleaned = cleaned.replace(/\s*[—-]\s*$/g, "").trim();
  cleaned = cleaned.replace(/\s{2,}/g, " ");

  // De-dupe by url
  const seen = new Set();
  const deduped = links.filter((l) => {
    if (seen.has(l.url)) return false;
    seen.add(l.url);
    return true;
  });

  return { cleaned, links: deduped };
};

const Bubble = ({ role, text, onLinkClick }) => {
  const isUser = role === "user";
  const lines = String(text ?? "").split("\n");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[80%]",
          "rounded-3xl",
          "px-6 py-4",
          "backdrop-blur-xl",
          "shadow-2xl",
          "border",
          isUser
            ? "bg-white/85 text-gray-900 border-white/40"
            : "bg-black/55 text-white border-white/20",
        ].join(" ")}
      >
        <div className="text-[16px] leading-relaxed space-y-2">
          {lines.map((line, idx) => {
            const { cleaned, links } = parseLine(line);

            return (
              <p key={idx}>
                <span className="whitespace-pre-wrap">{cleaned}</span>
                {links.length > 0 && (
                  <span className="block mt-1">
                    {links.map((link, i) => {
                      return (
                        <a
                          key={i}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => onLinkClick?.()}
                          className={[
                            "inline-flex items-center",
                            "mr-2",
                            "px-3 py-1",
                            "rounded-full",
                            "text-sm font-semibold",
                            "border",
                            isUser
                              ? "bg-gray-900/5 text-gray-900 border-gray-900/10 hover:bg-gray-900/10"
                              : "bg-white/10 text-white border-white/20 hover:bg-white/20",
                            "transition",
                          ].join(" ")}
                        >
                          {link.label}
                        </a>
                      );
                    })}
                  </span>
                )}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ---------- System notice ---------- */
const SystemNotice = ({ text, onSubmitCode }) => {
  const [code, setCode] = useState("");

  const submit = () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    onSubmitCode?.(trimmed);
    setCode("");
  };

  return (
    <div className="flex justify-center">
      <div className="flex flex-col gap-3 px-5 py-4 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white/90 text-base shadow-md max-w-[70%] w-full">
        <div className="flex items-center gap-2.5">
          <span className="text-white/60 text-xs font-semibold uppercase tracking-widest flex-shrink-0">System</span>
          <span className="w-px h-4 bg-white/30 flex-shrink-0" />
          <span>{text}</span>
        </div>
        {onSubmitCode && (
          <div className="flex items-center gap-2">
            <input
              className="flex-1 bg-white/80 border border-white/30 rounded-xl px-4 py-2 text-gray-900 placeholder:text-gray-400 outline-none text-base"
              placeholder="Enter code…"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            />
            <button
              onClick={submit}
              className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 font-semibold text-base transition"
            >
              Submit
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---------- Recipe cards (3 side-by-side) ---------- */
const RecipeCard = ({ recipe, backendUrl, onViewRecipe }) => {
  const imagePath = recipe.image_path ?? recipe.image_path_x ?? recipe.image_path_y ?? null;
  const filename  = imagePath ? imagePath.replace(/^recipe_images\//, "") : null;
  const imageUrl  = filename ? `${backendUrl}/recipe-images/${filename}` : null;

  const fmt      = (v, dec = 1) => (v != null && !isNaN(v) ? Number(v).toFixed(dec) : "—");
  const name     = recipe.name ?? recipe.title ?? "Recipe";
  const time     = recipe.total ?? null;
  const ingCount = recipe.ingredient_count ?? null;

  const fsaLabel = (val) => {
    const v = String(val ?? "").toLowerCase().trim();
    if (v === "green")  return { text: "Low",    bg: "bg-green-500/70"  };
    if (v === "amber")  return { text: "Medium", bg: "bg-amber-500/70"  };
    if (v === "red")    return { text: "High",   bg: "bg-red-500/70"    };
    return { text: "—", bg: "bg-white/10" };
  };

  const NutrBlock = ({ label, value, unit, fsa }) => {
    const { text, bg } = fsaLabel(fsa);
    return (
      <div className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-center ${bg}`}>
        <span className="text-xs text-white/80 font-medium">{label}</span>
        <span className="text-sm font-bold text-white">{value}{unit}</span>
        <span className="text-xs text-white/90">{text}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden bg-black/55 border border-white/20 backdrop-blur-xl shadow-2xl text-white w-full">
      {/* Image */}
      <div className="h-28 bg-white/10 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white/30 text-sm">No image</span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-3 flex-1">
        {/* Name */}
        <p className="font-semibold text-[15px] leading-snug line-clamp-2">{name}</p>

        {/* Time + ingredients */}
        <div className="flex items-center gap-4 text-sm text-white/80">
          {time      && <span>⏱ {time}</span>}
          {ingCount != null && <span>🥄 {ingCount} ingredients</span>}
        </div>

        {/* Divider */}
        <div className="border-t border-white/20" />

        {/* Nutrition */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-white/80">Calories</span>
            <span className="text-sm font-bold text-white">{fmt(recipe.calories, 0)} kcal</span>
          </div>
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wide mb-2">
            Nutrition per 100g
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            <NutrBlock label="Fat"     value={fmt(recipe.fat_100g)}    unit="g" fsa={recipe.fat_fsa} />
            <NutrBlock label="Sat fat" value={fmt(recipe.satfat_100g)} unit="g" fsa={recipe.satfat_fsa} />
            <NutrBlock label="Sugar"   value={fmt(recipe.sugars_100g)} unit="g" fsa={recipe.sugars_fsa} />
            <NutrBlock label="Salt"    value={fmt(recipe.salt_100g)}   unit="g" fsa={recipe.salt_fsa} />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/20" />

        {/* View Recipe button */}
        <button
          onClick={onViewRecipe}
          className="mt-auto inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-semibold transition"
        >
          View Recipe
        </button>
      </div>
    </div>
  );
};

const RecipeCards = ({ recipes, backendUrl, onViewRecipe }) => {
  if (!Array.isArray(recipes) || recipes.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-4 w-full">
      {recipes.map((r, i) => (
        <RecipeCard key={i} recipe={r} backendUrl={backendUrl} onViewRecipe={() => onViewRecipe(r)} />
      ))}
    </div>
  );
};

/* ---------- Typing dots indicator ---------- */
const TypingDots = () => (
  <div className="flex justify-start">
    <div className="rounded-3xl px-6 py-4 backdrop-blur-xl shadow-2xl border bg-black/55 border-white/20">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-white/70 animate-bounce [animation-delay:0ms]"></span>
        <span className="w-2 h-2 rounded-full bg-white/70 animate-bounce [animation-delay:150ms]"></span>
        <span className="w-2 h-2 rounded-full bg-white/70 animate-bounce [animation-delay:300ms]"></span>
      </div>
    </div>
  </div>
);

/* ---------- Fullscreen overlay messages ---------- */
const AvatarOverlayMessages = ({ thread, liveMessage, loading, onLinkClick, backendUrl, onViewRecipe, onDone, onOpenSurvey }) => {
  const visible = thread.slice(-1);
  const lastHasRecipes = visible.at(-1)?.recipes != null;

  return (
    <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 w-[96%] max-w-6xl px-6">
      <div className="w-full flex flex-col justify-end space-y-3">
        {visible.map((m, i) => (
          <div key={i}>
            {m.isSystem ? (
              <SystemNotice text={m.text} />
            ) : (
              <Bubble
                role={m.role}
                text={m.text}
                onLinkClick={onLinkClick}
              />
            )}
            {m.recipes && (
              <div className="mt-3 space-y-3">
                <RecipeCards recipes={m.recipes} backendUrl={backendUrl} onViewRecipe={onViewRecipe} />
                {i === visible.length - 1 && lastHasRecipes && (
                  <div className="flex justify-center">
                    <button
                      onClick={onDone}
                      className="px-8 py-3 rounded-2xl font-semibold text-gray-700 bg-white/85 hover:bg-white backdrop-blur-xl border border-stone-200/60 shadow-xl active:scale-[0.98] transition"
                    >
                      Done Exploring Recipes
                    </button>
                  </div>
                )}
              </div>
            )}
            {m.showSurvey && (
              <div className="flex justify-center mt-3">
                <button
                  onClick={() => onOpenSurvey?.({ phase: m.surveyPhase })}
                  className="px-8 py-3 rounded-2xl font-semibold text-gray-700 bg-white/85 hover:bg-white backdrop-blur-xl border border-stone-200/60 shadow-xl active:scale-[0.98] transition"
                >
                  Continue to Survey →
                </button>
              </div>
            )}
          </div>
        ))}

        {liveMessage?.text ? (
          <Bubble
            role="assistant"
            text={liveMessage.text}
            onLinkClick={onLinkClick}
          />
        ) : null}

        {loading && !liveMessage?.text && <TypingDots />}
      </div>
    </div>
  );
};

export const UI = ({ hidden, ...props }) => {
  const input = useRef();

  // Fullscreen from start
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isAvatarFullscreen, setIsAvatarFullscreen] = useState(true);

  const _uiSaved = loadSession();

  const [thread, setThread] = useState(() => _uiSaved?.thread ?? []);
  const [modalRecipe, setModalRecipe] = useState(null);
  const [hasClickedRecipe, setHasClickedRecipe] = useState(false);
  const [activeSurvey, setActiveSurvey] = useState(() => _uiSaved?.activeSurvey ?? null);
  const [conversationEnded, setConversationEnded] = useState(() => _uiSaved?.conversationEnded ?? false);
  const [doneExploringCount, setDoneExploringCount] = useState(() => _uiSaved?.doneExploringCount ?? 0);
  const [conversationStarted, setConversationStarted] = useState(() => _uiSaved?.conversationStarted ?? false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => _uiSaved?.welcomeDismissed ?? false);
  const messagesEndRef = useRef(null);
  const studyStartedAt = useRef(_uiSaved?.studyStartedAt ?? null);
  const phase2StartedAt = useRef(_uiSaved?.phase2StartedAt ?? null);

  // Store the last assistant message object (includes linksByLine) while it is being "played"/streamed
  const lastAssistantMsgRef = useRef(null);

  // Persist UI state on every relevant change.
  // Strip full recipe arrays from thread (they can be large) — keep a boolean
  // so recipeGroupCount logic still works on restore.
  useEffect(() => {
    const lightThread = thread.map((m) =>
      m.recipes ? { ...m, recipes: true } : m
    );
    saveSession({
      ...(loadSession() ?? {}),
      thread: lightThread,
      activeSurvey,
      conversationEnded,
      doneExploringCount,
      conversationStarted,
      welcomeDismissed,
      studyStartedAt: studyStartedAt.current,
      phase2StartedAt: phase2StartedAt.current,
    });
  }, [thread, activeSurvey, conversationEnded, doneExploringCount, conversationStarted, welcomeDismissed]);

  const recipeGroupCount = useMemo(() => thread.filter((m) => m.recipes).length, [thread]);
  const hasRecipeLinks = recipeGroupCount > 0;

  const {
    chat,
    loading,
    cameraZoomed,
    setCameraZoomed,
    message, // current queued message object from useChat (assistant)
    showText,
    soundEnabled,
    enableSound,
    phase,
    submitSurvey,
    backendUrl,
  } = useChat();

  // Phase-aware survey and recipe blocking
  const surveyCount = useMemo(() => thread.filter((m) => m.showSurvey).length, [thread]);
  const currentPhaseSurveyShown = phase === 1 ? surveyCount >= 1 : surveyCount >= 2;
  const exploringRecipes = recipeGroupCount > doneExploringCount && !currentPhaseSurveyShown;
  const pendingSurvey = currentPhaseSurveyShown && activeSurvey === null && !conversationEnded;
  const inputBlocked = exploringRecipes || pendingSurvey || activeSurvey !== null || conversationEnded;

  // Reset hasClickedRecipe when phase changes
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (phase !== prevPhaseRef.current) {
      prevPhaseRef.current = phase;
      setHasClickedRecipe(false);
    }
  }, [phase]);

  const sendMessage = async () => {
    const text = input.current.value;
    if (!loading && !message && !inputBlocked && text.trim() !== "") {
      setThread((t) => [...t, { role: "user", text }]);
      chat(text);
      input.current.value = "";
    }
  };

  // Capture assistant message object and commit to thread when it finishes (message becomes null)
  useEffect(() => {
    // If switching directly from one assistant message to another (no null gap),
    // commit the previous one first so it doesn't get lost.
    if (message?.text && lastAssistantMsgRef.current && lastAssistantMsgRef.current !== message) {
      const pending = lastAssistantMsgRef.current;
      const isSystem = pending.role === "system";
      setThread((t) => [
        ...t,
        {
          role: pending.role || "assistant",
          text: pending.text,
          linksByLine: pending.linksByLine || [],
          recipes: pending.recipes || null,
          showSurvey: pending.showSurvey || false,
          surveyPhase: pending.surveyPhase || null,
          isSystem,
        },
      ]);
    }

    if (message?.text) {
      lastAssistantMsgRef.current = message;
    }

    if (!message && lastAssistantMsgRef.current) {
      const finalMsg = lastAssistantMsgRef.current;
      lastAssistantMsgRef.current = null;
      const isSystem = finalMsg.role === "system";

      setThread((t) => [
        ...t,
        {
          role: finalMsg.role || "assistant",
          text: finalMsg.text,
          linksByLine: finalMsg.linksByLine || [],
          recipes: finalMsg.recipes || null,
          showSurvey: finalMsg.showSurvey || false,
          surveyPhase: finalMsg.surveyPhase || null,
          isSystem,
        },
      ]);
    }
  }, [message]);

  // autoscroll (still useful in non-full mode)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread, message]);

  // unlock audio on first gesture
  useEffect(() => {
    if (soundEnabled) return;

    const onFirstGesture = async () => {
      try {
        await enableSound();
      } catch {}
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
      window.removeEventListener("touchstart", onFirstGesture);
    };

    window.addEventListener("pointerdown", onFirstGesture);
    window.addEventListener("keydown", onFirstGesture);
    window.addEventListener("touchstart", onFirstGesture, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
      window.removeEventListener("touchstart", onFirstGesture);
    };
  }, [soundEnabled, enableSound]);

  if (hidden) return null;

  const isFull = isPanelOpen && isAvatarFullscreen;

  // Lock scroll when fullscreen
  useEffect(() => {
    if (!isFull) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFull]);

  /* ---------------- FULLSCREEN: avatar-only mode ---------------- */
  if (isFull) {
    return (
      <div className="fixed inset-0 z-[9999] overflow-hidden">
        {/* Background */}
        <img
          src="/kitchen.png"
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover blur-sm scale-105 brightness-90"
        />
        <div className="absolute inset-0 bg-black/30" />

        {/* Avatar Canvas */}
        <Canvas
          camera={{ fov: 28, position: [0, 2.2, 4] }}
          gl={{ alpha: true, antialias: true }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
          className="absolute inset-0 w-full h-full"
        >
          <Experience />
        </Canvas>

        {/* Welcome screen — shown until dismissed */}
        {!welcomeDismissed && (
          <WelcomeOverlay onNext={() => {
            // Resume the WebAudio context synchronously during this user gesture so
            // the greeting TTS can play when the fetch response arrives.
            try { lipsyncManager.audioContext?.resume(); } catch {}
            setWelcomeDismissed(true);
            setConversationStarted(true);
            studyStartedAt.current = Date.now();
            saveSession({ ...(loadSession() ?? {}), studyStartedAt: studyStartedAt.current });
            chat("");
          }} />
        )}

        {/* Message bubbles overlay (user + assistant) */}
        <AvatarOverlayMessages
          thread={thread}
          liveMessage={showText ? message : null}
          loading={loading}
          onLinkClick={() => setHasClickedRecipe(true)}
          backendUrl={backendUrl}
          onViewRecipe={(r) => { setModalRecipe(r); setHasClickedRecipe(true); }}
          onDone={() => {
            if (loading) return;
            setDoneExploringCount((c) => c + 1);
            chat("done");
          }}
          onOpenSurvey={(survey) => setActiveSurvey(survey)}
        />

        {/* Recipe detail modal */}
        {modalRecipe && (
          <RecipeModal recipe={modalRecipe} backendUrl={backendUrl} onClose={() => setModalRecipe(null)} />
        )}

        {/* Inline survey overlay */}
        {activeSurvey && (
          <SurveyOverlay
            phase={activeSurvey.phase}
            onSubmit={async (responses) => {
              const now = Date.now();
              const studyStart = studyStartedAt.current ?? now;
              const phaseStart = activeSurvey.phase === 2 ? (phase2StartedAt.current ?? studyStart) : studyStart;
              const timing = {
                study_started_at: new Date(studyStart).toISOString(),
                phase_started_at: new Date(phaseStart).toISOString(),
                submitted_at: new Date(now).toISOString(),
                phase_duration_seconds: Math.round((now - phaseStart) / 1000),
                total_duration_seconds: Math.round((now - studyStart) / 1000),
              };
              await submitSurvey(activeSurvey.phase, responses, timing);
              if (activeSurvey.phase === 1) {
                phase2StartedAt.current = Date.now();
                saveSession({ ...(loadSession() ?? {}), phase2StartedAt: phase2StartedAt.current });
                setThread([]);
                setDoneExploringCount(0);
                setActiveSurvey(null); // close overlay and continue to phase 2
              } else {
                // phase 2 — leave overlay open so the completion page and link are visible
                setConversationEnded(true);
              }
            }}
          />
        )}

        {/* Bottom input bar */}
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
          <div className="mx-auto w-[96%] max-w-6xl">
            <div className="flex items-center gap-3 rounded-2xl bg-stone-100/85 backdrop-blur-xl border border-stone-200/60 shadow-2xl p-3">
              <input
                className={`w-full bg-transparent outline-none placeholder:text-stone-400 text-stone-900 px-3 py-2 text-[16px] ${inputBlocked ? "opacity-40 cursor-not-allowed" : ""}`}
                placeholder={conversationEnded ? "Conversation ended. Thank you!" : activeSurvey ? "Please complete the survey…" : pendingSurvey ? "Click 'Continue to Survey' above…" : exploringRecipes ? "Browse the recipes above…" : "Type a message…"}
                ref={input}
                disabled={inputBlocked}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                aria-label="Type a message"
              />
              <button
                disabled={inputBlocked || loading || !!message}
                onClick={sendMessage}
                className={`px-6 py-3 rounded-xl font-semibold uppercase text-gray-700 bg-white/50 hover:bg-white/70 backdrop-blur-md border border-white/40 shadow-sm active:scale-[0.98]
                  ${inputBlocked || loading || !!message ? "cursor-not-allowed opacity-40" : ""}`}
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- NON-FULLSCREEN: panel mode ---------------- */
  return (
    <>
      {/* Launcher */}
      {!isPanelOpen && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-lg bg-pink-500 overflow-hidden border-2 border-white"
          aria-label="Open assistant"
        >
          <img
            src="/avatar_face.png"
            alt="Assistant"
            className="w-full h-full object-cover"
          />
        </button>
      )}

      {isPanelOpen && (
        <aside className="fixed right-6 bottom-6 z-50 w-[25vw] h-[95vh]">
          <div className="w-full h-full rounded-2xl shadow-2xl overflow-hidden bg-white border border-black/5 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
                  <span className="text-pink-600 text-sm font-bold">B</span>
                </div>
                <div className="font-semibold">Bonbon AI Assistant</div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCameraZoomed(!cameraZoomed)}
                  className="rounded-lg p-2 hover:bg-gray-100 active:scale-[0.98]"
                  title={cameraZoomed ? "Zoom out" : "Zoom in"}
                >
                  {cameraZoomed ? "−" : "+"}
                </button>

                <button
                  onClick={() => setIsAvatarFullscreen(true)}
                  className="rounded-lg p-2 hover:bg-gray-100 active:scale-[0.98]"
                  title="Go fullscreen"
                >
                  ⤢
                </button>

                <button
                  onClick={() => setIsPanelOpen(false)}
                  className="rounded-lg p-2 hover:bg-gray-100 active:scale-[0.98]"
                  aria-label="Close assistant"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Avatar area */}
            <div className="relative w-full h-[55%] overflow-hidden">
              <img
                src="/kitchen.png"
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover blur-sm scale-105 brightness-90"
              />
              <div className="absolute inset-0 bg-black/30" />
              <Canvas
                camera={{ fov: 28, position: [0, 2.2, 4] }}
                gl={{ alpha: true, antialias: true }}
                onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
                className="absolute inset-0 w-full h-full"
              >
                <Experience />
              </Canvas>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-white">
              {thread.map((m, i) => (
                <Bubble
                  key={i}
                  role={m.role}
                  text={m.text}
                  linksByLine={m.linksByLine}
                  onLinkClick={() => setHasClickedRecipe(true)}
                />
              ))}

              {message?.text ? (
                <Bubble
                  role="assistant"
                  text={message.text}
                  linksByLine={message.linksByLine}
                  onLinkClick={() => setHasClickedRecipe(true)}
                />
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            {/* Input row */}
            <div className="border-t p-4">
              <div className="flex items-center gap-3 rounded-2xl bg-stone-100/85 backdrop-blur-xl border border-stone-200/60 shadow-2xl p-3">
                <input
                  className={`w-full bg-transparent outline-none placeholder:text-stone-400 text-stone-900 px-3 py-2 text-[16px] ${conversationEnded ? "opacity-40 cursor-not-allowed" : ""}`}
                  placeholder={conversationEnded ? "Conversation ended. Thank you!" : thread.length === 0 ? "Press Enter to start…" : "Type a message…"}
                  ref={input}
                  disabled={conversationEnded}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  aria-label="Type a message"
                />
                {thread.length > 0 && (
                  <button
                    disabled={conversationEnded || loading || !!message || (hasRecipeLinks && !hasClickedRecipe)}
                    onClick={sendMessage}
                    className={`px-6 py-3 rounded-xl font-semibold uppercase text-gray-700 bg-white/50 hover:bg-white/70 backdrop-blur-md border border-white/40 shadow-sm active:scale-[0.98]
                      ${conversationEnded || loading || message || (hasRecipeLinks && !hasClickedRecipe) ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    Send
                  </button>
                )}
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  );
};