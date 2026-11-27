/** Placeholder replaced in `src/renderer/index.html` at build/serve time. */
export const CSP_PLACEHOLDER = '__AGENTIC_IDE_CSP__';

export interface CspOptions {
  /** Vite dev server needs an HMR websocket; production never does. */
  readonly dev: boolean;
  /** HTTP header delivery supports directives that `<meta>` ignores (e.g. frame-ancestors). */
  readonly delivery: 'meta' | 'header';
}

/**
 * Builds the renderer Content-Security-Policy.
 *
 * - No remote origins, inline scripts or eval: renderer and model output are untrusted.
 * - `style-src 'unsafe-inline'` is required because Monaco injects `<style>` elements at runtime.
 * - Workers (Monaco) must come from the app origin.
 */
export function buildContentSecurityPolicy(options: CspOptions): string {
  const connectSources = options.dev
    ? ["'self'", 'ws://localhost:*', 'ws://127.0.0.1:*']
    : ["'self'"];
  const directives: (readonly [string, readonly string[]])[] = [
    ['default-src', ["'none'"]],
    ['script-src', ["'self'"]],
    ['style-src', ["'self'", "'unsafe-inline'"]],
    ['img-src', ["'self'", 'data:']],
    ['font-src', ["'self'", 'data:']],
    ['worker-src', ["'self'"]],
    ['connect-src', connectSources],
    ['base-uri', ["'none'"]],
    ['form-action', ["'none'"]],
    ['object-src', ["'none'"]],
    ['frame-src', ["'none'"]],
  ];
  if (options.delivery === 'header') {
    directives.push(['frame-ancestors', ["'none'"]]);
  }
  return directives.map(([name, sources]) => `${name} ${sources.join(' ')}`).join('; ');
}
