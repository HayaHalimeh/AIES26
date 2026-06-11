export const WelcomeOverlay = ({ onNext }) => (
  <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50">
    <div className="relative w-[98%] max-w-7xl h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-10 py-8 space-y-6 text-stone-800">

        <div>
          <h1 className="text-2xl font-bold text-stone-900 leading-snug">
            Welcome, and thank you for participating in this study.
          </h1>
        </div>

        <p className="text-sm leading-relaxed">
          In this study, you will imagine yourself in a scenario where you are looking for <strong>2 healthy main-dish recipes</strong> for an upcoming event with friends.
        </p>

        <p className="text-sm leading-relaxed">
          You will interact <strong>twice</strong> with an AI conversational recommendation agent that is designed to suggest in each interaction <strong>healthy recipes</strong> based on your personal preferences.
        </p>

        <p className="text-sm leading-relaxed">Please read the following information carefully.</p>

        {/* Study Procedure */}
        <div>
          <h2 className="text-base font-bold text-stone-900 mb-3">Study Procedure</h2>
          <ol className="space-y-3">
            {[
              { title: "First interaction with the agent", desc: "You will interact with the recipe agent, which will ask about your preferences and recommend recipes it considers healthy.", time: "≈ 2-3 min" },
              { title: "First questionnaire", desc: "You will answer a few questions about your experience with the agent and recommendations.", time: "≈ 3-4 min" },
              { title: "Second interaction with the agent", desc: "You will interact with the agent for a second round of recommendations.  As in the first interaction, the agent will recommend recipes it considers healthy.", time: "≈ 2-3 min" },
              { title: "Second questionnaire", desc: "You will answer a final set of questions about your experience with the agent, the recommendations you received including their healthiness, and about your background and general attitudes.", time: "≈ 3-4 min" },
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-stone-800 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-stone-800">{step.title} <span className="text-stone-400 font-normal">({step.time})</span></p>
                  <p className="text-sm text-stone-600 leading-relaxed">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Key info pills */}
        <div className="space-y-2">
          {[
            { icon: "⏱", text: "Total Duration: Approximately 10-15 minutes." },
            { icon: "💬", text: "How to Interact: Please interact as naturally as possible, as if you were genuinely looking for recipes." },
            { icon: "🔒", text: "Confidentiality: All responses are anonymous and will be used for research purposes only." },
            { icon: "✓",  text: "Attention Checks: Participants who fail an attention check or take unusually little or excessive time to complete the study will be excluded from payment, as this may indicate inattentive or invalid responses." },
          ].map(({ icon, text }, i) => (
            <div key={i} className="flex gap-3 items-start bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
              <span className="text-base flex-shrink-0">{icon}</span>
              <p className="text-sm text-stone-700 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>

        {/* Please Note */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-amber-800 mb-1">⚠️ Please Note</p>
          <p className="text-sm text-amber-700 leading-relaxed">
            Please do not close your browser, refresh your browser or navigate away during the study, as this will result in the loss of your responses.
          </p>
          <p className="text-sm text-amber-700 leading-relaxed mt-2">
            Participants who fully complete all steps, pass the attention check, and submit the survey within a reasonable time frame will receive compensation.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end px-10 py-5 border-t border-stone-200 bg-stone-50 shrink-0">
        <button
          type="button"
          onClick={onNext}
          className="px-8 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white text-sm font-semibold transition"
        >
          Start
        </button>
      </div>
    </div>
  </div>
);
