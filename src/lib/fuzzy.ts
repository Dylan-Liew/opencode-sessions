export interface RankedItem<T> {
  item: T;
  score: number;
}

function normalize(value: string): string {
  return value.toLowerCase();
}

function subsequenceScore(haystack: string, needle: string): number {
  let hayIndex = 0;
  let score = 0;
  let streak = 0;

  for (let needleIndex = 0; needleIndex < needle.length; needleIndex += 1) {
    const character = needle[needleIndex];
    const foundIndex = haystack.indexOf(character, hayIndex);

    if (foundIndex === -1) {
      return -1;
    }

    if (foundIndex === hayIndex) {
      streak += 1;
      score += 10 + streak;
    } else {
      streak = 0;
      score += 4;
    }

    hayIndex = foundIndex + 1;
  }

  return score;
}

export function scoreFuzzy(value: string, query: string): number {
  const normalizedValue = normalize(value);
  const normalizedQuery = normalize(query.trim());

  if (!normalizedQuery) {
    return 0;
  }

  if (normalizedValue === normalizedQuery) {
    return 2_000;
  }

  if (normalizedValue.startsWith(normalizedQuery)) {
    return 1_600 - Math.min(200, normalizedValue.length - normalizedQuery.length);
  }

  const includesIndex = normalizedValue.indexOf(normalizedQuery);

  if (includesIndex !== -1) {
    return 1_200 - Math.min(400, includesIndex * 4);
  }

  const subsequence = subsequenceScore(normalizedValue, normalizedQuery);
  return subsequence === -1 ? -1 : 700 + Math.min(250, subsequence);
}

export function rankFuzzy<T>(
  items: T[],
  query: string,
  getSearchText: (item: T) => string,
  limit: number,
): RankedItem<T>[] {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    return items.slice(0, limit).map((item) => ({ item, score: 0 }));
  }

  const ranked = items
    .map((item) => ({ item, score: scoreFuzzy(getSearchText(item), normalizedQuery) }))
    .filter((row) => row.score >= 0)
    .sort((a, b) => b.score - a.score);

  return ranked.slice(0, limit);
}
