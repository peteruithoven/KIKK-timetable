<script setup lang="ts">
const props = defineProps<{ images: string[]; index: number }>();
const emit = defineEmits<{ close: []; show: [index: number] }>();

const MAX_ZOOM = 6;

type Point = { x: number; y: number };
type GestureEvent = UIEvent & { scale: number; clientX: number; clientY: number };

const dialog = useTemplateRef("dialog");
const scroller = useTemplateRef("scroller");
const canvas = useTemplateRef("canvas");
const image = useTemplateRef("image");

const src = computed(() => resizedImage(props.images[props.index]!, 2500));
const label = computed(() => `Photo ${props.index + 1} of ${props.images.length}`);

// The area below the header works like a map: pinch, Ctrl + scroll or double-click to zoom,
// scroll or drag to move around. The viewer zooms the photo itself: the browser's zoom would
// enlarge the header too, so that's blocked here. A zoomed in photo is larger than the area and
// scrolls.
// Layout is set directly on the elements, so a scroll position can follow straight away.
let zoom = 1;
const zoomed = ref(false);
// The area below the header, scrollbars included, so their appearing doesn't resize the photo.
let area = { width: 0, height: 0 };
let natural: { width: number; height: number } | null = null;

// At zoom 1 the photo fits the area. Until it's loaded, it fills it with object-contain.
function photoSize() {
  const fit = natural ? Math.min(area.width / natural.width, area.height / natural.height) : 1;
  const width = (natural?.width ?? area.width) * fit * zoom;
  const height = (natural?.height ?? area.height) * fit * zoom;
  // Centered while smaller than the area.
  return {
    width,
    height,
    left: Math.max(0, (area.width - width) / 2),
    top: Math.max(0, (area.height - height) / 2),
  };
}

function layout() {
  const size = photoSize();
  if (canvas.value) {
    canvas.value.style.width = `${Math.max(area.width, size.width)}px`;
    canvas.value.style.height = `${Math.max(area.height, size.height)}px`;
  }
  if (image.value) {
    Object.assign(image.value.style, {
      left: `${size.left}px`,
      top: `${size.top}px`,
      width: `${size.width}px`,
      height: `${size.height}px`,
    });
  }
}

// A point on screen, relative to the area.
function areaPoint(clientX: number, clientY: number): Point {
  const rect = scroller.value!.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function areaCenter(): Point {
  return { x: scroller.value!.clientWidth / 2, y: scroller.value!.clientHeight / 2 };
}

// The spot of the photo at a point in the area, as a fraction of the photo.
function photoPoint(point: Point): Point {
  const size = photoSize();
  if (!size.width || !size.height) return { x: 0.5, y: 0.5 };
  return {
    x: (scroller.value!.scrollLeft + point.x - size.left) / size.width,
    y: (scroller.value!.scrollTop + point.y - size.top) / size.height,
  };
}

// Zooms in or out, keeping `anchor` (a spot of the photo) at `point` (in the area).
function zoomTo(value: number, point = areaCenter(), anchor = photoPoint(point)) {
  zoom = Math.min(MAX_ZOOM, Math.max(1, value));
  zoomed.value = zoom > 1;
  layout();
  const size = photoSize();
  scroller.value?.scrollTo(
    size.left + anchor.x * size.width - point.x,
    size.top + anchor.y * size.height - point.y,
  );
}

// Ctrl + scroll, and trackpad pinches, which browsers report as that. Pinches come in small
// steps, a mouse wheel's notches as large ones, which are capped.
function onWheel(event: WheelEvent) {
  if (!event.ctrlKey) return;
  event.preventDefault();
  const delta = event.deltaY * (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 20 : 1);
  const step = Math.exp(-Math.max(-25, Math.min(25, delta)) / 100);
  zoomTo(zoom * step, areaPoint(event.clientX, event.clientY));
}

// Pinching on touchscreens. The dialog's touch-action stops the browser's own pinch zoom.
let pinch: { distance: number; zoom: number; anchor: Point } | null = null;
function measurePinch(touches: TouchList) {
  const [a, b] = [touches[0]!, touches[1]!];
  return {
    distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY),
    center: areaPoint((a.clientX + b.clientX) / 2, (a.clientY + b.clientY) / 2),
  };
}
function onTouchStart(event: TouchEvent) {
  if (event.touches.length !== 2) return;
  const { distance, center } = measurePinch(event.touches);
  pinch = { distance, zoom, anchor: photoPoint(center) };
  gesture = null;
}
function onTouchMove(event: TouchEvent) {
  // Not zoomed in, there's nothing to scroll. Without this Chrome goes back in the history on a
  // swipe to the right (overscroll-behavior doesn't stop that in a modal dialog), or reloads the
  // page on a pull down. The system's own edge swipes still work.
  if (zoom === 1 && event.touches.length === 1 && event.cancelable) event.preventDefault();
  if (!pinch || event.touches.length !== 2) return;
  if (event.cancelable) event.preventDefault();
  // The spot between the fingers follows them, which also pans.
  const { distance, center } = measurePinch(event.touches);
  zoomTo((pinch.zoom * distance) / pinch.distance, center, pinch.anchor);
}
function onTouchEnd(event: TouchEvent) {
  if (event.touches.length < 2) pinch = null;
}

