/**
 * Lightweight TT2 renderer for Meridian templates.
 *
 * Handles ONLY the subset of Template Toolkit directives actually used
 * in the meridian/ templates. This is NOT a general-purpose TT2 engine.
 *
 * Supported directives:
 *   WRAPPER, content, SET, IF, UNLESS, END, USE, variable substitution,
 *   | html filter, | uri filter, comments, .remove() method,
 *   nested property access (e.g. CPANEL.authuser), || default values.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

/**
 * Render a TT2 template file with the given context variables.
 *
 * @param {string} templatePath - Absolute path to the .tt file
 * @param {object} vars - Template variables (merged with defaults)
 * @param {string} [templateRoot] - Root directory for resolving WRAPPER paths
 *   (defaults to the template's own directory). In cPanel, WRAPPER paths like
 *   '_assets/master.html.tt' resolve relative to the theme root (meridian/).
 * @returns {string} Rendered HTML
 */
export function renderTemplate(templatePath, vars = {}, templateRoot) {
  const source = readFileSync(templatePath, 'utf-8');
  const baseDir = dirname(templatePath);
  const root = templateRoot || baseDir;
  return processTemplate(source, vars, baseDir, root);
}

/**
 * Core template processor. Handles all supported TT2 directives.
 */
function processTemplate(source, vars, baseDir, root) {
  // Phase 1: Handle pre-WRAPPER blocks (USE, SET before WRAPPER)
  // These appear as [% ... %] blocks before the WRAPPER directive.
  let preProcessed = processPreWrapperBlocks(source, vars);

  // Phase 2: Handle WRAPPER directive
  let result = processWrapper(preProcessed, vars, baseDir, root);

  // Phase 3: Process remaining directives
  result = processDirectives(result, vars, baseDir);

  return result;
}

/**
 * Process blocks that appear before WRAPPER (USE, SET statements).
 * e.g. [% USE EasyApache; SET ea_conf = EasyApache.get_ea_conf(); ... %]
 */
function processPreWrapperBlocks(source, vars) {
  // Match blocks like [% USE ...; SET ...; %] that appear before WRAPPER
  const preBlockRe = /^\s*\[%-?\s*((?:USE\s+\w+\s*;?\s*|SET\s+[^%]+;?\s*)+)\s*-?%\]\s*/;
  const match = source.match(preBlockRe);
  if (!match) return source;

  const block = match[1];
  executeStatements(block, vars);
  return source.slice(match[0].length);
}

/**
 * Execute USE and SET statements within a block.
 */
function executeStatements(block, vars) {
  // Split on semicolons, process each statement
  const statements = block.split(';').map(s => s.trim()).filter(Boolean);

  for (const stmt of statements) {
    // USE Module — no-op, plugins are pre-mocked in context
    if (/^USE\s+(\w+)/.test(stmt)) {
      continue;
    }

    // SET var = expression
    const setMatch = stmt.match(/^SET\s+(\w+)\s*=\s*(.+)$/);
    if (setMatch) {
      const [, name, expr] = setMatch;
      vars[name] = evaluateExpression(expr.trim(), vars);
      continue;
    }
  }
}

/**
 * Handle WRAPPER directive: extracts body content, renders wrapper template,
 * and inserts body at [% content %].
 */
function processWrapper(source, vars, baseDir, root) {
  // Match: [% WRAPPER 'path' key=value key=value %] ... [% END %]
  const wrapperRe = /\[%-?\s*WRAPPER\s+'([^']+)'([\s\S]*?)-?%\]([\s\S]*)\[%-?\s*END\s*-?%\]\s*$/;
  const match = source.match(wrapperRe);
  if (!match) return source;

  const [, wrapperPath, paramsStr, bodyContent] = match;

  // Parse key=value params
  const params = parseWrapperParams(paramsStr);

  // Merge params into vars (params override for the wrapper scope)
  const wrapperVars = { ...vars, ...params };

  // Resolve wrapper path relative to the theme root (meridian/).
  // Page templates use '_assets/master.html.tt' which resolves from meridian/.
  const resolvedPath = resolve(root, wrapperPath);
  const wrapperSource = readFileSync(resolvedPath, 'utf-8');
  const wrapperDir = dirname(resolvedPath);

  // Process the body content first with the merged vars
  const processedBody = processDirectives(bodyContent, wrapperVars, baseDir);

  // Inject body into wrapper via [% content %]
  wrapperVars.content = processedBody;

  // Process the wrapper template
  return processDirectives(wrapperSource, wrapperVars, wrapperDir);
}

