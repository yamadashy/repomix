export function createPoint({ x = 0, y = 0 }: { x?: number; y?: number }): { x: number; y: number } {
  return { x, y };
}

export function sum(
  values: number[],
  initial = 0,
): number {
  return values.reduce((acc, value) => acc + value, initial);
}

class Store {
  load(options: { force: boolean } = { force: false }): Promise<void> {
    return fetchData(options);
  }
}

const render = ({ title }: Props) => (
  `<h1>${title}</h1>`
);

export const first = () => 1, second = () => {
  return 2;
};
