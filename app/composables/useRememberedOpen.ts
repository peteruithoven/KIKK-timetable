/** Collapsible parts of the list page whose state this device remembers. */
export type RememberedSection = "past" | "share" | "notifications" | "calendar" | "lists";

const STORAGE_KEY = "kikk-open-sections";
// Before all sections were remembered, closing Notifications was its own flag.
const LEGACY_NOTIFICATIONS_KEY = "kikk-notifications-closed";

function readSaved(): Partial<Record<RememberedSection, boolean>> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    const saved = parsed && typeof parsed === "object" ? parsed : {};
    if (localStorage.getItem(LEGACY_NOTIFICATIONS_KEY) === "1") {
      return { notifications: false, ...saved };
    }
    return saved;
  } catch {
    return {};
  }
}

/**
 * Whether a section is open, starting from `initial` and switching to this device's last choice
 * after hydration (the server can't know it). Changes are saved.
 */
export function useRememberedOpen(section: RememberedSection, initial: () => boolean) {
  const choice = ref<boolean | null>(null);
  onMounted(() => {
    const saved = readSaved()[section];
    if (typeof saved === "boolean") choice.value = saved;
  });
  return computed({
    get: () => choice.value ?? initial(),
    set(open: boolean) {
      if (open === (choice.value ?? initial())) return;
      choice.value = open;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readSaved(), [section]: open }));
      } catch {
        // Storage can be unavailable, e.g. in private browsing. Then it's forgotten.
      }
    },
  });
}

/** For `<details @toggle>`, which also fires when `open` is set from code. */
export function detailsOpen(event: Event): boolean {
  return (event.target as HTMLDetailsElement).open;
}
