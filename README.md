# Embodied CRS — The Hidden Cost of a Friendly Face

This repository accompanies the paper **"The Hidden Cost of a Friendly Face: Investigating the Effect of Agent Embodiment on Trust Loss in Conversational Recommender Systems After Misleading Health Claims"** by Haya Halimeh (Data Analytics Group, Paderborn University), published at the 9th AAAI/ACM Conference on AI, Ethics, and Society (AIES 2026).

## Citation

If you use the source code, prompts, or datasets from this repository, please cite this work:

```bibtex
@inproceedings{,
  title     = {The Hidden Cost of a Friendly Face: Investigating the Effect of Agent Embodiment on Trust Loss in Conversational Recommender Systems After Misleading Health Claims},
  author    = {Halimeh, Haya},
  booktitle = {},
  year      = {2026}
}
```

---

This is a research study comparing two AI-powered recipe recommendation agents: a text-based chatbot and an embodied conversational agent (ECA) with a 3D animated avatar. Participants interact with one of the two agents to find healthy recipes and complete surveys across two phases.

---

## Conditions

### Chatbot — [`Chatbot/`](Chatbot/)

A text-based conversational agent. Participants chat through a browser interface to receive personalised healthy recipe recommendations.

![Chatbot interface](chatbot_only.png)

### ECA (Embodied Conversational Agent) — [`ECA/`](ECA/)

A 3D animated avatar that speaks responses aloud using text-to-speech and lip-sync. Functionally identical to the Chatbot condition but delivered through an embodied agent.

![ECA interface](eca_only.png)

Both conditions share the same conversation flow, recipe dataset, and survey instruments.

---

## Demo

<video src="https://github.com/user-attachments/assets/bd4a4856-f4f3-4e2e-97eb-0395555abb1a" controls width="100%"></video>

---

## Getting Started

See the README inside each condition's folder for setup and deployment instructions.
