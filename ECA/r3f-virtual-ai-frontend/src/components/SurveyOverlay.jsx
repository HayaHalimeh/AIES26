import { useState } from "react";

const PROLIFIC_COMPLETION_URL = import.meta.env.VITE_PROLIFIC_COMPLETION_URL;
const PROLIFIC_FAILURE_URL    = import.meta.env.VITE_PROLIFIC_FAILURE_URL;

// ─── Attention check rules: { questionId: expectedValue } per phase ───────────
const ATTENTION_CHECKS = {
  1: { attentionCheck1: 5 },
  2: { attentionCheck2: 1 },
};

// ─── Survey data ───────────────────────────────────────────────────────────────

const PHASE1_GROUPS = [
  /*{
    id: "social_presence",
    label: "Social Presence",
    description: "When interacting with the agent, there is a sense of",
    questions: [
      { id: "sp3", text: "sociability." },
      { id: "sp1", text: "human contact." },
      { id: "sp4", text: "human warmth." },
      { id: "sp5", text: "human sensitivity." },
      { id: "sp2", text: "personalness." },

    ],
  },*/
  {
    id: "cognition_trust_integrity",
    label: "Cognition Trust — Integrity",
    description: "Please rate the following statements based on your experience with the recommendation agent so far.",
    questions: [
      { id: "ti1", text: "The agent is truthful in its dealings with me." },
      { id: "ti2", text: "I would characterize the agent as honest." },
      { id: "ti3", text: "The agent would keep its commitments." },
      { id: "attentionCheck1", text: "This is an attention check. Please rate this statement as a 5." },

    ],
  },
  {
    id: "cognition_trust_benevolence",
    label: "Cognition Trust — Benevolence",
    description: "Please rate the following statements based on your experience with the recommendation agent so far.",
    questions: [
      { id: "tb1", text: "I believe that the agent would act in my best interest." },
      { id: "tb2", text: "The agent is interested in my well-being, not just its own." },
      { id: "tb3", text: "If I required help, the agent would do its best to help me." },
    ],
  },
  {
    id: "cognition_trust_competence",
    label: "Cognition Trust — Competence",
    description: "Please rate the following statements based on your experience with the recommendation agent so far.",
    questions: [
      { id: "tc1", text: "The agent is competent and effective in providing recipe recommendations." },
      { id: "tc2", text: "The agent performs its role of giving recommendations very well." },
      { id: "tc3", text: "Overall, the agent is a capable and proficient." },
    ],
  },
];

const PHASE2_GROUPS = [
  {
    id: "health_rating",
    label: "Recipe Health Rating",
    description: "Please rate the following statements based on your experience so far.",
    questions: [
      {
        id: "hr1",
        text: "I think the recipe recommendations I received during the second interaction were:",
        scaleMin: "Very Unhealthy",
        scaleMax: "Very Healthy",
      },
      { id: "attentionCheck2", text: "This is an attention check. Please rate this statement as a 1." },
    ],
  },
  {
    id: "cognition_trust_integrity",
    label: "Cognition Trust — Integrity",
    description: "Please rate the following statements based on your experience with the recommendation agent so far.",
    questions: [
      { id: "ti1", text: "The agent is truthful in its dealings with me." },
      { id: "ti2", text: "I would characterize the agent as honest." },
      { id: "ti3", text: "The agent would keep its commitments." },
    ],
  },
  {
    id: "cognition_trust_benevolence",
    label: "Cognition Trust — Benevolence",
    description: "Please rate the following statements based on your experience with the recommendation agent so far.",
    questions: [
      { id: "tb1", text: "I believe that the agent would act in my best interest." },
      { id: "tb2", text: "The agent is interested in my well-being, not just its own." },
      { id: "tb3", text: "If I required help, the agent would do its best to help me." },
    ],
  },
  {
    id: "cognition_trust_competence",
    label: "Cognition Trust — Competence",
    description: "Please rate the following statements based on your experience with the recommendation agent so far.",
    questions: [
      { id: "tc1", text: "The agent is competent and effective in providing recipe recommendations." },
      { id: "tc2", text: "The agent performs its role of giving recommendations very well." },
      { id: "tc3", text: "Overall, the agent is a capable and proficient." },
    ],
  },
  {
    id: "behavioral_intention",
    label: "Behavioral Intention",
    description: "Please rate the following statements based on your experience with the recommendation agent specifically during the **Second Interaction**.",
    questions: [
      { id: "bi1", text: "It is likely that I would follow at least one of the recommended recipes." },
      { id: "bi2", text: "I am ready to follow at least one of the recommended recipes." },
      { id: "bi3", text: "It is not probable that I would follow any of the recommended recipes." },
    ],
  },
  {
    id: "continuance_intention",
    label: "Continuance Intention",
    description: "Please rate the following statements based on your experience with the recommendation agent **In General**.",
    questions: [
      { id: "ci1", text: "I would continue to use the recommendation agent in the future." },
      { id: "ci2", text: "I would recommend the recommendation agent to others as well." },
      { id: "ci3", text: "I would use the recommendation agent in the long term." },
    ],
  },
  {
    id: "familiarity",
    label: "Familiarity",
    description: "Please rate the following statements about your experience with AI agents.",
    questions: [
      { id: "fam1", text: "I am familiar with using AI conversational agents for recommendations." },
      { id: "fam2", text: "I have already had similar conversations with AI conversational agents like this one." },
    ],
  },
  {
    id: "trust_disposition",
    label: "Trust Disposition",
    description: "Please rate the following statements about yourself.",
    questions: [
      { id: "tt1", text: "Typically I trust new information technologies until they prove to me that I shouldn't trust them." },
      { id: "tt2", text: "I usually trust in information technology until it gives me a reason not to." },
      { id: "tt3", text: "I generally give an information technology the benefit of the doubt when I first use it." },
    ],
  },
  {
    id: "demographics",
    label: "Demographics",
    type: "demographics",
  },
  {
    id: "open_feedback",
    label: "Your Feedback",
    type: "open_feedback",
  },
];


