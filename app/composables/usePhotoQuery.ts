/**
 * The photo shown full screen, as `?photo=` on the page, so Back closes it and it can be linked
 * to. Galleries use numbers (counting from 1), single images a name, like `cover` or `speaker-2`.
 */
export function usePhotoQuery() {
  const route = useRoute();
  const router = useRouter();
  const photo = computed(() => (typeof route.query.photo === "string" ? route.query.photo : null));

  function photoLink(value: string | number) {
    return { query: { ...route.query, photo: value } };
  }

  // Swiping to another photo replaces this one in the history, so Back still closes the viewer.
  function showPhoto(value: string | number) {
    void router.replace(photoLink(value));
  }

  // Back to the page when the photo was opened from it, otherwise (a shared link) replaced, so
  // Back doesn't reopen it.
  function closePhoto() {
    const query = { ...route.query };
    delete query.photo;
    if (window.history.state?.back === router.resolve({ query }).fullPath) router.back();
    else void router.replace({ query });
  }

  return { photo, photoLink, showPhoto, closePhoto };
}
