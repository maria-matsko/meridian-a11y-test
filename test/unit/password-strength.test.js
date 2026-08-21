import { describe, it, expect } from 'vitest';

// Password strength scoring logic copied from wizard-steps.js (lines ~431-444).
// This is an inline closure, not exported globally.

function scorePassword(val) {
  let score = 0;
  if (val.length >= 8) score++;
  if (val.length >= 12) score++;
  if (/[A-Z]/.test(val) && /[a-z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  return score;
}

const LEVELS = [
  { width: '0%',   text: '' },          // score 0
  { width: '20%',  text: 'Weak' },      // score 1
  { width: '40%',  text: 'Fair' },      // score 2
  { width: '60%',  text: 'Good' },      // score 3
  { width: '80%',  text: 'Strong' },    // score 4
  { width: '100%', text: 'Excellent' }, // score 5
];

function getStrengthLabel(val) {
  const score = Math.min(scorePassword(val), 5);
  return LEVELS[score].text;
}

describe('Password strength scoring', () => {
  it('scores empty string as 0 (no label)', () => {
    expect(scorePassword('')).toBe(0);
    expect(getStrengthLabel('')).toBe('');
  });

  it('scores short password as Weak (length >= 8 only)', () => {
    // "abcdefgh" — 8 chars, lowercase only → score 1 (length>=8)
    expect(scorePassword('abcdefgh')).toBe(1);
    expect(getStrengthLabel('abcdefgh')).toBe('Weak');
  });

  it('scores mixed case + numbers as Good', () => {
    // "Abcdefg1" — 8 chars, mixed case, number → score 3
    expect(scorePassword('Abcdefg1')).toBe(3);
    expect(getStrengthLabel('Abcdefg1')).toBe('Good');
  });

  it('scores long password with mixed case + numbers as Strong', () => {
    // "Abcdefghij1234" — 14 chars (>=8, >=12), mixed case, number → score 4
    expect(scorePassword('Abcdefghij1234')).toBe(4);
    expect(getStrengthLabel('Abcdefghij1234')).toBe('Strong');
  });

  it('scores long password with all criteria as Excellent', () => {
    // "Abcdefghij12!" — 13 chars (>=8, >=12), mixed case, number, symbol → score 5
    expect(scorePassword('Abcdefghij12!')).toBe(5);
    expect(getStrengthLabel('Abcdefghij12!')).toBe('Excellent');
  });

  it('scores short lowercase as 0 (below 8 chars)', () => {
    expect(scorePassword('abc')).toBe(0);
    expect(getStrengthLabel('abc')).toBe('');
  });
});