// ─── Sub-components ────────────────────────────────────────────────────────────

const LikertRow = ({ question, value, onChange }) => {
  const min = question.scaleMin ?? "Strongly Disagree";
  const max = question.scaleMax ?? "Strongly Agree";
  return (
    <div className="py-4 border-b border-stone-100 last:border-0">
      <p className="text-sm text-stone-800 leading-snug mb-3">{question.text}</p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-stone-400 w-[52px] text-right shrink-0 leading-tight">{min}</span>
        <div className="flex gap-1 flex-1 justify-between">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(question.id, n)}
              className={[
                "w-7 h-7 rounded-full border text-xs font-semibold transition-all shrink-0",
                value === n
                  ? "bg-stone-800 text-white border-stone-800 scale-110"
                  : "bg-white text-stone-600 border-stone-300 hover:border-stone-600",
              ].join(" ")}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-stone-400 w-[52px] shrink-0 leading-tight">{max}</span>
      </div>
    </div>
  );
};

const DemographicsPage = ({ values, onChange }) => (
  <div className="flex flex-col gap-5 py-2">
    <div>
      <label className="block text-sm font-semibold text-stone-700 mb-2">Age</label>
      <div className="flex flex-wrap gap-2">
        {["18–24", "25–34", "35–44", "45–54", "55+"].map((range) => (
          <button
            key={range}
            type="button"
            onClick={() => onChange("age", range)}
            className={[
              "px-4 py-2 rounded-full text-sm border transition",
              values.age === range
                ? "bg-stone-800 text-white border-stone-800"
                : "bg-white text-stone-600 border-stone-300 hover:border-stone-600",
            ].join(" ")}
          >
            {range}
          </button>
        ))}
      </div>
    </div>
    <div>
      <label className="block text-sm font-semibold text-stone-700 mb-2">Gender</label>
      <div className="flex flex-wrap gap-2">
        {["Male", "Female", "Other"].map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onChange("gender", g)}
            className={[
              "px-4 py-2 rounded-full text-sm border transition",
              values.gender === g
                ? "bg-stone-800 text-white border-stone-800"
                : "bg-white text-stone-600 border-stone-300 hover:border-stone-600",
            ].join(" ")}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
    <div>
      <label className="block text-sm font-semibold text-stone-700 mb-2">How often do you cook?</label>
      <div className="flex flex-wrap gap-2">
        {["Daily", "Several times a week", "Once a week", "A few times a month", "Rarely"].map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange("cook_frequency", opt)}
            className={[
              "px-4 py-2 rounded-full text-sm border transition",
              values.cook_frequency === opt
                ? "bg-stone-800 text-white border-stone-800"
                : "bg-white text-stone-600 border-stone-300 hover:border-stone-600",
            ].join(" ")}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  </div>
);

const FeedbackPage = ({ value, onChange }) => (
  <div className="flex flex-col gap-4 py-4">
    <p className="text-sm text-stone-700 leading-relaxed">
      We would love to hear about your experience with the recommendation agent. Is there anything you would like to share?
    </p>
    <textarea
      className="w-full min-h-[160px] rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-800 placeholder:text-stone-400 outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-400 resize-y transition"
      placeholder="This is completely optional. We appreciate any feedback you are willing to provide."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </div>
);

// ─── Result pages ──────────────────────────────────────────────────────────────

const CompletionPage = () => (
  <div className="flex flex-col items-center justify-center flex-1 px-5 py-12 text-center gap-6">
    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-3xl">✓</div>
    <h2 className="text-2xl font-bold text-stone-900">Survey Complete — Thank You!</h2>
    <p className="text-sm text-stone-600 max-w-md leading-relaxed">
      Thank you for taking the time to complete both interactions and all questionnaires. Your responses have been recorded.
    </p>
    <p className="text-sm text-stone-600 max-w-md leading-relaxed">
      Please click the button below to return to Prolific and confirm your submission.
    </p>
    <a
      href={PROLIFIC_COMPLETION_URL}
      className="mt-2 px-5 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-sm font-semibold transition"
    >
      Return to Prolific →
    </a>
  </div>
);

