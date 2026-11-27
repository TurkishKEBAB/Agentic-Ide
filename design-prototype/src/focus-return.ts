/** Retain the logical control when a view refresh replaces its DOM node. */
export function captureFocus(fallback: () => void): () => void {
  const target = document.activeElement;
  if (!(target instanceof HTMLElement) || target === document.body) return fallback;
  const owner = target.closest<HTMLElement>('[id]');
  const action = target.dataset.act;
  const value = target.dataset.value;

  return () => {
    if (target.isConnected && target.getClientRects().length && !target.matches(':disabled')) {
      target.focus();
      return;
    }
    if (action && owner?.id) {
      const replacement = Array.from(document.getElementById(owner.id)?.querySelectorAll<HTMLElement>('[data-act]') ?? [])
        .find(element => element.dataset.act === action && element.dataset.value === value);
      if (replacement?.getClientRects().length && !replacement.matches(':disabled')) {
        replacement.focus();
        return;
      }
    }
    fallback();
  };
}