// Safari reports trackpad pinches (macOS) as gesture events, and zooms the page on them. On
// iOS it sends them along with the touches, which handle the pinch there.
let gesture: { zoom: number; point: Point; anchor: Point } | null = null;
function onGestureStart(event: Event) {
  event.preventDefault();
  if (pinch) return;
  const { clientX, clientY } = event as GestureEvent;
  const point = areaPoint(clientX, clientY);
  gesture = { zoom, point, anchor: photoPoint(point) };
}
function onGestureChange(event: Event) {
  event.preventDefault();
  if (!gesture || pinch) return;
  zoomTo(gesture.zoom * (event as GestureEvent).scale, gesture.point, gesture.anchor);
}
function onGestureEnd(event: Event) {
  event.preventDefault();
  gesture = null;
}

// Dragging a zoomed in photo around with the mouse. Touch and pens scroll natively.
let drag: Point | null = null;
function onPointerDown(event: PointerEvent) {
  if (event.pointerType !== "mouse" || event.button !== 0 || zoom === 1) return;
  drag = { x: event.clientX, y: event.clientY };
  scroller.value?.setPointerCapture(event.pointerId);
}
function onPointerMove(event: PointerEvent) {
  if (!drag) return;
  scroller.value?.scrollBy(drag.x - event.clientX, drag.y - event.clientY);
  drag = { x: event.clientX, y: event.clientY };
}
function onPointerUp() {
  drag = null;
}

function onDoubleClick(event: MouseEvent) {
  zoomTo(zoom > 1 ? 1 : 2.5, areaPoint(event.clientX, event.clientY));
}

const ZOOM_KEYS: Record<string, number> = { "+": 1.25, "=": 1.25, "-": 0.8, _: 0.8, "0": 0 };
function onKeyDown(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey) {
    const step = ZOOM_KEYS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    zoomTo(step ? zoom * step : 1);
  } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    // The photo's area never has focus, so the arrow keys wouldn't scroll it anyway.
    show(event.key === "ArrowRight" ? "next" : "previous");
  }
}

// The direction of the last swipe, for the next photo to slide in from that side.
const slide = ref<"previous" | "next" | null>(null);
const { $posthog } = useNuxtApp();
function show(direction: "previous" | "next", swiped = false) {
  const index = props.index + (direction === "next" ? 1 : -1);
  if (!props.images[index]) return;
  slide.value = direction;
  if (swiped) $posthog?.capture("photo_swiped", { direction });
  emit("show", index);
}
const navButtons = [
  {
    direction: "previous",
    step: -1,
    label: "Previous photo",
    icon: "material-symbols:chevron-left",
  },
  { direction: "next", step: 1, label: "Next photo", icon: "material-symbols:chevron-right" },
] as const;
// Zoomed in, a swipe scrolls the photo instead, like moving a map around.
useSwipeNavigation((direction) => zoom === 1 && show(direction, true), dialog);

