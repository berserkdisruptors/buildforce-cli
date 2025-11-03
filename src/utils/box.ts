import boxen from "boxen";
import { MINT_COLOR } from "../constants.js";

/**
 * Options for creating a box with standardized styling
 */
export interface BoxOptions {
  /** Optional title displayed at top of box (colored green) */
  title?: string;
  /** Padding inside box (default: 1) */
  padding?: number;
  /** Border color as hex string or named color (default: '#D3FFCA' green) */
  borderColor?: string;
  /** Fixed width constraint for box content */
  width?: number;
}

/**
 * Create a standardized box using boxen library
 * 
 * All boxes use green (#D3FFCA) border color by default for visual consistency.
 * Error boxes can override borderColor to 'red' or other colors as needed.
 * 
 * @param content - Content to display in box (string or array of lines)
 * @param options - Box configuration options
 * @returns Formatted box string ready for console output
 * 
 * @example
 * ```typescript
 * // Basic box with green border
 * createBox("Hello World");
 * 
 * // Box with title
 * createBox(["Line 1", "Line 2"], { title: "Information" });
 * 
 * // Error box with red border
 * createBox("Error message", { borderColor: "red", title: "Error" });
 * ```
 */
export function createBox(
  content: string | string[],
  options: BoxOptions = {}
): string {
  const lines = Array.isArray(content) ? content.join("\n") : content;
  
  return boxen(lines, {
    padding: options.padding ?? 1,
    borderColor: options.borderColor ?? "#D3FFCA", // Default green
    title: options.title ? MINT_COLOR(options.title) : undefined,
    width: options.width,
  });
}

