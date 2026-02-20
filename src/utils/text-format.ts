import chalk from "chalk";

/**
 * Hard-wrap text at a given width, respecting word boundaries.
 */
export function hardWrap(text: string, width: number): string[] {
  if (text.length <= width) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    if ((current ? current.length + 1 : 0) + w.length > width) {
      if (current) lines.push(current);
      current = w;
    } else {
      current = current ? current + " " + w : w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Format key-value rows for CLI help display.
 */
export function formatKeyValueRows(
  rows: Array<{ term: string; desc: string }>,
  termWidth: number,
  helpWidth: number
): string[] {
  const pad = 1;
  const boxMaxWidth = 70;
  const innerMax = Math.min(boxMaxWidth, Math.max(20, helpWidth - 2));
  const gutter = 2;
  const clampedTermWidth = Math.min(
    termWidth,
    Math.max(8, Math.floor(innerMax * 0.25))
  );
  const firstLineDescWidth = Math.max(
    20,
    innerMax - pad * 2 - clampedTermWidth - gutter
  );
  const fullDescWidth = innerMax - pad * 2;

  const lines: string[] = [];
  rows.forEach(({ term, desc }, index) => {
    const firstLineWrapped = hardWrap(desc, firstLineDescWidth);
    const firstLineDesc = firstLineWrapped[0] || "";
    const remainingDesc =
      firstLineWrapped.length > 1 ? firstLineWrapped.slice(1).join(" ") : "";

    const firstLine = `${term.padEnd(clampedTermWidth)}${" ".repeat(
      gutter
    )}${chalk.hex("#B8B8B8")(firstLineDesc)}`;
    lines.push(firstLine);

    if (remainingDesc) {
      const wrapped = hardWrap(remainingDesc, fullDescWidth);
      wrapped.forEach((line) => {
        lines.push(chalk.hex("#B8B8B8")(line));
      });
    }

    if (index !== rows.length - 1) {
      lines.push("");
    }
  });
  return lines;
}