const FailurePage = () => (
  <div className="flex flex-col items-center justify-center flex-1 px-5 py-12 text-center gap-6">
    <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center text-3xl">✗</div>
    <h2 className="text-2xl font-bold text-stone-900">Attention Check Not Passed</h2>
    <p className="text-sm text-stone-600 max-w-md leading-relaxed">
      Unfortunately, you did not pass one or more attention checks in this survey. As a result, we are unable to include your responses in this study.
    </p>
    <p className="text-sm text-stone-600 max-w-md leading-relaxed">
      Please click the button below to return to Prolific.
    </p>
    <a
      href={PROLIFIC_FAILURE_URL}
      className="mt-2 px-5 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-semibold transition"
    >
      Return to Prolific →
    </a>
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────

export const SurveyOverlay = ({ phase, onSubmit, lastRecipes, backendUrl }) => {
  const groups = phase === 1 ? PHASE1_GROUPS : PHASE2_GROUPS;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [demographics, setDemographics] = useState({});
  const [openFeedback, setOpenFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // null | "complete" | "failed"

  const group = groups[step];
  const isLast = step === groups.length - 1;

  const questionIds = (g) => {
    if (g.type === "demographics") return null;
    return g.questions.map((q) => q.id);
  };

  const isGroupComplete = (g) => {
    if (g.type === "demographics") {
      return !!(demographics.age && demographics.gender && demographics.cook_frequency);
    }
    if (g.type === "open_feedback") return true;
    return (questionIds(g) ?? []).every((id) => answers[id] != null);
  };

  const checkAttention = () => {
    const rules = ATTENTION_CHECKS[phase] ?? {};
    return Object.entries(rules).every(([id, expected]) => answers[id] === expected);
  };

  const setAnswer = (id, val) => setAnswers((prev) => ({ ...prev, [id]: val }));
  const setDemo = (key, val) => setDemographics((prev) => ({ ...prev, [key]: val }));

  const handleNext = async () => {
    if (isLast) {
      if (!checkAttention()) {
        setResult("failed");
        return;
      }
      setSubmitting(true);
      await onSubmit({ ...answers, demographics, open_feedback: openFeedback });
      if (phase === 2) setResult("complete");
    } else {
      setStep((s) => s + 1);
    }
  };

  const renderContent = () => {
    if (group.type === "demographics") {
      return <DemographicsPage values={demographics} onChange={setDemo} />;
    }
    if (group.type === "open_feedback") {
      return <FeedbackPage value={openFeedback} onChange={setOpenFeedback} />;
    }
    return (
      <div>
        {group.id === "health_rating" && phase === 2 && (
          <p className="text-sm text-stone-600 mb-4">
            <br />
            <strong>Note:</strong> Generally, recipes high in fat, saturated fat, sugar, or salt are considered less healthy. Recipes low in these components are considered healthier. 
          </p>
        )}
        {group.questions.map((q) => (
          <LikertRow key={q.id} question={q} value={answers[q.id]} onChange={setAnswer} />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[99998] flex items-center justify-center pointer-events-none">
      {/* Dim backdrop */}
      <div className="absolute inset-0 bg-black/40 pointer-events-auto" />

      {/* Survey panel */}
      <div className="pointer-events-auto relative w-[98%] max-w-7xl h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">

        {/* Result pages — replace normal content */}
        {result === "complete" && <CompletionPage />}
        {result === "failed"   && <FailurePage />}

        {!result && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-5 border-b border-stone-200 bg-stone-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-stone-500 bg-stone-200 px-2.5 py-1 rounded-full">
                  System Survey
                </span>
                <span className="text-sm font-semibold text-stone-600">Interaction {phase}</span>
              </div>
              <span className="text-xs text-stone-400 font-medium">
                {step + 1} / {groups.length}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-[3px] bg-stone-100 shrink-0">
              <div
                className="h-full bg-stone-700 transition-all duration-300"
                style={{ width: `${((step + 1) / groups.length) * 100}%` }}
              />
            </div>

            {/* Group description */}
            {group.description && (
              <div className="px-5 pt-6 pb-2 shrink-0">
                <p className="text-sm text-stone-500 leading-relaxed">
                  {group.description.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                    part.startsWith("**") && part.endsWith("**")
                      ? <strong key={i} className="font-semibold text-stone-700">{part.slice(2, -2)}</strong>
                      : part
                  )}
                </p>
              </div>
            )}

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 pb-2">
              {renderContent()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end px-5 py-5 border-t border-stone-200 bg-stone-50 shrink-0">
              <button
                type="button"
                onClick={handleNext}
                disabled={!isGroupComplete(group) || submitting}
                className="px-5 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-sm font-semibold disabled:opacity-40 transition"
              >
                {submitting ? "Submitting…" : isLast ? "Submit Survey" : "Next →"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
