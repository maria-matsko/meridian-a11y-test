---
name: "wcag-finding-review"
description: "Use this whenever formulating, filing, or fixing a WCAG accessibility finding for @webpros/ui components — whether in a live audit session, a Cowork session, or an automated GitHub Actions detection/autofix run. Triggers include: reviewing a component for WCAG 2.2 A/AA compliance, writing up an accessibility finding, proposing an a11y fix, or deciding whether a finding is safe to auto-fix. Based on documented, recurring failure patterns from audit PUI-2325 (see the 'Accessibility Audit: Findings, Fixes, and Automation Potential' report) — do not skip the pre-flight checks even when a violation looks obvious, even if a similar finding was already filed elsewhere in the same session."
---

## Why this exists

A full audit of `@webpros/ui` found that most detection errors weren't about not knowing WCAG criteria — they were about specific, recurring interpretation mistakes that happened even when the underlying WCAG knowledge was correct. The same mistakes recurred multiple times within a single session before becoming explicit rules. This skill exists so those mistakes don't have to be rediscovered every time.

## Before filing any finding

Run every candidate finding through all five checks below, in order, before writing it up as a WCAG violation. If any check isn't fully satisfied, don't file it as a finding — flag it as "needs manual review" and state which check failed. A finding with an unresolved check is not a weaker finding; it isn't a finding yet.

### 1. Conformance level
State explicitly whether the criterion is WCAG A/AA (mandatory) or AAA (not mandatory for AA conformance). Look up the actual criterion number — don't infer the level from how strict the rule sounds. AA and AAA have been confused twice in past audits on criteria that looked similarly worded (Focus Appearance turned out to be 2.4.13/AAA, not 2.4.7/AA; a missing 44px target size turned out to be 2.5.5/AAA, not 2.5.8/AA which only requires 24px). If it's AAA, don't file it as a blocker — at most a recommendation.

### 2. Threshold vs. absolute ban
Rules that sound categorical ("never," "must always") almost always have a numeric threshold or a defined scope buried in the actual criterion text. "Never color alone" is the canonical trap: WCAG 1.4.1 permits distinguishing states by color/lightness alone if the contrast between states is ≥3:1 — the rule is about contrast, not about color as a concept. This was the single largest source of false positives in past audits (6+ findings in one session). Check the criterion's actual text for a number before treating anything as an absolute prohibition.

### 3. Existing opt-in path
Before proposing a change to a component's default behavior, type signature, or public API, check whether the component already exposes an opt-in way to achieve compliance (a prop, a flag, a documented pattern) that simply isn't being used on the screen in question. "Not used everywhere" is not the same claim as "not supported." This exact mistake recurred 4 times in a row in one audit before the team made it an explicit rule: if a compliant path already exists, failing to use it on a specific screen is a product decision, not a design-system bug.

### 4. Verified against live code
Don't carry forward a finding's wording from a prior ticket, a hypothesis, or an assumption about "how the codebase probably works." Check the actual current state — the real file, or a live Storybook/running instance. At least one past finding (a claimed height mismatch between form controls) was entirely fabricated: the components were already consistent, and the inconsistency never existed. Fabricated non-compliance costs real review time and erodes trust in every subsequent finding from the same source.

### 5. Recalculated by formula
For any contrast or sizing claim, compute the actual number for the specific pair of tokens/elements in question (e.g., from their OKLCH or RGB values) — don't treat "another component already handles this correctly" as proof this instance is fine. A value that passes for one background or element size does not transfer to a different one, even when the two look superficially similar. This applies equally to focus-ring contrast: the correct opacity differs per ring+background pair and can't be copied from a "reference" value.

## Before proposing or committing a fix

Once a finding has passed all five checks above, run these before writing or shipping the fix itself:

1. **Stress-test against product principles.** If the codebase has a PRODUCT.md, CLAUDE.md, or equivalent, explicitly check the proposed fix against its stated principles before it goes into a PR. A formally correct fix can still be the wrong fix — a visible-badge solution for a status indicator was merged, then reverted days later because it visually contradicted a documented "calm under density" principle, at a cost of three follow-up tickets to unwind.
2. **Check existing codebase conventions before writing new code.** For story files, component patterns, prop naming, etc., check the actual frequency of existing conventions in the repo (e.g. grep for how similar props are configured elsewhere) rather than picking a plausible-looking option. A single inconsistent choice (using one control type where the rest of the library used another, with one single exception elsewhere) is a signal to search harder, not a justification.
3. **Recalculate contrast/size separately for each component.** Never copy a numeric value across different token pairs or components just because they look visually similar.
4. **Rebase from current `origin/main`** before continuing work, especially partway through a chain of related tickets where an earlier PR in the chain has already merged.
5. **Check required registration/config files** (e.g. a components registry, a design-sync config, a titleMap) as an explicit step — don't rely on CI to catch a missing registration after the fact.

## Categorizing a finding for automation

Every finding that passes the pre-flight checks gets tagged with exactly one of the following, based on its category — not on how confident the diagnosis feels:

- 🟢 **Safe for full automation** (detection + fix, no review needed): token contrast with no visual trade-off, hit targets on existing components, ARIA attributes/semantics, focus-ring contrast — provided the pre-flight checklist passed.
- 🟡 **Detect automatically, escalate the fix to a human**: contrast changes that carry a visual trade-off (e.g. a border token whose value competes with visual weight), a new "color as signal" case with no existing component to swap in, keyboard-navigation changes, or any decision between multiple valid architectural paths (e.g. WCAG 2.1.4's three valid remediation options for a single-key shortcut).
- 🔴 **Don't auto-file**: any finding that didn't fully clear the pre-flight checklist. State which specific check failed rather than filing a partial or hedged finding.

A finding's category is determined by what kind of decision the fix requires, not by how the specific instance looks. A hit-target fix on an *existing* component (layering an invisible larger hit area with no visual change) is 🟢; the same underlying criterion applied to a component that needs a new size variant and a new API is 🟡, because that requires a redesign decision.

## Finding output format

Every finding must state, explicitly and in this order:

1. The WCAG criterion number and level (e.g., "1.4.1 Use of Color, Level A").
2. Whether the rule is a threshold (with the specific number) or an absolute condition.
3. Whether it's been verified against live code/component — yes/no, with a file reference, commit, or Storybook link.
4. Whether an opt-in compliance path already exists in the component's API — yes/no.
5. The automation category (🟢/🟡/🔴) and the proposed fix, stated as either automatic or requiring review — and why.

## Recurring mistakes to actively watch for

These are not hypothetical failure modes — each recurred multiple times in a single past audit session:

- Reading a rule with a measurable threshold as if it were a binary ban.
- Treating a component's use of an existing opt-in on only some screens as a library defect rather than a product decision.
- Filing a cross-component inconsistency claim without checking whether the inconsistency actually exists in current code.
- Shipping a fix that is formally correct but visually or product-wise wrong, without checking it against the product's own stated design principles first.
- Using an unconventional pattern (component type, prop config, control type) without first checking how the rest of the codebase already does it.
- Repeating the same process mistake across multiple tickets in the same session instead of carrying the lesson forward once caught.
