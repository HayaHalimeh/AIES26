"""
Recipe Recommender for Healthy Agent Study
==========================================
KNN-based recommender 
"""

import pandas as pd
import numpy as np
from typing import Optional
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import MinMaxScaler
from itertools import product


# ─────────────────────────────────────────────
# Bucket boundary definitions (single source of truth)
# ─────────────────────────────────────────────
TIME_RANGES = {
    'up to 30 minutes':  (0,   30),   
    'around 60 minutes': (30,  65),   
    'over 60 minutes':   (66,  float('inf')), 
}

COMPLEXITY_RANGES = {
    'low':  (0,    7),
    'medium':  (8,   12),
    'high': (13,  float('inf')),
}


def _compute_midpoints_for_series(series: pd.Series, ranges: dict) -> dict:
    """
    Compute the median of actual values within each bucket range for a
    given series. Falls back gracefully when a bucket has no data:
      - finite bucket  → arithmetic midpoint of its bounds
      - open-ended     → overall series median

    Parameters
    ----------
    series : pd.Series  — actual column values (already filtered to a dish type)
    ranges : dict       — {bucket_name: (lo, hi)}, hi may be float('inf')

    Returns
    -------
    dict : {bucket_name: float}
    """
    midpoints = {}
    for bucket, (lo, hi) in ranges.items():
        mask = (series > lo) & (series <= hi) if hi != float('inf') \
               else (series > lo)
        subset = series[mask].dropna()

        if len(subset) >= 1:
            midpoints[bucket] = float(subset.median())
        elif hi != float('inf'):
            midpoints[bucket] = (lo + hi) / 2.0
        else:
            midpoints[bucket] = float(series.median())

    return midpoints


def _compute_all_dish_midpoints(df: pd.DataFrame) -> dict:
    """
    Build a nested dict of midpoints for every dish type in the dataframe:
        {
          dish_type: {
            'time':       {bucket: float, ...},
            'complexity': {bucket: float, ...},
          },
          '__global__': { ... }   ← fallback for sparse buckets
        }

    Per-dish bucket medians are used when the bucket contains >= MIN_N recipes
    for that dish. Otherwise the global median for that bucket is used, so
    sparse dish/bucket combinations are not distorted by small samples.
    """
    MIN_N = 10

    # Global fallback computed from the full dataset
    global_time = _compute_midpoints_for_series(
        df['total_minutes'].dropna(), TIME_RANGES
    )
    global_complexity = _compute_midpoints_for_series(
        df['ingredient_count'].dropna(), COMPLEXITY_RANGES
    )
    all_midpoints = {
        '__global__': {'time': global_time, 'complexity': global_complexity}
    }

    for dish in df['dish_type_normalised'].dropna().unique():
        dish_df = df[df['dish_type_normalised'] == dish]
        time_series       = dish_df['total_minutes'].dropna()
        complexity_series = dish_df['ingredient_count'].dropna()

        dish_time = {}
        dish_complexity = {}

        for bucket, (lo, hi) in TIME_RANGES.items():
            mask = (time_series > lo) & (time_series <= hi) if hi != float('inf') \
                   else (time_series > lo)
            subset = time_series[mask]
            dish_time[bucket] = float(subset.median()) \
                if len(subset) >= MIN_N else global_time[bucket]

        for bucket, (lo, hi) in COMPLEXITY_RANGES.items():
            mask = (complexity_series > lo) & (complexity_series <= hi) \
                   if hi != float('inf') else (complexity_series > lo)
            subset = complexity_series[mask]
            dish_complexity[bucket] = float(subset.median()) \
                if len(subset) >= MIN_N else global_complexity[bucket]

        all_midpoints[dish] = {'time': dish_time, 'complexity': dish_complexity}

    return all_midpoints


