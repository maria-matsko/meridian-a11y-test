/**
 * Mock cPanel server for Meridian testing.
 *
 * Serves:
 *   - UAPI v3 responses from test/fixtures/uapi/
 *   - API2 responses from test/fixtures/api2/
 *   - WP Toolkit responses from test/fixtures/wpt/
 *   - Meridian TT2 templates (rendered via lightweight TT2 renderer)
 *   - Prototype HTML files (static)
 *   - Meridian static assets (CSS, JS, fonts)
 *
 * Port: 3847 (override with PORT env var)
 */

import express from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderTemplate } from './tt2-renderer.js';
import { cpanelContext } from './cpanel-context.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(__dirname, '../..');
const FIXTURES = resolve(__dirname, '../fixtures');
const MERIDIAN = resolve(ROOT, 'meridian');
const PROTOTYPE = resolve(ROOT, 'prototype');

const app = express();
const PORT = process.env.PORT || 3847;

// --- Helper: load a JSON fixture file ---
function loadFixture(subdir, filename) {
  const filePath = join(FIXTURES, subdir, filename);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error(`[mock-server] Failed to parse fixture: ${filePath}`, err.message);
    return null;
  }
}

// ============================================================
//  API Routes
// ============================================================

// UAPI v3: /:token/execute/:module/:func
app.all('/:token/execute/:module/:func', (req, res) => {
  const { module: mod, func } = req.params;
  const filename = `${mod}--${func}.json`;
  const data = loadFixture('uapi', filename);
  if (data) {
    res.json(data);
  } else {
    res.status(404).json({
      status: 0,
      errors: [`No fixture found: uapi/${filename}`],
      data: null,
    });
  }
});

// API2: /:token/json-api/cpanel
app.all('/:token/json-api/cpanel', (req, res) => {
  const mod = req.query.module || req.query.cpanel_jsonapi_module;
  const func = req.query.func || req.query.cpanel_jsonapi_func;
  if (!mod || !func) {
    return res.status(400).json({ error: 'Missing module or func query param' });
  }
  const filename = `${mod}--${func}.json`;
  const data = loadFixture('api2', filename);
  if (data) {
    res.json(data);
  } else {
    res.status(404).json({
      cpanelresult: { error: `No fixture found: api2/${filename}` },
    });
  }
});

// WP Toolkit: /:token/3rdparty/wpt/index.php/v1/*
app.all('/:token/3rdparty/wpt/index.php/v1/*', (req, res) => {
  // Extract the WPT route path after /v1/
  const wptPath = req.params[0] || '';

  // Map common WPT routes to fixture filenames
  let filename;
  if (wptPath.match(/^installations\/?$/)) {
    filename = 'wpt--installations.json';
  } else if (wptPath.match(/^install\/?$/)) {
    filename = 'wpt--install.json';
  } else if (wptPath.match(/^install-plugin\/?$/)) {
    filename = 'wpt--install-plugin.json';
  } else if (wptPath.match(/^tasks?\//)) {
    filename = 'wpt--task-status.json';
  } else {
    // Generic: wpt--{last-segment}.json
    const segments = wptPath.replace(/\/$/, '').split('/');
    filename = `wpt--${segments[segments.length - 1]}.json`;
  }

  const data = loadFixture('wpt', filename);
  if (data) {
    res.json(data);
  } else {
    res.status(404).json({ error: `No WPT fixture found: wpt/${filename}` });
  }
});

// ============================================================
//  Static Assets
// ============================================================

// Meridian static assets (CSS, JS, fonts, images)
app.use('/meridian/_assets', express.static(join(MERIDIAN, '_assets')));

// Prototype static files
app.use('/prototype', express.static(PROTOTYPE));

// ============================================================
//  Meridian TT2 Pages
// ============================================================

// Root redirect
app.get('/meridian/', (req, res) => {
  res.redirect('/meridian/index/');
});

// Meridian pages: /meridian/:page/ or /meridian/:page/:subpage/
app.get('/meridian/:page/:subpage?/', (req, res) => {
  const { page, subpage } = req.params;

  // Build template path
  let templatePath;
  if (subpage) {
    templatePath = join(MERIDIAN, page, subpage, 'index.html.tt');
    if (!existsSync(templatePath)) {
      templatePath = join(MERIDIAN, page, `${subpage}.html.tt`);
    }
  } else {
    templatePath = join(MERIDIAN, page, 'index.html.tt');
  }

  if (!existsSync(templatePath)) {
    return res.status(404).send(`Template not found: ${templatePath}`);
  }

  try {
    // Build context: merge base cpanel context with page-specific values
    const vars = {
      ...cpanelContext,
      // Override asset_path for server context (relative from page to _assets)
      asset_path: '/meridian/_assets',
    };

    const html = renderTemplate(templatePath, vars, MERIDIAN);
    res.type('html').send(html);
  } catch (err) {
    console.error(`[mock-server] Render error for ${templatePath}:`, err);
    res.status(500).send(`Render error: ${err.message}`);
  }
});

// ============================================================
//  Start
// ============================================================

const server = app.listen(PORT, () => {
  console.log(`[mock-server] Meridian mock cPanel server running at http://localhost:${PORT}`);
  console.log(`[mock-server] UAPI:      http://localhost:${PORT}/mock-token/execute/{Module}/{func}`);
  console.log(`[mock-server] Meridian:   http://localhost:${PORT}/meridian/index/`);
  console.log(`[mock-server] Prototype:  http://localhost:${PORT}/prototype/`);
});

export { app, server };
