// Distinct, accessible developer-palette colors for user presence & cursors
export const PARTICIPANT_COLORS = [
  '#7357E8', // Accent purple
  '#38BDF8', // Cyan
  '#34D399', // Emerald
  '#F472B6', // Rose
  '#FBBF24', // Amber
  '#A78BFA', // Violet
  '#4ADE80', // Mint
  '#FB923C', // Orange
  '#2DD4BF', // Teal
  '#E879F9', // Fuchsia
];

export function getParticipantColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PARTICIPANT_COLORS.length;
  return PARTICIPANT_COLORS[index];
}

export function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getInitials(name: string): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
