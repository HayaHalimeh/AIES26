# Study Data

Data for the study on agent embodiment and trust in a conversational
recommender system (healthy recipe recommendation, between-subjects: Chatbot vs. ECA).

## Files

| File                                             | Contents                                                              |
| ------------------------------------------------ | --------------------------------------------------------------------- |
| `eca_phase1.csv`, `chatbot_phase1.csv`           | Interaction 1 (t1) survey responses                                   |
| `eca_phase2.csv`, `chatbot_phase2.csv`           | Interaction 2 (t2) survey responses and outcome measures              |
| `eca_fsa_summary.csv`, `chatbot_fsa_summary.csv` | Per-participant mean FSA nutrition scores of the recipes shown        |
| `eca_recs.csv`, `chatbot_recs.csv`               | Recipes recommended to each participant                               |
| `analysis.ipynb`                                 | Full analysis pipeline (load → exclude → validate → hypothesis tests) |

## Privacy

`participant_id` is a synthetic anonymised code that links a participant's
phase-1, phase-2, recommendation, and FSA records. Original Prolific IDs and any
free-text feedback have been removed. All responses are anonymous.

## Data dictionary

All construct items are 7-point Likert scales (1 = strongly disagree … 7 = strongly
agree) unless noted. Items appearing in both phase files are answered at both t1 and t2.

**Identifiers and metadata**

| Column                                                       | Meaning                                                          |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `participant_id`                                             | Anonymised participant identifier (links all files)              |
| `phase_duration_seconds`, `total_duration_seconds`           | Time on the phase / whole study                                  |
| `demographics`                                               | JSON object: `age` band, `gender`, `ethnicity`, `cook_frequency` |
| `attention_check_1` (phase 1), `attention_check_2` (phase 2) | Embedded attention-check items                                   |

**Trust items** (measured at t1 and t2)

| Column                    | Construct                                                       |
| ------------------------- | --------------------------------------------------------------- |
| `benevolence_trust_1`–`3` | Benevolence — a component of **goodwill trust**                 |
| `integrity_trust_1`–`3`   | Integrity — a component of **goodwill trust**                   |
| `competence_trust_1`–`3`  | Competence — i.e. **qualification trust**                       |
| `affect_trust_1`–`2`      | Affect-based trust (collected; not used in the reported models) |

**Phase-2 outcomes and covariates**

| Column                        | Meaning                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| `perceived_healthiness`       | Single item: perceived healthiness of the t2 recipes (1 = very unhealthy … 7 = very healthy) |
| `behavioral_intention_1`–`3`  | Intention to follow the recommendations (`behavioral_intention_3` is reverse-coded)          |
| `continuance_intention_1`–`3` | Intention to keep using the agent                                                            |
| `trust_disposition_1`–`3`     | Dispositional trust in technology (covariate)                                                |
| `familiarity_1`–`2`           | Familiarity with conversational agents (covariate)                                           |
| `health_consciousness_1`–`3`  | Health consciousness (collected; not in the reported model)                                  |

**Phase-1 only**

| Column                  | Meaning                                |
| ----------------------- | -------------------------------------- |
| `social_presence_1`–`5` | Perceived social presence of the agent |

**FSA summary files**

| Column              | Meaning                                                                      |
| ------------------- | ---------------------------------------------------------------------------- |
| `avg_fsa_healthy`   | Mean FSA score of the recipes shown at t1 (healthy; lower = healthier)       |
| `avg_fsa_unhealthy` | Mean FSA score of the recipes shown at t2 (unhealthy; higher = less healthy) |

**Recommendation files**

| Column                                                          | Meaning                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------- |
| `rank`, `recipe_title`, `dish_type`, `total_time`, `complexity` | Recommended recipe and its attributes                               |
| `distance`                                                      | Preference-space distance from the participant's stated preferences |
| `fsa_score`                                                     | Recipe FSA nutrition score (4 = healthiest … 12 = least healthy)    |
