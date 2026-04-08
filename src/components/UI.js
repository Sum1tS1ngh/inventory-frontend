import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ title, onPress, loading, variant = 'primary', style, textStyle, disabled }) {
  const isSecondary = variant === 'secondary';
  const isDanger    = variant === 'danger';
  const bg = isDanger ? COLORS.danger : isSecondary ? 'transparent' : COLORS.primary;
  const border = isSecondary ? COLORS.primary : 'transparent';
  const textColor = isSecondary ? COLORS.primary : COLORS.textOnDark;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.82}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor: border, borderWidth: isSecondary ? 1.5 : 0 },
        (disabled || loading) && { opacity: 0.6 },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={isSecondary ? COLORS.primary : '#fff'} size="small" />
        : <Text style={[styles.btnText, { color: textColor }, textStyle]}>{title}</Text>
      }
    </TouchableOpacity>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({
  label, value, onChangeText, placeholder, secureTextEntry,
  keyboardType, error, style, inputStyle, editable = true,
  multiline, numberOfLines, autoCapitalize = 'none', icon,
}) {
  return (
    <View style={[styles.inputWrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[
        styles.inputContainer,
        error && { borderColor: COLORS.danger },
        !editable && { backgroundColor: COLORS.surfaceAlt },
      ]}>
        {icon ? <View style={styles.inputIcon}>{icon}</View> : null}
        <TextInput
          style={[styles.input, icon && { paddingLeft: 0 }, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType || 'default'}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ label, color = COLORS.primary, textColor = '#fff', style }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }, style]}>
      <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, icon, color = COLORS.primary, style }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }, style]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {icon ? <View style={styles.statIcon}>{icon}</View> : null}
    </View>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ title, subtitle, icon }) {
  return (
    <View style={styles.emptyState}>
      {icon ? <Text style={styles.emptyIcon}>{icon}</Text> : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    ...SHADOW.sm,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  inputWrapper: { marginBottom: 14 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  errorText: { fontSize: 12, color: COLORS.danger, marginTop: 4 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    ...SHADOW.sm,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    borderLeftWidth: 4,
    ...SHADOW.sm,
    flex: 1,
    marginHorizontal: 4,
  },
  statLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statIcon:  { position: 'absolute', top: 12, right: 12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle:  { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  sectionAction: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyIcon:  { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 32 },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 12 },
});
