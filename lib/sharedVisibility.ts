/**
 * One IntersectionObserver per option set, shared by every element that asks
 * for the same thresholds and margin. Section and Reveal each built their own
 * observer per instance during hydration, which on a long page was a dozen or
 * more observers created inside one task. Each element still gets exactly the
 * callback it had: called once when it first intersects, then unobserved.
 */
type Entry = { io: IntersectionObserver; callbacks: Map<Element, () => void> };
const observers = new Map<string, Entry>();

export function observeFirstVisible(element: Element, options: { threshold: number[]; rootMargin: string }, onVisible: () => void): () => void {
  const key = `${options.rootMargin}|${options.threshold.join(",")}`;
  let entry = observers.get(key);
  if (!entry) {
    const callbacks = new Map<Element, () => void>();
    const io = new IntersectionObserver((records) => {
      for (const record of records) {
        if (!record.isIntersecting) continue;
        const callback = callbacks.get(record.target);
        if (!callback) continue;
        callbacks.delete(record.target);
        io.unobserve(record.target);
        callback();
      }
    }, options);
    entry = { io, callbacks };
    observers.set(key, entry);
  }
  const { io, callbacks } = entry;
  callbacks.set(element, onVisible);
  io.observe(element);
  return () => {
    if (callbacks.delete(element)) io.unobserve(element);
  };
}
