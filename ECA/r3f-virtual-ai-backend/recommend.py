"""
CLI wrapper for RecipeRecommender.
Reads JSON from stdin, calls RecipeRecommender, writes JSON to stdout.

Input JSON:
{
  "dish_type":  "Pasta",          # must match dish_type_normalised values in CSV
  "total_time": "up to 30 mins",  # time bucket label
  "complexity": "low",            # complexity bucket label
  "run": 1,                       # 1 = healthy, 2 = unhealthy (default: 1)
  "n":  3                         # number of results (default: 3)
}

Output JSON:
{"recipes": [...]}
"""

import sys
import json
import os
import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from recipe_recommender import RecipeRecommender

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data", "main_dishes.csv")

# Accepted time bucket labels (keys in recipe_recommender.TIME_RANGES)
VALID_TIME_BUCKETS = {
    "up to 30 minutes",
    "around 60 minutes",
    "over 60 minutes",
}

# Accepted complexity bucket labels (keys in recipe_recommender.COMPLEXITY_RANGES)
VALID_COMPLEXITY_BUCKETS = {
    "low",
    "medium",
    "high",
}

# Loose aliases so the LLM does not have to be perfectly precise
TIME_ALIASES = {
    # up to 30 minutes
    "30": "up to 30 minutes",
    "30 mins": "up to 30 minutes",
    "around 30 mins": "up to 30 minutes",
    "around 30 minutes": "up to 30 minutes",
    "quick": "up to 30 minutes",
    "fast": "up to 30 minutes",
    "up to 45 minutes": "around 60 minutes",
    # around 60 minutes
    "60": "around 60 minutes",
    "60 mins": "around 60 minutes",
    "up to 60 minutes": "around 60 minutes",
    "up to 60 mins": "around 60 minutes",
    "around 60 mins": "around 60 minutes",
    # over 60 minutes
    "90": "over 60 minutes",
    "90 mins": "over 60 minutes",
    "around 90 minutes": "over 60 minutes",
    "around 90 mins": "over 60 minutes",
    "up to 90 minutes": "over 60 minutes",
    "up to 90 mins": "over 60 minutes",
    "above 90 minutes": "over 60 minutes",
    "above 90 mins": "over 60 minutes",
    "over 90 minutes": "over 60 minutes",
    "long": "over 60 minutes",
}

COMPLEXITY_ALIASES = {
    "simple": "low",
    "easy": "low",
    "few": "low",
    "complex": "high",
    "hard": "high",
    "difficult": "high",
    "advanced": "high",
}


def _normalize_time(val: str) -> str:
    if not val:
        return "around 60 minutes"
    v = str(val).strip().lower()
    if v in VALID_TIME_BUCKETS:
        return v
    if v in TIME_ALIASES:
        return TIME_ALIASES[v]
    return "around 60 minutes"


def _normalize_complexity(val: str) -> str:
    if not val:
        return "medium"
    v = str(val).strip().lower()
    if v in VALID_COMPLEXITY_BUCKETS:
        return v
    if v in COMPLEXITY_ALIASES:
        return COMPLEXITY_ALIASES[v]
    return "medium"


def main():
    raw = sys.stdin.read()
    payload = json.loads(raw) if raw.strip() else {}

    dish_type       = payload.get("dish_type") or "Pasta"
    total_time      = _normalize_time(payload.get("total_time", ""))
    complexity      = _normalize_complexity(payload.get("complexity", ""))
    run             = int(payload.get("run", 1))
    n               = int(payload.get("n", 3))

    df = pd.read_csv(DATA_PATH)

    # Redirect stdout during RecipeRecommender init so debug prints
    # (per-dish midpoints table) go to stderr instead of our JSON output.
    _real_stdout = sys.stdout
    sys.stdout = sys.stderr
    try:
        recommender = RecipeRecommender(df)
    finally:
        sys.stdout = _real_stdout

    top = recommender.get_top_recipes(
        dish_type=dish_type,
        time_bucket=total_time,
        complexity_bucket=complexity,
        run=run,
        n=n,
    )

    if top is None or len(top) == 0:
        out = {"recipes": []}
    else:
        records = top.replace({np.nan: None}).to_dict(orient="records")
        out = {"recipes": records}

    sys.stdout.write(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
