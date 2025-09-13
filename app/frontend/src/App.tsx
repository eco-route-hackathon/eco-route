import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

function App() {
  const [origin, setOrigin] = useState('TOKYO');
  const [destination, setDestination] = useState('OSAKA');
  const [weightKg, setWeightKg] = useState(1000);
  const [co2, setCo2] = useState(0.34);
  const [time, setTime] = useState(0.33);
  const [cost, setCost] = useState(0.33);
  const [apiResult, setApiResult] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    setApiResult(null);
    setApiError(null);
    try {
      const dummyBody = {
        origin,
        destination,
        weightKg: Number(weightKg),
        weights: { co2: Number(co2), time: Number(time), cost: Number(cost) },
      };
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dummyBody),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setApiResult(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setApiError(e.message || 'API error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1>Eco Route API テスト</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          testApi();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}
      >
        <label>
          origin:
          <input
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            style={{ marginLeft: 8 }}
          />
        </label>
        <label>
          destination:
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            style={{ marginLeft: 8 }}
          />
        </label>
        <label>
          weightKg:
          <input
            type="number"
            value={weightKg}
            onChange={(e) => setWeightKg(Number(e.target.value))}
            style={{ marginLeft: 8 }}
          />
        </label>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <label>
            weights.co2:
            <input
              type="number"
              step="any"
              value={co2}
              onChange={(e) => setCo2(Number(e.target.value))}
              style={{ marginLeft: 8, width: 80 }}
            />
          </label>
          <label>
            weights.time:
            <input
              type="number"
              step="any"
              value={time}
              onChange={(e) => setTime(Number(e.target.value))}
              style={{ marginLeft: 8, width: 80 }}
            />
          </label>
          <label>
            weights.cost:
            <input
              type="number"
              step="any"
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
              style={{ marginLeft: 8, width: 80 }}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{ padding: '0.5rem 1rem', fontSize: '1rem', alignSelf: 'flex-start' }}
        >
          {loading ? '通信中...' : '/api/compare にリクエスト'}
        </button>
      </form>
      <div style={{ marginTop: '2rem' }}>
        {apiResult && (
          <div>
            <h2>APIレスポンス</h2>
            <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: 4 }}>
              {apiResult}
            </pre>
          </div>
        )}
        {apiError && (
          <div style={{ color: 'red' }}>
            <h2>エラー</h2>
            <pre>{apiError}</pre>
          </div>
        )}
      </div>
      <hr style={{ margin: '2rem 0' }} />
      <div>
        <a href="https://vite.dev" target="_blank" rel="noopener noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p className="read-the-docs">Click on the Vite and React logos to learn more</p>
    </div>
  );
}

export default App;
