export type HomeUpdateSource = { updatedAt: Date | string };

export function buildHomeUpdates<T extends HomeUpdateSource>(sources: T[]) {
  return [...sources].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// Take one recent entry from each category before taking a second from any.
export function buildHomePreview<T extends HomeUpdateSource & { kind: string }>(
  sources: T[]
): T[] {
  const groups = new Map<string, T[]>();
  for (const entry of buildHomeUpdates(sources)) {
    const group = groups.get(entry.kind) ?? [];
    group.push(entry);
    groups.set(entry.kind, group);
  }
  const preview: T[] = [];
  for (let round = 0; preview.length < 4; round++) {
    const candidates = Array.from(groups.values()).flatMap(group =>
      group[round] ? [group[round]] : []
    );
    if (!candidates.length) break;
    preview.push(...buildHomeUpdates(candidates).slice(0, 4 - preview.length));
  }
  return preview;
}
