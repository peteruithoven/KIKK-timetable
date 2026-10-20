// Touches starting this close to a screen edge are left to the system: iOS swipes back and
// forward from there, Android's gesture navigation goes back.
const EDGE = 32;
// Movement before the gesture counts as horizontal or vertical.
const SLOP = 10;

/**
 * Calls `onSwipe` when a finger swipes horizontally across the page: "next" for right to left,
 * "previous" for left to right, like turning pages. Vertical scrolling, pinching, swipes on
 * horizontally scrolling content (a gallery or a zoomed in photo) and on a zoomed in page are
 * left alone. Swipes in an open dialog (the photo viewer) only count for the dialog itself, as
 * `target`.
 */
export function useSwipeNavigation(
  onSwipe: (direction: "previous" | "next") => void,
  target?: Readonly<Ref<HTMLElement | null>>,
) {
  let start: { x: number; y: number } | null = null;
  let horizontal = false;

  function onTouchStart(event: TouchEvent) {
    const touch = event.touches[0]!;
    start =
      event.touches.length === 1 &&
      touch.clientX > EDGE &&
      touch.clientX < window.innerWidth - EDGE &&
      (window.visualViewport?.scale ?? 1) <= 1.01 &&
      !inHorizontalScroller(event.target) &&
      (target || !(event.target instanceof Element && event.target.closest("dialog[open]")))
        ? { x: touch.clientX, y: touch.clientY }
        : null;
    horizontal = false;
  }

  function onTouchMove(event: TouchEvent) {
    if (!start) return;
    if (event.touches.length !== 1) {
      start = null;
      return;
    }
    const dx = Math.abs(event.touches[0]!.clientX - start.x);
    const dy = Math.abs(event.touches[0]!.clientY - start.y);
    if (horizontal || Math.max(dx, dy) < SLOP) return;
    // Decided once: a scroll that drifts sideways doesn't become a swipe.
    if (dx > dy * 1.5) horizontal = true;
    else start = null;
  }

  function onTouchEnd(event: TouchEvent) {
    if (!start || !horizontal) return;
    const touch = event.changedTouches[0]!;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    start = null;
    // About a fifth of a phone screen, mostly sideways, and not dragging a text selection.
    if (Math.abs(dx) < Math.max(60, window.innerWidth * 0.2) || Math.abs(dx) < Math.abs(dy) * 2) {
      return;
    }
    if (window.getSelection()?.isCollapsed === false) return;
    onSwipe(dx < 0 ? "next" : "previous");
  }

  function onTouchCancel() {
    start = null;
  }

  let element: HTMLElement | Window | null = null;
  onMounted(() => {
    element = target ? target.value : window;
    element?.addEventListener("touchstart", onTouchStart as EventListener, { passive: true });
    element?.addEventListener("touchmove", onTouchMove as EventListener, { passive: true });
    element?.addEventListener("touchend", onTouchEnd as EventListener, { passive: true });
    element?.addEventListener("touchcancel", onTouchCancel, { passive: true });
  });

  onBeforeUnmount(() => {
    element?.removeEventListener("touchstart", onTouchStart as EventListener);
    element?.removeEventListener("touchmove", onTouchMove as EventListener);
    element?.removeEventListener("touchend", onTouchEnd as EventListener);
    element?.removeEventListener("touchcancel", onTouchCancel);
  });
}

function inHorizontalScroller(target: EventTarget | null): boolean {
  for (let el = target instanceof Element ? target : null; el; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth && /auto|scroll/.test(getComputedStyle(el).overflowX)) {
      return true;
    }
  }
  return false;
}
