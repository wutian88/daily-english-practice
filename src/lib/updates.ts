interface UpdateWorker {
  state: string;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

interface UpdateRegistration {
  waiting: UpdateWorker | null;
  installing: UpdateWorker | null;
  update(): Promise<unknown>;
}

// update() may resolve while the new worker is still downloading its cache.
// Do not report "up to date" until that installation has finished.
export async function checkWaitingUpdate(registration: UpdateRegistration, timeoutMs = 20_000): Promise<boolean> {
  if (registration.waiting) return true;
  if (!registration.installing) await registration.update();
  if (registration.waiting) return true;
  const worker = registration.installing;
  if (!worker) return false;

  return new Promise<boolean>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer);
      worker.removeEventListener('statechange', onStateChange);
      if (error) reject(error);
      else resolve(Boolean(registration.waiting));
    };
    const onStateChange = () => {
      if (worker.state === 'redundant') finish(new Error('更新下载失败，请稍后重试'));
      else if (worker.state === 'installed' || worker.state === 'activated') finish();
    };
    const timer = setTimeout(() => finish(new Error('更新下载仍在进行，请稍后再检查')), timeoutMs);
    worker.addEventListener('statechange', onStateChange);
    onStateChange();
  });
}
