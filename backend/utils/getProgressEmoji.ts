export function getProgressEmoji(percentage: number): string {
  if (percentage >= 90) return '🌳';
  if (percentage >= 50) return '🌿';
  return '🌱';
}
