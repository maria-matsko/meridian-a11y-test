import { describe, it, expect } from 'vitest';

// fuzzyMatch and searchItems are function-scoped in shell.js (not on window).
// Copied here as reference implementations for unit testing.

function fuzzyMatch(query, text) {
  query = query.toLowerCase();
  text = text.toLowerCase();
  if (text.includes(query)) return 100 + (query.length / text.length * 50);
  let qi = 0, score = 0, lastIdx = -1;
  for (let ti = 0; ti < text.length && qi < query.length; ti++) {
    if (text[ti] === query[qi]) {
      score += (ti === lastIdx + 1) ? 15 : 5;
      if (ti === 0 || text[ti - 1] === ' ') score += 10;
      lastIdx = ti;
      qi++;
    }
  }
  return qi === query.length ? score : 0;
}

// Minimal search index for testing searchItems behavior
const SEARCH_INDEX = [
  { name: 'Email Accounts', desc: 'Create and manage email accounts', icon: 'ri-mail-line', href: '#', category: 'Email', keywords: 'email accounts manage list create' },
  { name: 'Dashboard', desc: 'Main dashboard overview', icon: 'ri-dashboard-line', href: '#', category: 'Pages', keywords: 'dashboard home main overview' },
  { name: 'File Manager', desc: 'Browse and manage files', icon: 'ri-folder-line', href: '#', category: 'Files', keywords: 'file manager browse edit' },
  { name: 'MySQL Databases', desc: 'Manage MySQL databases', icon: 'ri-database-line', href: '#', category: 'Databases', keywords: 'mysql database create' },
  { name: 'SSL Certificates', desc: 'Manage SSL certs', icon: 'ri-lock-line', href: '#', category: 'Security', keywords: 'ssl tls certificate https' },
];

function searchItems(query) {
  if (!query.trim()) return [];
  const q = query.trim();
  const scored = SEARCH_INDEX.map(item => {
    const nameScore = fuzzyMatch(q, item.name) * 3;
    const keywordScore = fuzzyMatch(q, item.keywords) * 2;
    const descScore = fuzzyMatch(q, item.desc);
    const catScore = fuzzyMatch(q, item.category);
    const total = nameScore + keywordScore + descScore + catScore;
    return { item, score: total };
  }).filter(r => r.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 12).map(r => r.item);
}

describe('fuzzyMatch()', () => {
  it('returns high score for exact substring match', () => {
    expect(fuzzyMatch('dashboard', 'Dashboard')).toBeGreaterThan(0);
  });

  it('returns 0 for no match', () => {
    expect(fuzzyMatch('xyz', 'Dashboard')).toBe(0);
  });

  it('matches substrings within words', () => {
    expect(fuzzyMatch('mail', 'Email')).toBeGreaterThan(0);
  });

  it('scores substring matches higher than fuzzy matches', () => {
    const substringScore = fuzzyMatch('dash', 'Dashboard');
    // "dshb" requires fuzzy matching against Dashboard
    const fuzzyScore = fuzzyMatch('dshb', 'Dashboard');
    expect(substringScore).toBeGreaterThan(fuzzyScore);
  });
});

describe('searchItems()', () => {
  it('returns results for a valid query', () => {
    const results = searchItems('email');
    expect(results.length).toBeGreaterThan(0);
    const hasEmail = results.some(r => r.name.toLowerCase().includes('email') || r.keywords.toLowerCase().includes('email'));
    expect(hasEmail).toBe(true);
  });

  it('returns empty array for empty string', () => {
    expect(searchItems('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(searchItems('   ')).toEqual([]);
  });

  it('limits results to 12', () => {
    const results = searchItems('a');
    expect(results.length).toBeLessThanOrEqual(12);
  });
});
