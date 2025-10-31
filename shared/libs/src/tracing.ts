// Minimal tracing shim (placeholder for OpenTelemetry)
export async function startSpan<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    return await fn();
  } finally {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ts: new Date().toISOString(), span: name, durationMs: Date.now() - start }));
  }
}


