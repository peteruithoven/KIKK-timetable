import type { GeolocateControl, Map as MapLibreMap } from "maplibre-gl";

export type LocateState = "off" | "waiting" | "active" | "background" | "error" | "denied";

const LOCATE_STATES: Record<GeolocateControl["_watchState"], LocateState> = {
  OFF: "off",
  WAITING_ACTIVE: "waiting",
  ACTIVE_LOCK: "active",
  BACKGROUND: "background",
  ACTIVE_ERROR: "error",
  BACKGROUND_ERROR: "error",
};

/**
 * The user's location on the map, for `MapLocateControl`. MapLibre's `GeolocateControl` draws the
 * location dot and follows it; its own button has to be hidden, `locate()` replaces it.
 */
export function useMapGeolocation() {
  // Hidden when the browser can't locate, which is only known after mounting.
  const canLocate = ref(false);
  const state = ref<LocateState>("off");
  let control: GeolocateControl | undefined;

  const { $posthog } = useNuxtApp();

  /** Adds the control to the map. `Control` is passed in, as MapLibre is loaded on demand. */
  function addTo(map: MapLibreMap, Control: typeof GeolocateControl) {
    if (!("geolocation" in navigator)) return;
    const instance = new Control({
      // GPS, for walking between venues.
      positionOptions: { enableHighAccuracy: true, timeout: 10_000 },
      trackUserLocation: true,
    });
    map.addControl(instance, "top-right");
    const update = () => (state.value = LOCATE_STATES[instance._watchState]);
    for (const type of [
      "geolocate",
      "trackuserlocationstart",
      "trackuserlocationend",
      "userlocationfocus",
      "userlocationlostfocus",
    ] as const) {
      instance.on(type, update);
    }
    instance.on("error", (event) => {
      if (event.code === GeolocationPositionError.PERMISSION_DENIED) state.value = "denied";
      else update();
    });
    control = instance;
    canLocate.value = true;
  }

  /** Like the control's button: show and follow the location, center on it again, or stop. */
  function locate() {
    if (!control) return;
    const wasOff = control._watchState === "OFF";
    // False until MapLibre has checked the geolocation support.
    if (!control.trigger()) return;
    state.value = LOCATE_STATES[control._watchState];
    if (wasOff) $posthog?.capture("map_location_requested");
  }

  return { canLocate: readonly(canLocate), state: readonly(state), addTo, locate };
}
