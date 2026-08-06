// Stand-in worker module for the inline task-runner tests: REPOMIX_WORKER_PATH points
// here, and since inline mode runs in-process the test can read the recorded state.

// biome-ignore lint/suspicious/noExplicitAny: task shape is test-defined
export const calls: any[] = [];
let terminations = 0;

export const terminationCount = (): number => terminations;

export const reset = (): void => {
  calls.length = 0;
  terminations = 0;
};

// biome-ignore lint/suspicious/noExplicitAny: task shape is test-defined
export default async function run(task: any): Promise<string> {
  calls.push(task);
  return `done:${task.id}`;
}

export async function onWorkerTermination(): Promise<void> {
  terminations++;
}
