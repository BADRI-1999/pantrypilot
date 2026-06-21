'use client';

import { useEffect, useRef, useState } from 'react';
import { api, API_URL, type Receipt, type ReceiptLine, type FoodEntity } from '@/lib/api';
import { ErrorBox } from '../page';

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [active, setActive] = useState<Receipt | null>(null);
  const [entities, setEntities] = useState<FoodEntity[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const [r, e] = await Promise.all([
        api<Receipt[]>('/api/receipts'),
        api<FoodEntity[]>('/api/food-entities'),
      ]);
      setReceipts(r);
      setEntities(e);
    } catch (err) {
      setError((err as Error).message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await fetch(`${API_URL}/api/receipts/upload`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(await res.text());
      const receipt: Receipt = await res.json();
      setActive(receipt);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function updateLine(line: ReceiptLine, patch: Partial<ReceiptLine>) {
    const updated = await api<ReceiptLine>(`/api/receipts/line/${line.id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    setActive((prev) =>
      prev
        ? { ...prev, lineItems: prev.lineItems.map((l) => (l.id === line.id ? { ...l, ...updated } : l)) }
        : prev,
    );
  }

  async function commit() {
    if (!active) return;
    setBusy(true);
    try {
      await api(`/api/receipts/${active.id}/commit`, { method: 'POST' });
      setActive(null);
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
      <h1>Receipts</h1>
      <p className="subtitle">Snap a grocery bill — we extract items, you confirm, the pantry fills.</p>

      {!active && (
        <>
          <div
            className="dropzone"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) upload(f);
            }}
          >
            {busy ? 'Reading receipt…' : '📷 Click or drop a receipt image to scan'}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </div>

          <h2 style={{ marginTop: 28, fontSize: 16 }}>Recent receipts</h2>
          {receipts.length === 0 ? (
            <p className="muted">No receipts yet.</p>
          ) : (
            <div className="card">
              <table>
                <tbody>
                  {receipts.map((r) => (
                    <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setActive(r)}>
                      <td>{r.merchant ?? 'Receipt'}</td>
                      <td className="muted">{r.lineItems.length} items</td>
                      <td>
                        <span className={`badge ${r.status === 'committed' ? 'ok' : 'manual'}`}>{r.status}</span>
                      </td>
                      <td className="muted">{new Date(r.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {active && (
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2 style={{ margin: 0 }}>Review {active.merchant ? `— ${active.merchant}` : ''}</h2>
            <button className="ghost sm" onClick={() => setActive(null)}>← Back</button>
          </div>
          <p className="muted">Fix anything we got wrong, then commit to add to your pantry.</p>

          {active.lineItems.length === 0 ? (
            <p className="muted">No line items extracted. (Is the OpenAI key set on the API?)</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Resolved to</th>
                  <th>Confidence</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {active.lineItems.map((l) => (
                  <tr key={l.id} style={{ opacity: l.status === 'rejected' ? 0.4 : 1 }}>
                    <td>
                      <input
                        value={l.normalizedName}
                        onChange={(e) => updateLine(l, { normalizedName: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        style={{ width: 70 }}
                        type="number"
                        value={l.quantity}
                        onChange={(e) => updateLine(l, { quantity: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <select value={l.unit} onChange={(e) => updateLine(l, { unit: e.target.value })}>
                        {['kg', 'g', 'l', 'ml', 'pcs'].map((u) => (
                          <option key={u}>{u}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={l.foodEntityId ?? ''}
                        onChange={(e) => updateLine(l, { foodEntityId: e.target.value })}
                      >
                        <option value="">— unresolved —</option>
                        {entities.map((en) => (
                          <option key={en.id} value={en.id}>
                            {en.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="conf">{Math.round(l.confidence * 100)}%</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="sm ghost"
                        onClick={() => updateLine(l, { status: l.status === 'rejected' ? 'pending' : 'rejected' })}
                      >
                        {l.status === 'rejected' ? 'Restore' : 'Skip'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="row" style={{ marginTop: 16 }}>
            <button onClick={commit} disabled={busy || active.status === 'committed'}>
              {active.status === 'committed' ? 'Committed' : busy ? 'Committing…' : 'Commit to pantry'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
