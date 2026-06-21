'use client';

import { useEffect, useRef, useState } from 'react';
import { api, API_URL, type Recipe, type MealLog } from '@/lib/api';
import { ErrorBox } from '../page';

interface Suggestion {
  dishName: string;
  servings: number;
  confidence: number;
  ingredients: { name: string; quantity: number; unit: string; foodEntityId: string | null }[];
}

export default function MealsPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [recipeId, setRecipeId] = useState('');
  const [servings, setServings] = useState(2);
  const [eaters, setEaters] = useState(2);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggestImage, setSuggestImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const [r, m] = await Promise.all([api<Recipe[]>('/api/recipes'), api<MealLog[]>('/api/meals')]);
      setRecipes(r);
      setMeals(m);
      if (!recipeId && r.length) setRecipeId(r[0].id);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function logRecipe() {
    if (!recipeId) return;
    setBusy(true);
    try {
      const res = await api<{ nutrition: { calories: number; protein: number } }>('/api/meals', {
        method: 'POST',
        body: JSON.stringify({ recipeId, servings, eaters }),
      });
      flash(`Logged! ${Math.round(res.nutrition.calories)} kcal, ${Math.round(res.nutrition.protein)}g protein. Pantry updated.`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function suggestFromPhoto(file: File) {
    setBusy(true);
    setSuggestion(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${API_URL}/api/meals/suggest`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSuggestImage(data.imagePath ?? null);
      if (data.suggestion) setSuggestion(data.suggestion);
      else flash(data.message ?? 'No suggestion available.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logSuggestion() {
    if (!suggestion) return;
    setBusy(true);
    try {
      const ingredients = suggestion.ingredients
        .filter((i) => i.foodEntityId)
        .map((i) => ({ foodEntityId: i.foodEntityId as string, quantity: i.quantity }));
      const res = await api<{ nutrition: { calories: number; protein: number } }>('/api/meals', {
        method: 'POST',
        body: JSON.stringify({
          name: suggestion.dishName,
          servings: suggestion.servings,
          eaters,
          imagePath: suggestImage,
          ingredients,
        }),
      });
      flash(`Logged ${suggestion.dishName}! ${Math.round(res.nutrition.protein)}g protein.`);
      setSuggestion(null);
      setSuggestImage(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorBox message={error} />;

  return (
    <>
      <h1>Log a Meal</h1>
      <p className="subtitle">Pick a recipe, or snap the dish — we pre-fill, you confirm before anything is deducted.</p>

      <div className="grid cols-2">
        <div className="card">
          <h2>From a recipe</h2>
          <div className="field">
            <label>Recipe</label>
            <select value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} (base {r.servings} servings)
                </option>
              ))}
            </select>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}>
              <label>Servings made</label>
              <input type="number" min={0.5} step={0.5} value={servings} onChange={(e) => setServings(Number(e.target.value))} />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Eaters</label>
              <input type="number" min={1} value={eaters} onChange={(e) => setEaters(Number(e.target.value))} />
            </div>
          </div>
          <button onClick={logRecipe} disabled={busy || !recipeId}>
            {busy ? 'Logging…' : 'Log & deduct from pantry'}
          </button>
        </div>

        <div className="card">
          <h2>From a photo (assistive)</h2>
          <div className="dropzone" onClick={() => fileRef.current?.click()}>
            {busy ? 'Looking at your dish…' : '🍲 Snap a cooked dish'}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && suggestFromPhoto(e.target.files[0])}
            />
          </div>

          {suggestion && (
            <div style={{ marginTop: 14 }}>
              <strong>{suggestion.dishName}</strong>{' '}
              <span className="conf">~{suggestion.servings} servings · {Math.round(suggestion.confidence * 100)}% confident</span>
              <table style={{ marginTop: 10 }}>
                <tbody>
                  {suggestion.ingredients.map((ing, i) => (
                    <tr key={i}>
                      <td>{ing.name}</td>
                      <td className="muted">{Math.round(ing.quantity)} {ing.unit}</td>
                      <td>{ing.foodEntityId ? <span className="badge ok">resolved</span> : <span className="badge low">new</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button style={{ marginTop: 12 }} onClick={logSuggestion} disabled={busy}>
                Confirm & log
              </button>
            </div>
          )}
        </div>
      </div>

      <h2 style={{ marginTop: 28, fontSize: 16 }}>Recent meals</h2>
      {meals.length === 0 ? (
        <p className="muted">No meals logged yet.</p>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Meal</th>
                <th>Servings</th>
                <th>Calories</th>
                <th>Protein</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {meals.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td className="muted">{m.servings}</td>
                  <td>{Math.round(m.calories)} kcal</td>
                  <td>{Math.round(m.protein)}g</td>
                  <td className="muted">{new Date(m.loggedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