class RecipeRecommender:
    """
    Content-based KNN recommender for healthy recipe agent study.

    Parameters
    ----------
    df : pd.DataFrame
        Preprocessed main_dishes dataframe with columns:
        dish_type_normalised, fsa_health_label, total_minutes,
        ingredient_count, rating (or AggregatedRating), name, url
    k : int
        Number of nearest neighbours to consider before composite scoring
    rating_col : str
        Column name for recipe rating
    """

    def __init__(self, df: pd.DataFrame, k: int = 10, rating_col: str = 'rating'):
        self.df = df.copy().reset_index(drop=True)
        self.k = k
        self.rating_col = rating_col

        required = ['dish_type_normalised', 'fsa_health_label',
                    'total_minutes', 'ingredient_count', rating_col]
        missing = [c for c in required if c not in self.df.columns]
        if missing:
            raise ValueError(f"Missing columns in dataframe: {missing}")

        # ── Per-dish-type data-driven midpoints ───────────────────────────
        # Computed once at init. Each dish gets its own bucket medians so the
        # KNN query point targets where that dish's recipes actually cluster,
        # not a global average dominated by high-volume categories.
        self._all_midpoints = _compute_all_dish_midpoints(self.df)
        self._print_midpoints()

    def _print_midpoints(self) -> None:
        """Print per-dish midpoints at init so they can be inspected."""
        print("=== Per-dish-type data-driven midpoints ===")
        for dish in sorted(k for k in self._all_midpoints if k != '__global__'):
            mp = self._all_midpoints[dish]
            print(f"\n  {dish}")
            print(f"    Time buckets:")
            for bucket in TIME_RANGES:
                print(f"      {bucket:<18}  {mp['time'][bucket]:>5.1f} min")
            print(f"    Complexity buckets:")
            for bucket in COMPLEXITY_RANGES:
                print(f"      {bucket:<18}  {mp['complexity'][bucket]:>5.1f} ingredients")
        print()

    def _get_midpoints(self, dish_type: str) -> tuple:
        """Return (time_midpoints, complexity_midpoints) for a dish type."""
        mp = self._all_midpoints.get(dish_type, self._all_midpoints['__global__'])
        return mp['time'], mp['complexity']

    # ─────────────────────────────────────────────
    # Core recommendation method
    # ─────────────────────────────────────────────
    def get_recipe(
        self,
        dish_type: str,
        time_bucket: str,
        complexity_bucket: str,
        run: int,
    ) -> Optional[pd.Series]:
        """
        Return a single recipe recommendation.

        Parameters
        ----------
        dish_type : str
            e.g. 'Pasta',  'Seafood'
        time_bucket : str
            One of: 'up to 30 mins', 'around 60 mins', 'over 60 mins'
        complexity_bucket : str
            One of: 'low', 'medium', 'high'
        run : int
            1 = healthy recommendation, 2 = unhealthy recommendation

        Returns
        -------
        pd.Series or None if no recipes found
        """

        # ── Step 1: Hard filters ──────────────────────────────────────────
        health_label = 'healthy' if run == 1 else 'unhealthy'

        base_pool = self.df[
            (self.df['dish_type_normalised'] == dish_type) &
            (self.df['fsa_health_label'] == health_label) &
            (self.df[self.rating_col] > 0) &
            (self.df['ingredient_count'] >= 3)
        ].copy()

        if len(base_pool) == 0:
            return None

        # Prefer rating >= 4; fall back to all rated if pool too small
        pool = base_pool[base_pool[self.rating_col] >= 4.0]
        if len(pool) < 3:
            pool = base_pool

        # For unhealthy run, prefer recipes with FSA >= 10 for stronger contrast
        if run == 2:
            high_fsa = pool[pool['fsa_score'] >= 10]
            if len(high_fsa) >= 3:
                pool = high_fsa

        # ── Step 2: Per-dish query point ──────────────────────────────────
        time_midpoints, complexity_midpoints = self._get_midpoints(dish_type)

        time_val       = time_midpoints.get(time_bucket)
        complexity_val = complexity_midpoints.get(complexity_bucket)

        if time_val is None or complexity_val is None:
            raise ValueError(
                f"Unknown bucket: time='{time_bucket}', "
                f"complexity='{complexity_bucket}'"
            )

        # ── Step 3: Scaler fitted on full dish-type pool (both labels) ────
        # Both runs share the same coordinate space so KNN distances are
        # comparable across healthy and unhealthy subsets.
        full_dish_pool = self.df[
            self.df['dish_type_normalised'] == dish_type
        ][['total_minutes', 'ingredient_count']].dropna()

        scaler = MinMaxScaler()
        scaler.fit(full_dish_pool)

        features_scaled = scaler.transform(
            pool[['total_minutes', 'ingredient_count']]
        )
        query_scaled = scaler.transform(
            pd.DataFrame(
                [[time_val, complexity_val]],
                columns=['total_minutes', 'ingredient_count']
            )
        )

        # ── Step 4: KNN ───────────────────────────────────────────────────
        k_actual = min(self.k, len(pool))
        knn = NearestNeighbors(n_neighbors=k_actual, metric='euclidean')
        knn.fit(features_scaled)

        distances, indices = knn.kneighbors(query_scaled)
        candidates = pool.iloc[indices[0]].copy()
        candidates['_knn_distance'] = distances[0]

        # ── Step 5: Composite score ───────────────────────────────────────
        # proximity  = 1 − norm(distance)    closer   → higher
        # rating     = norm(rating)           higher   → higher
        # fsa        = norm(fsa_score), direction flipped for run=1
        #
        # Weights: proximity 30% | rating 10% | FSA 60%

        def minmax_norm(series: pd.Series) -> pd.Series:
            mn, mx = series.min(), series.max()
            if mx == mn:
                return pd.Series(0.5, index=series.index)
            return (series - mn) / (mx - mn)

        candidates['_proximity']   = 1 - minmax_norm(candidates['_knn_distance'])
        candidates['_rating_norm'] = minmax_norm(candidates[self.rating_col])
        fsa_norm                   = minmax_norm(candidates['fsa_score'])
        candidates['_fsa_norm']    = (1 - fsa_norm) if run == 1 else fsa_norm

        candidates['_composite'] = (
            0.3 * candidates['_proximity'] +
            0.1 * candidates['_rating_norm'] +
            0.6 * candidates['_fsa_norm']
        )

        # ── Step 6: Time + complexity bucket penalties ────────────────────
        # Out-of-bucket recipes lose 25% of composite score each.
        # A recipe outside both buckets gets 0.75 × 0.75 = 0.5625× its score.
        # This keeps them as fallback when nothing better exists but strongly
        # prefers correctly-bucketed candidates.
        t_lo, t_hi = TIME_RANGES[time_bucket]
        c_lo, c_hi = COMPLEXITY_RANGES[complexity_bucket]

        in_time = (candidates['total_minutes'] > t_lo) & (
            candidates['total_minutes'] <= t_hi
            if t_hi != float('inf') else candidates['total_minutes'] > t_lo
        )
        in_complexity = (candidates['ingredient_count'] > c_lo) & (
            candidates['ingredient_count'] <= c_hi
            if c_hi != float('inf') else candidates['ingredient_count'] > c_lo
        )

        candidates.loc[~in_time,       '_composite'] *= 0.60
        candidates.loc[~in_complexity, '_composite'] *= 0.80

        return candidates.nlargest(1, '_composite').iloc[0]

    def get_top_recipes(
        self,
        dish_type: str,
        time_bucket: str,
        complexity_bucket: str,
        run: int,
        n: int = 3,
    ) -> Optional[pd.DataFrame]:
        """
        Return the top-n ranked recipes for a cell instead of just one.

        The scoring is identical to get_recipe — this method simply returns
        the top n rows from the scored candidates DataFrame rather than
        extracting only the first.  Useful for building a shortlist for
        manual curation or presenting multiple options to participants.

        Parameters
        ----------
        n : int
            Number of candidates to return (default 3).
            If fewer than n candidates exist after filtering, all are returned.

        Returns
        -------
        pd.DataFrame with n rows (rank 1 = best), or None if no recipes found.
        Each row includes _composite, _proximity, _rating_norm, _fsa_norm
        so you can see why each recipe was ranked where it was.
        """
        # ── Steps 1–6 are identical to get_recipe ────────────────────────
        health_label = 'healthy' if run == 1 else 'unhealthy'

        base_pool = self.df[
            (self.df['dish_type_normalised'] == dish_type) &
            (self.df['fsa_health_label'] == health_label) &
            (self.df[self.rating_col] > 0) &
            (self.df['ingredient_count'] >= 3)
        ].copy()

        if len(base_pool) == 0:
            return None

        pool = base_pool[base_pool[self.rating_col] >= 4.0]
        if len(pool) < 3:
            pool = base_pool

        time_midpoints, complexity_midpoints = self._get_midpoints(dish_type)
        time_val       = time_midpoints.get(time_bucket)
        complexity_val = complexity_midpoints.get(complexity_bucket)

        if time_val is None or complexity_val is None:
            raise ValueError(
                f"Unknown bucket: time='{time_bucket}', "
                f"complexity='{complexity_bucket}'"
            )

        full_dish_pool = self.df[
            self.df['dish_type_normalised'] == dish_type
        ][['total_minutes', 'ingredient_count']].dropna()

        scaler = MinMaxScaler()
        scaler.fit(full_dish_pool)

        features_scaled = scaler.transform(
            pool[['total_minutes', 'ingredient_count']]
        )
        query_scaled = scaler.transform(
            pd.DataFrame(
                [[time_val, complexity_val]],
                columns=['total_minutes', 'ingredient_count']
            )
        )

        k_actual = min(self.k, len(pool))
        knn = NearestNeighbors(n_neighbors=k_actual, metric='euclidean')
        knn.fit(features_scaled)

        distances, indices = knn.kneighbors(query_scaled)
        candidates = pool.iloc[indices[0]].copy()
        candidates['_knn_distance'] = distances[0]

        def minmax_norm(series: pd.Series) -> pd.Series:
            mn, mx = series.min(), series.max()
            if mx == mn:
                return pd.Series(0.5, index=series.index)
            return (series - mn) / (mx - mn)

        candidates['_proximity']   = 1 - minmax_norm(candidates['_knn_distance'])
        candidates['_rating_norm'] = minmax_norm(candidates[self.rating_col])
        fsa_norm                   = minmax_norm(candidates['fsa_score'])
        candidates['_fsa_norm']    = (1 - fsa_norm) if run == 1 else fsa_norm

        candidates['_composite'] = (
            0.3 * candidates['_proximity'] +
            0.2 * candidates['_rating_norm'] +
            0.5 * candidates['_fsa_norm']
        )

        t_lo, t_hi = TIME_RANGES[time_bucket]
        c_lo, c_hi = COMPLEXITY_RANGES[complexity_bucket]

        in_time = (candidates['total_minutes'] > t_lo) & (
            candidates['total_minutes'] <= t_hi
            if t_hi != float('inf') else candidates['total_minutes'] > t_lo
        )
        in_complexity = (candidates['ingredient_count'] > c_lo) & (
            candidates['ingredient_count'] <= c_hi
            if c_hi != float('inf') else candidates['ingredient_count'] > c_lo
        )

        candidates.loc[~in_time,       '_composite'] *= 0.75
        candidates.loc[~in_complexity, '_composite'] *= 0.75

        # ── Return top-n instead of just top-1 ───────────────────────────
        top = candidates.nlargest(n, '_composite').copy()
        top.insert(0, 'rank', range(1, len(top) + 1))
        return top.reset_index(drop=True)

    # ─────────────────────────────────────────────
    # Simulation: all combinations (single best recipe per cell)
    # ─────────────────────────────────────────────
    def simulate_all_combinations(self) -> pd.DataFrame:
        """
        Run recommender across ALL combinations of:
            dish_type × time_bucket × complexity_bucket × run (1 or 2)

        Returns one row per cell (the top-ranked recipe).
        For a shortlist of multiple recipes per cell use
        simulate_all_combinations_shortlist().
        """
        dish_types         = sorted(self.df['dish_type_normalised'].dropna().unique())
        time_buckets       = list(TIME_RANGES.keys())
        complexity_buckets = list(COMPLEXITY_RANGES.keys())
        runs               = [1, 2]

        rows = []

        for dish, time_b, complex_b, run in product(
            dish_types, time_buckets, complexity_buckets, runs
        ):
            recipe = self.get_recipe(dish, time_b, complex_b, run)

            if recipe is None:
                rows.append({
                    'dish_type':          dish,
                    'time_bucket':        time_b,
                    'complexity_bucket':  complex_b,
                    'run':                run,
                    'health_label':       'healthy' if run == 1 else 'unhealthy',
                    'recipe_name':        '⚠️ NO MATCH',
                    'rating':             np.nan,
                    'total_minutes':      np.nan,
                    'ingredient_count':   np.nan,
                    'fsa_score':          np.nan,
                    'url':                np.nan,
                    'time_match':         np.nan,
                    'complexity_match':   np.nan,
                    'rating_ok':          np.nan,
                    'all_conditions_met': np.nan,
                })
            else:
                actual_mins   = recipe.get('total_minutes',    np.nan)
                actual_ing    = recipe.get('ingredient_count', np.nan)
                actual_rating = recipe.get(self.rating_col,    np.nan)

                t_lo, t_hi = TIME_RANGES[time_b]
                c_lo, c_hi = COMPLEXITY_RANGES[complex_b]

                time_match = bool(
                    t_lo < actual_mins <= t_hi
                    if t_hi != float('inf') else actual_mins > t_lo
                ) if pd.notna(actual_mins) else False

                complexity_match = bool(
                    c_lo < actual_ing <= c_hi
                    if c_hi != float('inf') else actual_ing > c_lo
                ) if pd.notna(actual_ing) else False

                rating_ok = bool(actual_rating >= 4.0) if pd.notna(actual_rating) else False
                all_met   = time_match and complexity_match and rating_ok

                rows.append({
                    'dish_type':          dish,
                    'time_bucket':        time_b,
                    'complexity_bucket':  complex_b,
                    'run':                run,
                    'health_label':       recipe.get('fsa_health_label', ''),
                    'recipe_name':        recipe.get('name', ''),
                    'rating':             actual_rating,
                    'total_minutes':      actual_mins,
                    'ingredient_count':   actual_ing,
                    'fsa_score':          recipe.get('fsa_score', np.nan),
                    'url':                recipe.get('url', ''),
                    'time_match':         time_match,
                    'complexity_match':   complexity_match,
                    'rating_ok':          rating_ok,
                    'all_conditions_met': all_met,
                })

        return pd.DataFrame(rows)

    # ─────────────────────────────────────────────
    # Simulation: shortlist (top-n recipes per cell)
    # ─────────────────────────────────────────────
    def simulate_all_combinations_shortlist(self, n: int = 3) -> pd.DataFrame:
        """
        Like simulate_all_combinations but returns the top-n ranked recipes
        per cell instead of just one. Each cell produces n rows, identified
        by the 'rank' column (1 = best scoring).

        Useful for:
        - Manual curation of the final stimulus set
        - Checking whether rank-2/3 recipes would better satisfy constraints
        - Identifying cells where only 1-2 valid options exist

        Parameters
        ----------
        n : int
            Number of candidates per cell (default 3).
        """
        dish_types         = sorted(self.df['dish_type_normalised'].dropna().unique())
        time_buckets       = list(TIME_RANGES.keys())
        complexity_buckets = list(COMPLEXITY_RANGES.keys())
        runs               = [1, 2]

        all_rows = []

        for dish, time_b, complex_b, run in product(
            dish_types, time_buckets, complexity_buckets, runs
        ):
            shortlist = self.get_top_recipes(dish, time_b, complex_b, run, n=n)

            if shortlist is None:
                all_rows.append({
                    'dish_type':          dish,
                    'time_bucket':        time_b,
                    'complexity_bucket':  complex_b,
                    'run':                run,
                    'rank':               np.nan,
                    'health_label':       'healthy' if run == 1 else 'unhealthy',
                    'recipe_name':        '⚠️ NO MATCH',
                    'rating':             np.nan,
                    'total_minutes':      np.nan,
                    'ingredient_count':   np.nan,
                    'fsa_score':          np.nan,
                    'composite_score':    np.nan,
                    'url':                np.nan,
                    'time_match':         np.nan,
                    'complexity_match':   np.nan,
                    'rating_ok':          np.nan,
                    'all_conditions_met': np.nan,
                })
            else:
                t_lo, t_hi = TIME_RANGES[time_b]
                c_lo, c_hi = COMPLEXITY_RANGES[complex_b]

                for _, recipe in shortlist.iterrows():
                    actual_mins   = recipe.get('total_minutes',    np.nan)
                    actual_ing    = recipe.get('ingredient_count', np.nan)
                    actual_rating = recipe.get(self.rating_col,    np.nan)

                    time_match = bool(
                        t_lo < actual_mins <= t_hi
                        if t_hi != float('inf') else actual_mins > t_lo
                    ) if pd.notna(actual_mins) else False

                    complexity_match = bool(
                        c_lo < actual_ing <= c_hi
                        if c_hi != float('inf') else actual_ing > c_lo
                    ) if pd.notna(actual_ing) else False

                    rating_ok = bool(actual_rating >= 4.0) if pd.notna(actual_rating) else False
                    all_met   = time_match and complexity_match and rating_ok

                    all_rows.append({
                        'dish_type':          dish,
                        'time_bucket':        time_b,
                        'complexity_bucket':  complex_b,
                        'run':                run,
                        'rank':               recipe.get('rank', np.nan),
                        'health_label':       recipe.get('fsa_health_label', ''),
                        'recipe_name':        recipe.get('name', ''),
                        'rating':             actual_rating,
                        'total_minutes':      actual_mins,
                        'ingredient_count':   actual_ing,
                        'fsa_score':          recipe.get('fsa_score', np.nan),
                        'composite_score':    recipe.get('_composite', np.nan),
                        'url':                recipe.get('url', ''),
                        'time_match':         time_match,
                        'complexity_match':   complexity_match,
                        'rating_ok':          rating_ok,
                        'all_conditions_met': all_met,
                    })

        return pd.DataFrame(all_rows)

    # ─────────────────────────────────────────────
    # Coverage check
    # ─────────────────────────────────────────────
    def coverage_report(self) -> pd.DataFrame:
        """Show recipe counts per dish_type × health_label."""
        return (
            self.df
            .groupby(['dish_type_normalised', 'fsa_health_label'])
            .size()
            .unstack(fill_value=0)
            .rename_axis('dish_type')
            .reset_index()
        )

    # ─────────────────────────────────────────────
    # Quality summary
    # ─────────────────────────────────────────────
    def quality_summary(self, results: pd.DataFrame) -> None:
        """Print a quality summary from simulate_all_combinations output."""
        valid = results[results['recipe_name'] != '⚠️ NO MATCH']
        total = len(valid)

        print(f"Total combinations : {len(results)}  (valid: {total})")
        print(f"Time match         : {valid['time_match'].sum():.0f} / {total}"
              f"  ({valid['time_match'].mean()*100:.1f}%)")
        print(f"Complexity match   : {valid['complexity_match'].sum():.0f} / {total}"
              f"  ({valid['complexity_match'].mean()*100:.1f}%)")
        print(f"Rating >= 4        : {valid['rating_ok'].sum():.0f} / {total}"
              f"  ({valid['rating_ok'].mean()*100:.1f}%)")
        print(f"All conditions met : {valid['all_conditions_met'].sum():.0f} / {total}"
              f"  ({valid['all_conditions_met'].mean()*100:.1f}%)")

        print("\nBy run:")
        print(
            valid.groupby('run')[
                ['time_match', 'complexity_match', 'rating_ok', 'all_conditions_met']
            ].mean().round(3) * 100
        )

        print("\nBy dish type (all_conditions_met %):")
        print(
            valid.groupby('dish_type')['all_conditions_met']
            .mean()
            .mul(100)
            .round(1)
            .sort_values()
            .to_string()
        )

        failures = valid[~valid['all_conditions_met']]
        print(f"\nPartial failures: {len(failures)}")
        print(
            failures[[
                'dish_type', 'time_bucket', 'complexity_bucket', 'run',
                'recipe_name', 'total_minutes', 'ingredient_count',
                'rating', 'time_match', 'complexity_match', 'rating_ok'
            ]].to_string()
        )