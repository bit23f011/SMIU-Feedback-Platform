/** Presence is only a fast signed-out check; any matching cookie is still verified with getUser(). */
export function hasSupabaseAuthCookie(values: readonly { name: string }[]) {
  return values.some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
}
