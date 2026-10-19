const BACKUP_KEY = "kikk-favorites";
const PREVIOUS_KEY = "kikk-previous-lists";

/** Copy in localStorage, to recover when the cookie is lost and to keep unsaved changes. */
interface Backup {
  id: string | null;
  label?: string | null;
  events: string[];
  /** Of the last list received from the server. */
  updatedAt?: string | null;
  pending: { add: string[]; remove: string[] };
}

// Changes not yet saved on the server. Only used in the browser.
const pending = { add: new Set<string>(), remove: new Set<string>() };
let flushing: Promise<void> | null = null;

function readBackup(): Backup | null {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_KEY) ?? "null");
  } catch {
    return null;
  }
}

/** Lists this browser used before switching to another one, most recent first. */
function readPrevious(): string[] {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(PREVIOUS_KEY) ?? "[]");
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const listId = useState<string | null>("favorites-id", () => null);
  const label = useState<string | null>("favorites-label", () => null);
  const events = useState<string[]>("favorites-events", () => []);
  const updatedAt = useState<string | null>("favorites-updated-at", () => null);
  const favorites = computed(() => new Set(events.value));

  function writeBackup() {
    const backup: Backup = {
      id: listId.value,
      label: label.value,
      events: events.value,
      updatedAt: updatedAt.value,
      pending: { add: [...pending.add], remove: [...pending.remove] },
    };
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
    } catch {
      // Storage can be unavailable, e.g. in private browsing. The server copy remains.
    }
  }

  function withPending(eventIds: readonly string[]): string[] {
    const merged = new Set(eventIds);
    for (const id of pending.add) merged.add(id);
    for (const id of pending.remove) merged.delete(id);
    return [...merged];
  }

  function apply(list: FavoritesList) {
    listId.value = list.id;
    label.value = list.label ?? null;
    updatedAt.value = list.updatedAt;
    // The server's list, plus changes made while the request was underway.
    events.value = withPending(list.events);
  }

  async function send(add: string[], remove: string[]): Promise<FavoritesList> {
    if (!listId.value)
      return $fetch<FavoritesList>("/api/lists", { method: "POST", body: { add } });
    try {
      return await $fetch<FavoritesList>(`/api/lists/${listId.value}`, {
        method: "PATCH",
        body: { add, remove },
      });
    } catch (error) {
      // The list is gone on the server, recreate it from what this device knows.
      if ((error as { status?: number }).status !== 404) throw error;
      return $fetch<FavoritesList>("/api/lists", {
        method: "POST",
        body: { id: listId.value, add: events.value },
      });
    }
  }

  /** Saves pending changes. On failure they're kept and retried later. */
  function flush(): Promise<void> {
    flushing ??= (async () => {
      while (pending.add.size || pending.remove.size) {
        const add = [...pending.add];
        const remove = [...pending.remove];
        pending.add.clear();
        pending.remove.clear();
        try {
          apply(await send(add, remove));
        } catch {
          // Put them back, unless they were changed again in the meantime.
          for (const id of add) if (!pending.remove.has(id)) pending.add.add(id);
          for (const id of remove) if (!pending.add.has(id)) pending.remove.add(id);
          break;
        } finally {
          writeBackup();
        }
      }
    })().finally(() => (flushing = null));
    return flushing;
  }

  function toggle(eventId: string) {
    const add = !favorites.value.has(eventId);
    if (add) {
      events.value = [...events.value, eventId];
      pending.add.add(eventId);
      pending.remove.delete(eventId);
    } else {
      events.value = events.value.filter((id) => id !== eventId);
      pending.remove.add(eventId);
      pending.add.delete(eventId);
    }
    writeBackup();
    void flush();
  }

  /** Switches this device to another list, e.g. one opened through a shared link. */
  async function adopt(id: string) {
    const previous = listId.value;
    await flush();
    pending.add.clear();
    pending.remove.clear();
    apply(await $fetch<FavoritesList>("/api/lists", { method: "POST", body: { id } }));
    writeBackup();
    // Only this browser knows the id of the list it leaves, so remember it.
    const ids = readPrevious().filter((other) => other !== previous && other !== id);
    if (previous && previous !== id) ids.unshift(previous);
    try {
      localStorage.setItem(PREVIOUS_KEY, JSON.stringify(ids.slice(0, 10)));
    } catch {
      // Storage can be unavailable, e.g. in private browsing.
    }
  }

  /** Unlike favorites, the label isn't queued: it needs a connection. An empty one removes it. */
  async function setLabel(value: string) {
    if (!listId.value) return;
    apply(
      await $fetch<FavoritesList>(`/api/lists/${listId.value}`, {
        method: "PATCH",
        body: { label: value },
      }),
    );
    writeBackup();
  }

  /** Lists this browser used before, most recent first. Only works in the browser. */
  function previousListIds(): string[] {
    return readPrevious().filter((id) => id !== listId.value);
  }

  /** Runs once in the browser after hydration. */
  async function restore() {
    const backup = readBackup();
    if (backup && (!listId.value || backup.id === listId.value)) {
      for (const id of backup.pending?.add ?? []) pending.add.add(id);
      for (const id of backup.pending?.remove ?? []) pending.remove.add(id);
      if (!listId.value && (backup.id || backup.events.length)) {
        // The cookie is gone but this browser remembers its list: restore it on the server,
        // which also sets the cookie again.
        try {
          apply(
            await $fetch<FavoritesList>("/api/lists", {
              method: "POST",
              body: {
                id: backup.id ?? undefined,
                label: backup.label ?? undefined,
                add: backup.events,
              },
            }),
          );
        } catch {
          listId.value = backup.id;
          label.value = backup.label ?? null;
          events.value = backup.events;
          updatedAt.value = backup.updatedAt ?? null;
        }
      } else if ((backup.updatedAt ?? "") > (updatedAt.value ?? "")) {
        // The page is older than this device's copy, e.g. when it came from the offline cache.
        label.value = backup.label ?? null;
        events.value = backup.events;
        updatedAt.value = backup.updatedAt ?? null;
      } else {
        // Show changes that weren't saved yet.
        events.value = withPending(events.value);
      }
    }
    writeBackup();
    await flush();
  }

  return {
    listId: readonly(listId),
    label: readonly(label),
    events: readonly(events),
    isFavorite: (eventId: string) => favorites.value.has(eventId),
    toggle,
    adopt,
    setLabel,
    previousListIds,
    restore,
    flush,
  };
}
