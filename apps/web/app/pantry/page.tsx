'use client';

import { useEffect, useState } from 'react';
import { api, type InventoryItem } from '@/lib/api';
import { ErrorBox } from '../page';

export default function PantryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');

  async function load() {
    try {
      setItems(await api<InventoryItem[]>('/api/inventory'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function reconcile(item: InventoryItem) {
    const qty = Number(editQty);
    if (Number.isNaN(qty)) return;
    await api('/api/inventory/reconcile', {
      method: 'POST',
      body: JSON.stringify({ foodEntityId: item.foodEntity.id, newQuantity: qty, unit: item.unit }),
    });
    setEditing(null);
    setEditQty('');
    load();
  }

  async function remove(item: InventoryItem) {
    if (!confirm(`Remove ${item.foodEntity.name} from your pantry?`)) return;
    await api(`/api/inventory/${item.foodEntity.id}`, { method: 'DELETE' });
    load();
  }

  if (error) return <ErrorBox message={error} />;

  return (
    <>
      <h1>Pantry</h1>
      <p className="subtitle">Live inventory. Quantities drift — tap “Pantry check” to reconcile.</p>

      {items.length === 0 ? (
        <div className="empty">Pantry is empty. Scan a receipt to populate it.</div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Runs out in</th>
                <th>Expires</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td>{i.foodEntity.name}</td>
                  <td className="muted">{i.foodEntity.category}</td>
                  <td>
                    {editing === i.id ? (
                      <div className="row" style={{ gap: 6 }}>
                        <input
                          style={{ width: 90 }}
                          type="number"
                          value={editQty}
                          onChange={(e) => setEditQty(e.target.value)}
                          autoFocus
                        />
                        <button className="sm" onClick={() => reconcile(i)}>Save</button>
                        <button className="sm ghost" onClick={() => setEditing(null)}>×</button>
                      </div>
                    ) : (
                      <strong>
                        {Math.round(i.quantity)} {i.unit}
                      </strong>
                    )}
                  </td>
                  <td className="muted">{i.runoutDays != null ? `~${i.runoutDays} days` : '—'}</td>
                  <td className="muted">{i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : '—'}</td>
                  <td style={{ textAlign: 'right' }}>
                    {editing !== i.id && (
                      <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="sm ghost"
                          onClick={() => {
                            setEditing(i.id);
                            setEditQty(String(Math.round(i.quantity)));
                          }}
                        >
                          Pantry check
                        </button>
                        <button className="sm ghost" onClick={() => remove(i)}>
                          Remove
                        </button>
                      </div>
                    )}
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
