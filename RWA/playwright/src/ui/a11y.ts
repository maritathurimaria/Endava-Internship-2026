import type { Page, TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility helpers on top of axe-core. Functions, not page objects:
 *
 *   const results = await scanA11y(page, testInfo, "sign-in");
 *   expect(newViolations(results, "critical", KNOWN)).toEqual([]);
 */

export type AxeResults = Awaited<ReturnType<AxeBuilder["analyze"]>>;
export type Impact = "minor" | "moderate" | "serious" | "critical";

/** WCAG 2.0/2.1/2.2 A + AA rules (axe tags). */
export const WCAG_TAGS = Object.freeze(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]);

/** Run axe on the current page and attach the full results as JSON to the test report. */
export const scanA11y = async (
  page: Page,
  testInfo: TestInfo,
  name: string,
  { tags = WCAG_TAGS, exclude = [] }: { tags?: readonly string[]; exclude?: readonly string[] } = {},
): Promise<AxeResults> => {
  const builder = exclude.reduce((b, selector) => b.exclude(selector), new AxeBuilder({ page }).withTags([...tags]));
  const results = await builder.analyze();
  await testInfo.attach(`axe-${name}.json`, { body: JSON.stringify(results, null, 2), contentType: "application/json" });
  return results;
};

/** "rule-id (impact): help — N node(s): selector, …" one-liners for readable assertions. */
export const describeViolations = (violations: AxeResults["violations"]): string[] =>
  violations.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s): ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" "))
        .join(", ")}`,
  );

/** Violations at `impact` whose rule id is not in the known baseline. */
export const newViolations = (results: AxeResults, impact: Impact, known: readonly string[] = []): string[] =>
  describeViolations(results.violations.filter((v) => v.impact === impact && !known.includes(v.id)));