/**
 * Parse WRAPPER parameter assignments: key = 'value' or key = value
 */
function parseWrapperParams(paramsStr) {
  const params = {};
  // Match key = 'value' or key = value (unquoted identifiers)
  const paramRe = /(\w+)\s*=\s*'([^']*)'|(\w+)\s*=\s*(\w+)/g;
  let m;
  while ((m = paramRe.exec(paramsStr)) !== null) {
    if (m[1] !== undefined) {
      params[m[1]] = m[2];
    } else {
      params[m[3]] = m[4];
    }
  }
  return params;
}

/**
 * Process all TT2 directives in template source.
 */
function processDirectives(source, vars, baseDir) {
  let result = source;

  // Strip comments: [%# ... %]
  result = result.replace(/\[%-?\s*#[\s\S]*?-?%\]/g, '');

  // Handle SET directives: [% SET var = value %] or [%- SET var = value -%]
  result = result.replace(/\[%-?\s*SET\s+(\w+)\s*=\s*([\s\S]*?)\s*-?%\]/g, (match, name, expr) => {
    vars[name] = evaluateExpression(expr.trim(), vars);
    return '';
  });

  // Handle USE directives: [% USE Module %] — no-op
  result = result.replace(/\[%-?\s*USE\s+\w+\s*;?\s*-?%\]/g, '');

  // Handle IF/UNLESS blocks (non-nested)
  result = processConditionals(result, vars);

  // Handle variable substitution: [% expr %] or [% expr | filter %]
  result = result.replace(/\[%-?\s*([\s\S]*?)\s*-?%\]/g, (fullMatch, expr) => {
    expr = expr.trim();

    // Skip if it's a known directive keyword that wasn't already handled
    if (/^(WRAPPER|END|BLOCK|INCLUDE|FOREACH|WHILE|SWITCH|CASE|TRY|CATCH|MACRO|CALL|INSERT|PROCESS|FILTER)\b/.test(expr)) {
      console.warn(`[tt2-renderer] Unrecognized directive stripped: ${expr.substring(0, 60)}`);
      return '';
    }

    return substituteVariable(expr, vars);
  });

  // Handle whitespace stripping for -%] (already handled by regex capture)
  // and [%- (strip preceding whitespace)

  return result;
}

/**
 * Process IF and UNLESS conditional blocks.
 * Handles: [% IF cond %]...[% END %], [% UNLESS cond %]...[% END %]
 * Also handles [% IF cond %]...[% ELSE %]...[% END %]
 */
function processConditionals(source, vars) {
  let result = source;
  let changed = true;
  let iterations = 0;

  // Iterate until no more conditionals (handles nested blocks)
  while (changed && iterations < 50) {
    changed = false;
    iterations++;

    // IF ... ELSE ... END
    const ifElseRe = /\[%-?\s*IF\s+(!?\s*[\w.]+(?:\s*\|\|\s*"[^"]*")?)\s*-?%\]([\s\S]*?)\[%-?\s*ELSE\s*-?%\]([\s\S]*?)\[%-?\s*END\s*-?%\]/;
    let m = result.match(ifElseRe);
    if (m) {
      const condition = evaluateCondition(m[1].trim(), vars);
      result = result.replace(ifElseRe, condition ? m[2] : m[3]);
      changed = true;
      continue;
    }

    // IF ... END (no ELSE)
    const ifRe = /\[%-?\s*IF\s+(!?\s*[\w.]+(?:\s*\|\|\s*"[^"]*")?)\s*-?%\]([\s\S]*?)\[%-?\s*END\s*-?%\]/;
    m = result.match(ifRe);
    if (m) {
      const condition = evaluateCondition(m[1].trim(), vars);
      result = result.replace(ifRe, condition ? m[2] : '');
      changed = true;
      continue;
    }

    // UNLESS ... END
    const unlessRe = /\[%-?\s*UNLESS\s+([\w.]+)\s*-?%\]([\s\S]*?)\[%-?\s*END\s*-?%\]/;
    m = result.match(unlessRe);
    if (m) {
      const condition = evaluateCondition(m[1].trim(), vars);
      result = result.replace(unlessRe, condition ? '' : m[2]);
      changed = true;
      continue;
    }
  }

  return result;
}

/**
 * Evaluate a condition expression for IF/UNLESS.
 */
function evaluateCondition(expr, vars) {
  // Handle negation: !var
  if (expr.startsWith('!')) {
    return !evaluateCondition(expr.slice(1).trim(), vars);
  }
  const val = resolveValue(expr, vars);
  return !!val;
}

/**
 * Evaluate an expression and return its value.
 * Handles: 'string', number, var.prop, var || default, method calls
 */
function evaluateExpression(expr, vars) {
  // Handle string || default
  const orMatch = expr.match(/^(.+?)\s*\|\|\s*(.+)$/);
  if (orMatch) {
    const left = evaluateExpression(orMatch[1].trim(), vars);
    if (left) return left;
    return evaluateExpression(orMatch[2].trim(), vars);
  }

  // String literal: 'value'
  if (/^'([^']*)'$/.test(expr)) {
    return expr.slice(1, -1);
  }

  // String literal: "value"
  if (/^"([^"]*)"$/.test(expr)) {
    return expr.slice(1, -1);
  }

  // Number literal
  if (/^\d+$/.test(expr)) {
    return parseInt(expr, 10);
  }

  // Method call: obj.method() or obj.method(args)
  const methodMatch = expr.match(/^([\w.]+)\.(\w+)\(([^)]*)\)$/);
  if (methodMatch) {
    const obj = resolveValue(methodMatch[1], vars);
    const method = methodMatch[2];
    const args = methodMatch[3]
      ? methodMatch[3].split(',').map(a => evaluateExpression(a.trim(), vars))
      : [];
    if (obj && typeof obj[method] === 'function') {
      return obj[method](...args);
    }
    if (obj && typeof obj === 'object' && method in obj) {
      return obj[method];
    }
    return '';
  }

  // Variable reference (possibly dotted): var.prop.subprop
  return resolveValue(expr, vars);
}

/**
 * Resolve a dotted variable path to its value.
 * e.g. "CPANEL.authuser" -> vars.CPANEL.authuser
 */
function resolveValue(path, vars) {
  if (!path || typeof path !== 'string') return '';
  const parts = path.split('.');
  let current = vars;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return '';
    current = current[part];
  }
  return current ?? '';
}

