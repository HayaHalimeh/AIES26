# Study Data and Analysis

Analysis for the study on agent embodiment and trust in a conversational
recommender system (healthy recipe recommendation, between-subjects: Chatbot vs. ECA).

Running `analysis.ipynb` reproduces the reported results on the final sample of
**N = 56 (Chatbot = 29, ECA = 27)**.

## Derived variables (computed in the notebook)

- **Goodwill trust** = mean of the benevolence and integrity items, per phase.
- **Qualification trust** = mean of the competence items, per phase.
- **Trust loss** (delta) = t1 − t2 for each dimension; positive = trust dropped.

## Reproducing the analysis

Requirements: `pandas`, `numpy`, `scipy`, `statsmodels`, `factor_analyzer`, `jinja2`.

Exclusions applied in the notebook: completion-time outliers (±2 SD), then
participants without a recommendation record → final **N = 56 (Chatbot 29, ECA 27)**.
