'use client';

import { useEffect, useState } from 'react';
import { api, type NutritionDashboard, type InventoryItem, type ShoppingItem } from '@/lib/api';

export default function DashboardPage() {
  const [n, setN] = useState<NutritionDashboard | null>(null);
  const [lowItems, setLowItems] = useState<ShoppingItem[]>([]);
  const [expiring, setExpiring] = useState<InventoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [nut, shop, inv] = await Promise.all([
          api<NutritionDashboard>('/api/household/nutrition'),
          api<ShoppingItem[]>('/api/shopping'),
          api<InventoryItem[]>('/api/inventory'),
        ]);
        setN(nut);
        setLowItems(shop);
        const soon = Date.now() + 4 * 86400000;
        setExpiring(inv.filter((i) => i.expiryDate && new Date(i.expiryDate).getTime() <= soon));
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!n) return <p className="muted">Loading…</p>;

  const proteinPct = Math.min(100, (n.today.protein / n.targets.protein) * 100);
  const caloriePct = Math.min(100, (n.today.calories / n.targets.calories) * 100);

  return (
    <>
      <h1>Dashboard</h1>
      <p className="subtitle">Your pantry and nutrition at a glance.</p>

      <div className="grid cols-4">
        <Stat label="Protein today" value={`${Math.round(n.today.protein)}g`} sub={`/ ${n.targets.protein}g`} pct={proteinPct} />
        <Stat label="Calories today" value={`${Math.round(n.today.calories)}`} sub={`/ ${n.targets.calories} kcal`} pct={caloriePct} />
        <Stat label="Meals this week" value={`${n.mealsThisWeek}`} sub="logged" />
        <Stat label="To restock" value={`${lowItems.length}`} sub="items" />
      </div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Coaching insights</h2>
          {n.insights.map((i, idx) => (
            <div key={idx} className="insight">{i}</div>
          ))}
        </div>

        <div className="card">
          <h2>7-day protein trend</h2>
          {n.trend.length === 0 ? (
            <p className="muted">No meals logged yet. Log one to see trends.</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
              {n.trend.map((d) => {
                const max = Math.max(...n.trend.map((t) => t.protein), n.targets.protein);
                const h = Math.max(4, (d.protein / max) * 120);
                return (
                  <div key={d.date} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ height: h, background: 'var(--accent)', borderRadius: 5 }} title={`${Math.round(d.protein)}g`} />
                    <small className="muted">{d.date.slice(5)}</small>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid cols-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Running low</h2>
          {lowItems.length === 0 ? (
            <p className="muted">Pantry is well stocked.</p>
          ) : (
            <table>
              <tbody>
                {lowItems.slice(0, 6).map((s) => (
                  <tr key={s.id}>
                    <td>{s.foodEntity.name}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`badge ${s.reason}`}>{s.reason}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h2>Expiring soon</h2>
          {expiring.length === 0 ? (
            <p className="muted">Nothing about to spoil. 🎉</p>
          ) : (
            <table>
              <tbody>
                {expiring.map((i) => (
                  <tr key={i.id}>
                    <td>{i.foodEntity.name}</td>
                    <td style={{ textAlign: 'right' }} className="muted">
                      {new Date(i.expiryDate!).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, sub, pct }: { label: string; value: string; sub: string; pct?: number }) {
  return (
    <div className="card">
      <h2>{label}</h2>
      <div className="stat">
        {value} <small>{sub}</small>
      </div>
      {pct !== undefined && (
        <div className="bar">
          <span style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="card" style={{ borderColor: 'var(--danger)' }}>
      <h2 style={{ color: 'var(--danger)' }}>Couldn’t reach the API</h2>
      <p className="muted">{message}</p>
      <p className="muted">Make sure the API is running on port 4000 (<code>npm run dev:api</code>).</p>
    </div>
  );
}
