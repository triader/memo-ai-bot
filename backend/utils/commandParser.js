export const commandParser = (text) => {
  if (!text?.startsWith('/')) return null;

  const parts = text.split(' ');
  const command = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  return { command, args };
};