/**
 * Substitute a variable expression, applying filters.
 * Handles: var, var | html, var | uri, expr || default,
 *          obj.method('arg'), CPANEL.prop
 */
function substituteVariable(expr, vars) {
  // Split on pipe for filters: expr | filter
  const filterMatch = expr.match(/^([\s\S]+?)\s*\|\s*(html|uri)\s*$/);
  let valueExpr = expr;
  let filter = null;

  if (filterMatch) {
    valueExpr = filterMatch[1].trim();
    filter = filterMatch[2];
  }

  // Handle .remove('pattern') method
  const removeMatch = valueExpr.match(/^([\w.]+)\.remove\(\s*'([^']*)'\s*\)$/);
  if (removeMatch) {
    let val = String(resolveValue(removeMatch[1], vars) ?? '');
    const pattern = new RegExp(removeMatch[2].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    val = val.replace(pattern, '');
    return applyFilter(val, filter);
  }

  // Handle || default
  const orMatch = valueExpr.match(/^(.+?)\s*\|\|\s*(.+)$/);
  if (orMatch) {
    const left = evaluateExpression(orMatch[1].trim(), vars);
    const right = evaluateExpression(orMatch[2].trim(), vars);
    const val = left || right;
    return applyFilter(String(val ?? ''), filter);
  }

  // Handle method calls: FORM.item("site_id")
  const methodMatch = valueExpr.match(/^([\w.]+)\.(\w+)\(\s*"([^"]*)"\s*\)$/);
  if (methodMatch) {
    const obj = resolveValue(methodMatch[1], vars);
    const method = methodMatch[2];
    const arg = methodMatch[3];
    if (obj && typeof obj[method] === 'function') {
      const result = obj[method](arg);
      return applyFilter(String(result ?? ''), filter);
    }
    return '';
  }

  // Simple variable / dotted access
  const val = evaluateExpression(valueExpr, vars);
  return applyFilter(String(val ?? ''), filter);
}

/**
 * Apply a TT2 output filter.
 */
function applyFilter(value, filter) {
  if (!filter) return value;
  switch (filter) {
    case 'html':
      return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    case 'uri':
      return encodeURIComponent(value);
    default:
      return value;
  }
}
