/**
 * Detects URL changes in single-page apps (approved decision 12): wraps history.pushState and
 * history.replaceState (calling the originals unchanged), and listens to popstate/hashchange.
 * Changes are debounced and reported only when the pathname actually changed.
 */
export function watchUrl(onChange: (pathname: string) => void, debounceMs = 150): () => void {
  let last = location.pathname;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const check = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (location.pathname !== last) {
        last = location.pathname;
        onChange(last);
      }
    }, debounceMs);
  };

  const originalPush = history.pushState;
  const originalReplace = history.replaceState;
  const wrappedPush: typeof history.pushState = function (this: History, ...args) {
    const result = originalPush.apply(this, args);
    check();
    return result;
  };
  const wrappedReplace: typeof history.replaceState = function (this: History, ...args) {
    const result = originalReplace.apply(this, args);
    check();
    return result;
  };
  history.pushState = wrappedPush;
  history.replaceState = wrappedReplace;
  window.addEventListener("popstate", check);
  window.addEventListener("hashchange", check);

  return () => {
    if (timer) clearTimeout(timer);
    // Only restore if nobody wrapped history after us; otherwise we'd drop their wrapper.
    if (history.pushState === wrappedPush) history.pushState = originalPush;
    if (history.replaceState === wrappedReplace) history.replaceState = originalReplace;
    window.removeEventListener("popstate", check);
    window.removeEventListener("hashchange", check);
  };
}
