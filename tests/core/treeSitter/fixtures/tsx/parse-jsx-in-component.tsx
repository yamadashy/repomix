import { useState } from 'react';

type CounterProps = { initial: number; label: string };

export function Counter({ initial, label }: CounterProps) {
  const [count, setCount] = useState(initial);
  return (
    <div className="counter">
      <a href="https://example.com/docs">Docs at https://example.com/docs</a>
      <button onClick={() => setCount(count + 1)}>{label}</button>
    </div>
  );
}

export const Badge = ({ text }: { text: string }) => <span className="badge">{text}</span>;
