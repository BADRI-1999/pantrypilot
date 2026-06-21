'use client';

import { useEffect, useState } from 'react';
import { api, type CookableRecipe } from '@/lib/api';
import { ErrorBox } from '../page';

export default function CookPage() {
  const [recipes, setRecipes] = useState<CookableRecipe[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setRecipes(await api<CookableRecipe[]>('/api/recipes/cookable'));
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  if (error) return <ErrorBox message={error} />;

  return (
    <>
      <h1>Cook Now</h1>
      <p className="subtitle">Recipes ranked by what your pantry can already make.</p>

      <div className="grid cols-2">
        {recipes.map(({ recipe, coverage, have, total, missing }) => (
          <div className="card" key={recipe.id}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <strong style={{ fontSize: 16 }}>{recipe.name}</strong>
              <span className={`badge ${coverage === 1 ? 'ok' : 'low'}`}>{Math.round(coverage * 100)}%</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 10px' }}>
              {have}/{total} ingredients in stock · base {recipe.servings} servings
            </p>
            <div className="bar">
              <span style={{ width: `${coverage * 100}%` }} />
            </div>
            {missing.length > 0 && (
              <p className="muted" style={{ marginTop: 10 }}>
                Missing: {missing.join(', ')}
              </p>
            )}
            {coverage === 1 && <p style={{ color: 'var(--accent)', marginTop: 10 }}>✓ Ready to cook</p>}
          </div>
        ))}
      </div>
    </>
  );
}
