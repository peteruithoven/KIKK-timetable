/** Remembers this browser's list. Set by the server, which Safari doesn't expire after 7 days. */
export const LIST_COOKIE = "kikk-list";

export const LIST_ID_PATTERN = /^[a-z]+-[a-z]+-\d{4}$/;

export function listPath(id: string): string {
  return `/list/${id}`;
}

export const LIST_LABEL_MAX_LENGTH = 60;
