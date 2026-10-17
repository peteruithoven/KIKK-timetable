const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const STORAGE_KEY = "kikk-timetable-zoom";

/**
 * Pinching on the timetable (or Ctrl + scroll and trackpad pinch) stretches time vertically
 * instead of zooming the page. The element marked `data-timeline` is used to keep the moment
 * under the fingers in place.
 */
export function useVerticalZoom(scroller: Readonly<Ref<HTMLElement | null>>) {
  const zoom = ref(1);

  // Several touch moves can happen per frame: combine them and apply once per frame.
  let pending: { factor: number; clientY: number } | null = null;

  function zoomAt(factor: number, clientY: number) {
    if (pending) {
      pending.factor *= factor;
      pending.clientY = clientY;
      return;
    }
    pending = { factor, clientY };
    requestAnimationFrame(apply);
  }

  async function apply() {
    const el = scroller.value;
    const timeline = el?.querySelector("[data-timeline]");
    if (!el || !timeline || !pending) return;
    const { factor, clientY } = pending;
    pending = null;
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value * factor));
    if (next === zoom.value) return;
    const ratio = next / zoom.value;
    const offset = clientY - timeline.getBoundingClientRect().top;
    zoom.value = next;
    await nextTick();
    el.scrollTop += offset * (ratio - 1);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Not remembered, that's fine.
    }
  }

  let lastDistance: number | null = null;
  const distance = (touches: TouchList) =>
    Math.hypot(
      touches[0]!.clientX - touches[1]!.clientX,
      touches[0]!.clientY - touches[1]!.clientY,
    );

  function onTouchStart(event: TouchEvent) {
    lastDistance = event.touches.length === 2 ? distance(event.touches) : null;
  }
  function onTouchMove(event: TouchEvent) {
    if (event.touches.length !== 2) return;
    // Stops the browser's own pinch zoom.
    event.preventDefault();
    const current = distance(event.touches);
    if (lastDistance) {
      zoomAt(current / lastDistance, (event.touches[0]!.clientY + event.touches[1]!.clientY) / 2);
    }
    lastDistance = current;
  }
  function onTouchEnd(event: TouchEvent) {
    if (event.touches.length < 2) lastDistance = null;
  }
  function onWheel(event: WheelEvent) {
    // Trackpad pinches arrive as wheel events with ctrlKey set.
    if (!event.ctrlKey) return;
    event.preventDefault();
    zoomAt(Math.exp(-event.deltaY * 0.01), event.clientY);
  }
  // Safari's own pinch gesture events.
  const preventDefault = (event: Event) => event.preventDefault();

  onMounted(() => {
    try {
      const saved = Number(localStorage.getItem(STORAGE_KEY));
      if (saved >= MIN_ZOOM && saved <= MAX_ZOOM) zoom.value = saved;
    } catch {
      // Starts at the default.
    }
    const el = scroller.value;
    if (!el) return;
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", preventDefault);
    el.addEventListener("gesturechange", preventDefault);
  });

  onBeforeUnmount(() => {
    const el = scroller.value;
    if (!el) return;
    el.removeEventListener("touchstart", onTouchStart);
    el.removeEventListener("touchmove", onTouchMove);
    el.removeEventListener("touchend", onTouchEnd);
    el.removeEventListener("touchcancel", onTouchEnd);
    el.removeEventListener("wheel", onWheel);
    el.removeEventListener("gesturestart", preventDefault);
    el.removeEventListener("gesturechange", preventDefault);
  });

  return zoom;
}
