import { useRef, useEffect, useMemo, useState } from "react";
import { useChat } from "../hooks/useChat";
import { SurveyOverlay } from "./SurveyOverlay";
import { WelcomeOverlay } from "./WelcomeOverlay";
import { loadSession, saveSession } from "../hooks/useSession";


/* ---------- Recipe detail modal ---------- */
const RecipeModal = ({ recipe, backendUrl, onClose }) => {
  if (!recipe) return null;

  const imagePath = recipe.image_path ?? recipe.image_path_x ?? recipe.image_path_y ?? null;
  const filename  = imagePath ? imagePath.replace(/^recipe_images\//, "") : null;
  const imageUrl  = filename ? `${backendUrl}/recipe-images/${filename}` : null;
  const name      = recipe.name ?? recipe.title ?? "Recipe";

  // Ingredients: semicolon-separated string → list
  const ingredients = recipe.ingredients
    ? String(recipe.ingredients).split(";").map((s) => s.trim()).filter(Boolean)
    : [];

  // Directions: sentence-by-sentence (split on ". " keeping period)
  const steps = recipe.directions
    ? String(recipe.directions)
        .split(/(?<=\.)\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      className="fixed inset-0 z-[99999] grid place-items-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative z-10 w-[90%] max-w-2xl max-h-[80vh] flex flex-col rounded-3xl overflow-hidden bg-white/90 backdrop-blur-xl border border-stone-200/60 text-gray-800 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header image */}
        {imageUrl && (
          <div className="h-52 flex-shrink-0 overflow-hidden">
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 leading-snug">{name}</h2>

          {/* Ingredients */}
          {ingredients.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
                Ingredients
              </h3>
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

          {ingredients.length > 0 && steps.length > 0 && (
            <div className="border-t border-stone-200" />
          )}

          {/* Instructions */}
          {steps.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-3">
                Instructions
              </h3>
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

        {/* Close button */}
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
        <RecipeCard
          key={i}
          recipe={r}
          backendUrl={backendUrl}
          onViewRecipe={() => onViewRecipe(r)}
        />
      ))}
    </div>
  );
};

/* ---------- System notice (non-agent messages e.g. code request) ---------- */
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
const AvatarOverlayMessages = ({ thread, liveMessage, loading, onLinkClick, messagesEndRef, backendUrl, onViewRecipe, onDone, onOpenSurvey }) => {
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

  // Persist UI state on every relevant change.
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

  // Check if thread contains any recipe links
  const hasRecipeLinks = useMemo(() => {
    return thread.some((m) => {
      const text = String(m.text ?? "");
      return /\[View Recipe\]|https?:\/\//i.test(text);
    });
  }, [thread]);

  const {
    chat,
    loading,
    cameraZoomed,
    setCameraZoomed,
    message,
    onMessagePlayed,
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

  const recipeGroupCount = useMemo(() => thread.filter((m) => m.recipes).length, [thread]);
  const exploringRecipes = recipeGroupCount > doneExploringCount && !currentPhaseSurveyShown;
  const pendingSurvey = currentPhaseSurveyShown && activeSurvey === null && !conversationEnded;
  const inputBlocked = exploringRecipes || activeSurvey !== null || pendingSurvey || conversationEnded;

  // Reset hasClickedRecipe when phase changes (e.g. dinner→dessert)
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    if (phase !== prevPhaseRef.current) {
      prevPhaseRef.current = phase;
      setHasClickedRecipe(false);
    }
  }, [phase]);


  const sendMessage = async () => {
    const text = input.current.value;
    if (!loading && text.trim() !== "") {
      setThread((t) => [...t, { role: "user", text }]);
      chat(text);
      input.current.value = "";
    }
  };

  // Commit assistant messages to thread immediately and advance the queue in the same tick
  useEffect(() => {
    if (message?.text) {
      const isSystem = message.isSystem || false;
      setThread((t) => [
        ...t,
        {
          role: message.role || "assistant",
          text: message.text,
          linksByLine: message.linksByLine || [],
          recipes: message.recipes || null,
          showSurvey: message.showSurvey || false,
          surveyPhase: message.surveyPhase || null,
          isSystem,
        },
      ]);
      onMessagePlayed();
    }
  }, [message, onMessagePlayed]);

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

  /* ---------------- FULLSCREEN: no avatar, messages only ---------------- */
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

        {/* Welcome screen — shown until dismissed */}
        {!welcomeDismissed && (
          <WelcomeOverlay onNext={() => {
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
          messagesEndRef={messagesEndRef}
          backendUrl={backendUrl}
          onViewRecipe={setModalRecipe}
          onDone={() => {
            if (loading) return;
            setDoneExploringCount((c) => c + 1);
            chat("done");
          }}
          onOpenSurvey={(survey) => setActiveSurvey(survey)}
        />

        {/* Recipe detail modal — rendered at top level to avoid transform interference */}
        {modalRecipe && (
          <RecipeModal
            recipe={modalRecipe}
            backendUrl={backendUrl}
            onClose={() => setModalRecipe(null)}
          />
        )}

        {/* Inline survey overlay */}
        {activeSurvey && (
          <SurveyOverlay
            phase={activeSurvey.phase}
            lastRecipes={[...thread].reverse().find((m) => m.recipes)?.recipes ?? null}
            backendUrl={backendUrl}
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
                disabled={inputBlocked || loading}
                onClick={sendMessage}
                className={`px-6 py-3 rounded-xl font-semibold uppercase text-gray-700 bg-white/50 hover:bg-white/70 backdrop-blur-md border border-white/40 shadow-sm active:scale-[0.98]
                  ${inputBlocked || loading ? "cursor-not-allowed opacity-40" : ""}`}
              >
                Send
              </button>
            </div>
          </div>
        </div>     
      </div>
    );
  }
};