/**
 * Some frameworks (e.g. React hydrating <html>) remove unknown nodes that were added while the
 * page was still starting up. This re-attaches our host element if it gets removed, a limited
 * number of times so we never fight the page in a loop.
 */
export function keepAttached(host: HTMLElement, maxReattach = 10): () => void {
  let count = 0;
  const observer = new MutationObserver(() => {
    if (!host.isConnected && count < maxReattach) {
      count++;
      document.documentElement.appendChild(host);
    }
  });
  observer.observe(document.documentElement, { childList: true });
  return () => observer.disconnect();
}
