import { useState } from 'react';

type CounterProps = { initial: number; label: string };

/**
 * A counter with a link to its docs
 */
export function Counter({ initial, label }: CounterProps) {
  const [count, setCount] = useState(initial);
  return (
    <div className="counter">
      <a href="https://example.com/docs">Docs at https://example.com/docs</a>
      <button onClick={() => setCount(count + 1)}>{label}</button>
    </div>
  );
}

// Doubles a value
export const double = (value: number): number => value * 2;

export class Store {
  private items: string[] = [];
  add(item: string): void {
    this.items.push(item);
  }
}
