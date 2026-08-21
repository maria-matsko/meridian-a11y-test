import { describe, it, expect } from 'vitest';

// These regex patterns are inline in wizard-steps.js (not exported).
// Copied here for unit testing.

// Domain regex from domain-config onMount (line ~298)
const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;

// Subdomain prefix regex from domain-config onMount (line ~285)
const SUBDOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

// Email username regex from email-form onMount (line ~423)
const EMAIL_USER_REGEX = /^[a-zA-Z0-9._%+-]+$/;

describe('Domain validation regex', () => {
  it('accepts valid domains', () => {
    expect(DOMAIN_REGEX.test('example.com')).toBe(true);
    expect(DOMAIN_REGEX.test('sub.example.co.uk')).toBe(true);
    expect(DOMAIN_REGEX.test('my-site.org')).toBe(true);
  });

  it('rejects domains starting with hyphen', () => {
    expect(DOMAIN_REGEX.test('-bad.com')).toBe(false);
  });

  it('rejects bare TLD / no extension', () => {
    expect(DOMAIN_REGEX.test('example')).toBe(false);
  });

  it('rejects bare dot-TLD', () => {
    expect(DOMAIN_REGEX.test('.com')).toBe(false);
  });
});

describe('Subdomain prefix validation regex', () => {
  it('accepts valid subdomain prefixes', () => {
    expect(SUBDOMAIN_REGEX.test('mysite')).toBe(true);
    expect(SUBDOMAIN_REGEX.test('my-site')).toBe(true);
    expect(SUBDOMAIN_REGEX.test('a')).toBe(true);
  });

  it('rejects prefixes starting with hyphen', () => {
    expect(SUBDOMAIN_REGEX.test('-bad')).toBe(false);
  });

  it('rejects spaces', () => {
    expect(SUBDOMAIN_REGEX.test('my site')).toBe(false);
  });

  it('rejects strings longer than 63 chars', () => {
    expect(SUBDOMAIN_REGEX.test('a'.repeat(64))).toBe(false);
  });
});

describe('Email username validation regex', () => {
  it('accepts valid email usernames', () => {
    expect(EMAIL_USER_REGEX.test('user')).toBe(true);
    expect(EMAIL_USER_REGEX.test('user.name')).toBe(true);
    expect(EMAIL_USER_REGEX.test('user+tag')).toBe(true);
    expect(EMAIL_USER_REGEX.test('user_name')).toBe(true);
  });

  it('rejects @ symbol', () => {
    expect(EMAIL_USER_REGEX.test('user@')).toBe(false);
  });

  it('rejects spaces', () => {
    expect(EMAIL_USER_REGEX.test('user name')).toBe(false);
  });
});
