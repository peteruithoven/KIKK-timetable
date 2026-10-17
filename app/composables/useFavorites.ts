const BACKUP_KEY = "kikk-favorites";

/** Copy in localStorage, to recover when the cookie is lost and to keep unsaved changes. */
interface Backup {
  id: string | null;
  events: string[];
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

export function useFavorites() {
  const listId = useState<string | null>("favorites-id", () => null);
  const events = useState<string[]>("favorites-events", () => []);
  const favorites = computed(() => new Set(events.value));

  function writeBackup() {
    const backup: Backup = {
      id: listId.value,
      events: events.value,
      pending: { add: [...pending.add], remove: [...pending.remove] },
    };
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
    } catch {
      // Storage can be unavailable, e.g. in private browsing. The server copy remains.
    }
  }

  function apply(list: FavoritesList) {
    listId.value = list.id;
    // The server's list, plus changes made while the request was underway.
    const merged = new Set(list.events);
    for (const id of pending.add) merged.add(id);
    for (const id of pending.remove) merged.delete(id);
    events.value = [...merged];
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
      if ((error as { statusCode?: number }).statusCode !== 404) throw error;
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
    pending.add.clear();
    pending.remove.clear();
    apply(await $fetch<FavoritesList>("/api/lists", { method: "POST", body: { id } }));
    writeBackup();
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
              body: { id: backup.id ?? undefined, add: backup.events },
            }),
          );
        } catch {
          listId.value = backup.id;
          events.value = backup.events;
        }
      }
    }
    writeBackup();
    await flush();
  }

  return {
    listId: readonly(listId),
    events: readonly(events),
    isFavorite: (eventId: string) => favorites.value.has(eventId),
    toggle,
    adopt,
    restore,
    flush,
  };
}
