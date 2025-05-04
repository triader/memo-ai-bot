export const stripParentheses = (text: string): string => {
  return text.replace(/\s*\([^)]*\)/g, '').trim();
};
