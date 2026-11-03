// Plain-JS stand-in for securityCheckWorker, loaded by a real Tinypool pool via REPOMIX_WORKER_PATH.
// The real worker is TypeScript and cannot be spawned as a worker from the source tree, so this
// stub flags credentials embedded in URLs, which is enough to observe results crossing the pool.
const URL_CREDENTIALS = /:\/\/[^\s/:@]+:[^\s/@]+@/;

export default async ({ items }) =>
  items.map((item) =>
    URL_CREDENTIALS.test(item.content)
      ? { filePath: item.filePath, messages: ['URL credentials'], type: item.type }
      : null,
  );

export const onWorkerTermination = async () => {};
