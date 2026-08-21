export type HomeUpdateSource = { updatedAt: Date | string };

export function buildHomeUpdates<T extends HomeUpdateSource>(sources: T[]) {
  return [...sources].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
