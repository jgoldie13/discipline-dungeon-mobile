/**
 * Simple class name utility for combining Tailwind classes
 * Filters out falsy values for conditional classes
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
