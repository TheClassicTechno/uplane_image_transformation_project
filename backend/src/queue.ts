// In-memory async job queue.
type Job = () => Promise<void>;

// FIFO queue for background tasks.
const queue: Job[] = [];
let active = 0;

// Simple in-memory queue with configurable concurrency.
const concurrency = Number(process.env.JOB_CONCURRENCY ?? 2);

const runNext = () => {
  if (active >= concurrency) {
    return;
  }
  const job = queue.shift();
  if (!job) {
    return;
  }

  active += 1;
  job()
    .catch(() => undefined)
    .finally(() => {
      active -= 1;
      runNext();
    });
};

// Enqueue a job and kick the worker loop.
export const enqueue = (job: Job): void => {
  queue.push(job);
  runNext();
};

export const getQueueDepth = (): number => queue.length + active;
