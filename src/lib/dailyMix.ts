export function computeDailyMix(total: number, ratio: Record<"easy"|"moderate"|"difficult", number>) {
  // Ensure a minimum 20% easy to keep sessions approachable
  const minEasy = Math.max(2, Math.round(total * 0.2));
  let easy = Math.max(minEasy, Math.round(total * (ratio.easy ?? 0)));
  let moderate = Math.round(total * (ratio.moderate ?? 0));
  let difficult = Math.round(total * (ratio.difficult ?? 0));

  let sum = easy + moderate + difficult;
  // Normalize to total
  while (sum > total) {
    if (difficult > 0) difficult--;
    else if (moderate > 0) moderate--;
    else if (easy > minEasy) easy--;
    sum = easy + moderate + difficult;
  }
  while (sum < total) {
    if (moderate <= difficult) moderate++;
    else difficult++;
    sum = easy + moderate + difficult;
  }

  return { easy, moderate, difficult } as const;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function sampleArray<T>(arr: T[], n: number): T[] {
  if (n <= 0) return [];
  const a = shuffle(arr);
  return a.slice(0, Math.min(n, a.length));
}

export function getCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
