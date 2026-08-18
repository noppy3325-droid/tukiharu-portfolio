export type HomeUpdateSource = { label: string; title: string; updatedAt: Date | string };

export function buildHomeUpdates(sources: HomeUpdateSource[]) {
  return [...sources].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
