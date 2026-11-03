import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { BRAND_CHARCOAL } from '../lib/p5/brand.ts';
import { EMAIL_BRAND } from '../server/services/emailLayout.ts';

const CHARCOAL = '#383837';

function channels(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function luminance(hex: string): number {
  const lin = (channel: number) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = channels(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test('brand charcoal token is #383837', () => {
  const tokens = readFileSync('styles/family-tokens.css', 'utf8');
  assert.match(tokens, /--color-charcoal:\s*#383837;/);
  assert.equal(BRAND_CHARCOAL, CHARCOAL);
  assert.equal(EMAIL_BRAND.bg, CHARCOAL);
  assert.equal(EMAIL_BRAND.surface, CHARCOAL);
  assert.equal(EMAIL_BRAND.raised, CHARCOAL);
  const manifest = JSON.parse(readFileSync('public/site.webmanifest', 'utf8'));
  assert.equal(manifest.theme_color, CHARCOAL);
  assert.equal(manifest.background_color, CHARCOAL);
  const globals = readFileSync('app/globals.css', 'utf8');
  assert.match(globals, /--background:\s*60 1% 21\.8%;/);
  assert.match(globals, /--primary-foreground:\s*60 1% 21\.8%;/);
  assert.match(globals, /--inverse:\s*60 1% 21\.8%;/);
  assert.match(globals, /--card:\s*60 1% 21\.8%;/);
});

test('white and light text on #383837 clears WCAG AA', () => {
  const lightText = ['#FFFFFF', '#FBFAF6', '#F1EDE4', '#F7F5F3', '#E6E3DE', EMAIL_BRAND.text, EMAIL_BRAND.textMuted];
  for (const color of lightText) {
    const ratio = contrast(color, CHARCOAL);
    assert.ok(ratio >= 4.5, `${color} on ${CHARCOAL} is ${ratio.toFixed(2)}:1`);
  }
});
