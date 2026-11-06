import type { AgentIdeApi } from '../../shared/ipc-contract';

declare global {
  interface Window {
    /** Frozen capability object exposed by the sandboxed preload. */
    readonly agentIde: AgentIdeApi;
  }
}

export {};
