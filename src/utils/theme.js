// Colors and shared styles taken from the Stitch design (DESIGN.md)
export const colors = {
  primary: '#1E4DB7',
  primaryDark: '#133580',
  primaryLight: '#EBF1FD',
  background: '#F4F6F9',
  card: '#FFFFFF',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  text: '#0F172A',
  muted: '#64748B',
  green: '#2E9E5B',
  greenDark: '#1D6B3C',
  greenLight: '#E8F7EE',
  amber: '#F5A623',
  amberDark: '#B26A00',
  amberLight: '#FEF5E7',
  red: '#D64545',
  redDark: '#9C2727',
  redLight: '#FCEBEB',
  white: '#FFFFFF',
};

// White card with a thin border (used on every screen)
export const cardStyle = {
  backgroundColor: colors.card,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border,
  padding: 16,
  marginBottom: 12,
};

export const textStyles = {
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  heading: { fontSize: 18, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, fontWeight: '500', color: colors.text },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted },
  small: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 0.5 },
};
