// recommenderClient.js
import { spawn } from "child_process";

/**
 * Call the unified recipe recommender (recommend.py → recipe_recommender.py).
 *
 * @param {object} slots   - { dish_type, total_time, complexity }
 * @param {number} run     - 1 = healthy, 2 = unhealthy (default 1)
 * @param {number} n       - number of recipes to return (default 3)
 */
export function callRecipeRecommender(slots, run = 1, n = 3) {
  return new Promise((resolve, reject) => {
    const py = spawn("python3", ["recommend.py"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (d) => (stdout += d.toString()));
    py.stderr.on("data", (d) => (stderr += d.toString()));

    py.on("close", (code) => {
      if (code !== 0) {
        return reject(
          new Error(stderr || `recommend.py exited with code ${code}`)
        );
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (e) {
        reject(
          new Error(`Failed to parse recommend.py output.\nRaw: ${stdout}`)
        );
      }
    });

    py.stdin.write(JSON.stringify({ ...slots, run, n }));
    py.stdin.end();
  });
}

export function formatRecipeText(recipes) {
  if (!Array.isArray(recipes) || recipes.length === 0) {
    return "I couldn't find close matches in the dataset. Would you like to adjust your preferences?";
  }

  const cleanTitle = (title) => {
    if (!title) return null;
    return String(title).trim().replace(/\s+Recipe$/i, "");
  };

  const prettyTime = (s) => {
    if (!s) return null;
    return String(s).trim().replace(/(\d+)\s*[–-]\s*(\d+)/g, "$1 to $2");
  };

  let output =
    "Here are some recipe recommendations for you. Please view the recipes that interest you most by clicking on View Recipe and take a moment to explore them. When you are ready, type done to continue. Have fun!:\n";

  recipes.forEach((r, i) => {
    const rawTitle = r.name ?? r.title ?? r.recipe_name ?? `Recipe ${i + 1}`;
    const title     = cleanTitle(rawTitle);
    const dishType  = r.dish_type_normalised ?? r.dish_type ?? null;

    const totalTime = prettyTime(r.total ?? r.total_time ?? null);
    const link      = r.url ?? r.link ?? r.recipe_url ?? null;

    let line = `Recipe ${i + 1}. ${title}`;
    if (dishType) line += `: ${dishType}`;
    if (totalTime) line += `, takes ${totalTime}`;
    line += ".";

    if (link) line += `\n[View Recipe](${link})`;

    output += line + "\n\n";
  });

  return output.trim();
}
