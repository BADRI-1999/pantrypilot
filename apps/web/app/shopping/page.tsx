'use client';

import { useEffect, useState } from 'react';
import { api, type ShoppingItem } from '@/lib/api';
import { ErrorBox } from '../page';

export default function ShoppingPage() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setItems(await api<ShoppingItem[]>('/api/shopping'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function setStatus(item: ShoppingItem, status: string) {
    await api(`/api/shopping/${item.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    load();
  }

  function exportList() {
    const text = items
      .filter((i) => i.status !== 'dismissed')
      .map((i) => `• ${i.foodEntity.name} — ${Math.round(i.suggestedQty)} ${i.unit}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  }

  if (error) return <ErrorBox message={error} />;

  const active = items.filter((i) => i.status !== 'dismissed');

  return (
    <>
      <h1>Shopping List</h1>
      <p className="subtitle">Auto-built from items that ran low, ran out, or are expiring.</p>

      {active.length === 0 ? (
        <div className="empty">Nothing to buy right now. 🎉</div>
      ) : (
        <div className="card">
          <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 12 }}>
            <button className="ghost sm" onClick={exportList}>📋 Copy list</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Suggested qty</th>
                <th>Reason</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {active.map((i) => (
                <tr key={i.id} style={{ opacity: i.status === 'accepted' ? 0.6 : 1 }}>
                  <td>{i.foodEntity.name}</td>
                  <td>
                    {Math.round(i.suggestedQty)} {i.unit}
                  </td>
                  <td>
                    <span className={`badge ${i.reason}`}>{i.reason}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                      <button className="sm" onClick={() => setStatus(i, 'accepted')}>
                        {i.status === 'accepted' ? '✓ In cart' : 'Add'}
                      </button>
                      <button className="sm ghost" onClick={() => setStatus(i, 'dismissed')}>
                        Dismiss
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