// A new photo (its <img> is keyed on it) starts out fitted.
watch(
  () => props.index,
  () => {
    natural = null;
    zoomTo(1);
  },
  { flush: "post" },
);

function onLoad() {
  const element = image.value;
  if (!element?.naturalWidth) return;
  natural = { width: element.naturalWidth, height: element.naturalHeight };
  zoomTo(zoom, areaCenter(), { x: 0.5, y: 0.5 });
  // The neighbors, so swiping to them doesn't wait.
  for (const index of [props.index - 1, props.index + 1]) {
    const url = props.images[index];
    if (!url) continue;
    const preload = new Image();
    preload.crossOrigin = "anonymous";
    preload.src = resizedImage(url, 2500);
  }
}

// Keeps the spot in the middle in place when the window changes size.
const resizeObserver = import.meta.client
  ? new ResizeObserver(() => {
      const element = scroller.value;
      if (!element) return;
      const anchor = photoPoint(areaCenter());
      area = { width: element.offsetWidth, height: element.offsetHeight };
      zoomTo(zoom, areaCenter(), anchor);
    })
  : null;

onMounted(() => {
  const element = dialog.value!;
  element.showModal();
  resizeObserver?.observe(scroller.value!);
  // Loaded before hydration.
  if (image.value?.complete) onLoad();
  element.addEventListener("wheel", onWheel, { passive: false });
  element.addEventListener("touchstart", onTouchStart, { passive: true });
  element.addEventListener("touchmove", onTouchMove, { passive: false });
  element.addEventListener("touchend", onTouchEnd, { passive: true });
  element.addEventListener("touchcancel", onTouchEnd, { passive: true });
  element.addEventListener("gesturestart", onGestureStart);
  element.addEventListener("gesturechange", onGestureChange);
  element.addEventListener("gestureend", onGestureEnd);
  window.addEventListener("keydown", onKeyDown);
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  window.removeEventListener("keydown", onKeyDown);
});

// The page behind stays where it was.
useHead({ htmlAttrs: { class: "overflow-hidden" } });
</script>

<template>
  <!-- Escape and Android's back gesture close the dialog itself, `close` passes that on. -->
  <dialog
    ref="dialog"
    :aria-label="label"
    class="palette-light m-0 h-dvh max-h-none w-full max-w-none touch-pan-x touch-pan-y flex-col overflow-hidden bg-ink p-0 text-paper backdrop:bg-ink open:flex"
    @close="emit('close')"
  >
    <nav
      class="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-neutral-800 px-4"
    >
      <button
        type="button"
        class="inline-flex items-center gap-2 bevel-corner border border-neutral-700 px-3 py-1.5 font-display text-xs font-semibold tracking-[0.12em] uppercase transition-colors hover:border-paper"
        @click="emit('close')"
      >
        <Icon name="material-symbols:arrow-left-alt" class="size-4" aria-hidden="true" /> Back
      </button>
      <div class="flex items-center gap-2">
        <span class="text-xs text-neutral-400">{{ label }}</span>
        <template v-if="images.length > 1">
          <button
            v-for="button in navButtons"
            :key="button.direction"
            type="button"
            :aria-label="button.label"
            :disabled="!images[index + button.step]"
            class="inline-flex bevel-corner border border-transparent p-1.5 transition-colors not-disabled:hover:border-paper disabled:opacity-30"
            @click="show(button.direction)"
          >
            <Icon :name="button.icon" class="size-4" aria-hidden="true" />
          </button>
        </template>
      </div>
    </nav>
    <div
      ref="scroller"
      class="min-h-0 flex-1 overflow-auto overscroll-contain"
      :class="{ 'cursor-grab active:cursor-grabbing': zoomed }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @dblclick="onDoubleClick"
    >
      <div ref="canvas" class="relative">
        <img
          ref="image"
          :key="src"
          :src="src"
          crossorigin="anonymous"
          alt=""
          draggable="false"
          class="absolute max-w-none object-contain select-none"
          :class="{
            'animate-slide-in-left': slide === 'next',
            'animate-slide-in-right': slide === 'previous',
          }"
          @load="onLoad"
        />
      </div>
    </div>
  </dialog>
</template>
