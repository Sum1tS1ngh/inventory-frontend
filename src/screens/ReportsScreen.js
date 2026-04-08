import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ReportsAPI } from '../utils/api';
import LowStockAlert from '../components/LowStockAlert';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';

// Helpers: use local calendar (not UTC) so "today" and weekday match the device timezone
const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const displayDate = (str) => {
  const [y, m, d] = str.split('-').map(Number);
  const local = new Date(y, m - 1, d, 12, 0, 0, 0);
  return local.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
};
/** YYYY-MM-DD → short local date label */
const shortLocalDate = (ymd) => {
  const p = ymd.split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2], 12, 0, 0, 0).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/** YYYY-MM-DD → weekday (short) */
const weekdayShort = (ymd) => {
  const p = ymd.split('-').map(Number);
  return new Date(p[0], p[1] - 1, p[2], 12, 0, 0, 0).toLocaleDateString('en-IN', { weekday: 'short' });
};

export default function ReportsScreen({ navigation }) {
  const { token } = useAuth();

  const [daily, setDaily]     = useState(null);
  const [weekly, setWeekly]   = useState(null);
  const [loading, setLoading] = useState(true);
  // null until first load: backend picks "today" using REPORT_TIMEZONE (matches weekly / store calendar)
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' | 'weekly'

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const dateQuery = selectedDate || undefined;
      const [d, w] = await Promise.all([
        ReportsAPI.daily(token, dateQuery),
        ReportsAPI.weekly(token),
      ]);
      setDaily(d);
      setWeekly(w);
      if (selectedDate == null && d.date) {
        setSelectedDate(d.date);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [token, selectedDate]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const reportToday = daily?.reportToday;

  const changeDate = (delta) => {
    if (!selectedDate || !reportToday) return;
    const [y, m, d] = selectedDate.split('-').map(Number);
    const base = new Date(y, m - 1, d, 12, 0, 0, 0);
    base.setDate(base.getDate() + delta);
    const next = fmtDate(base);
    if (next > reportToday) return;
    setSelectedDate(next);
  };

  const isToday = Boolean(selectedDate && reportToday && selectedDate === reportToday);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
      <LowStockAlert />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊  Reports</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        {['daily', 'weekly'].map(t => (
          <TouchableOpacity
            key={t} style={[styles.tab, activeTab === t && styles.tabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
              {t === 'daily' ? '📅 Daily' : '📆 Weekly'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'daily' && daily && selectedDate ? (
            <DailyReport
              data={daily}
              date={selectedDate}
              onPrev={() => changeDate(-1)}
              onNext={() => changeDate(1)}
              isToday={isToday}
            />
          ) : null}

          {activeTab === 'weekly' && weekly ? (
            <WeeklyReport data={weekly} />
          ) : null}

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ── Daily Report ──────────────────────────────────────────────────────────────
function DailyReport({ data, date, onPrev, onNext, isToday }) {
  const rowDate = data.date || date;
  return (
    <>
      {/* Date Navigator — label uses API `data.date` so it always matches the report bucket (REPORT_TIMEZONE) */}
      <View style={rStyles.dateNav}>
        <TouchableOpacity style={rStyles.dateNavBtn} onPress={onPrev}>
          <Text style={rStyles.dateNavArrow}>‹</Text>
        </TouchableOpacity>
        <View style={rStyles.dateCenter}>
          <Text style={rStyles.dateTxt}>{displayDate(rowDate)}</Text>
          {data.timezone ? (
            <Text style={rStyles.dateTz}>{data.timezone.replace(/_/g, ' ')}</Text>
          ) : null}
          {isToday && <Text style={rStyles.todayBadge}>Today</Text>}
        </View>
        <TouchableOpacity style={[rStyles.dateNavBtn, isToday && { opacity: 0.3 }]} onPress={onNext} disabled={isToday}>
          <Text style={rStyles.dateNavArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Overview Cards */}
      <View style={rStyles.overviewGrid}>
        <BigStatCard
          label="Total Revenue"
          value={`₹${data.totalRevenue?.toFixed(2) || '0.00'}`}
          icon="💰" color={COLORS.primary}
        />
        <BigStatCard
          label="Total Profit"
          value={`₹${data.totalProfit?.toFixed(2) || '0.00'}`}
          icon="📈" color={COLORS.success}
        />
      </View>
      <View style={rStyles.overviewGrid}>
        <BigStatCard
          label="Total Cost"
          value={`₹${data.totalCost?.toFixed(2) || '0.00'}`}
          icon="🏷️" color={COLORS.warning}
        />
        <BigStatCard
          label="Transactions"
          value={String(data.totalTransactions || 0)}
          icon="🧾" color={COLORS.info}
        />
      </View>

      {/* Profit Margin */}
      {data.totalRevenue > 0 && (
        <View style={rStyles.marginCard}>
          <Text style={rStyles.marginLabel}>Profit Margin</Text>
          <View style={rStyles.marginBarBg}>
            <View style={[rStyles.marginBarFill, { width: `${Math.min(data.profitMargin, 100)}%` }]} />
          </View>
          <Text style={rStyles.marginPct}>{data.profitMargin}%</Text>
        </View>
      )}

      {/* No Sales */}
      {data.totalTransactions === 0 && (
        <View style={rStyles.noSales}>
          <Text style={rStyles.noSalesIcon}>🏪</Text>
          <Text style={rStyles.noSalesTitle}>No sales on this day</Text>
          <Text style={rStyles.noSalesSub}>Go to Selling screen to record sales</Text>
        </View>
      )}

      {/* Most & Least Selling */}
      {(data.mostSelling || data.leastSelling) && (
        <>
          <Text style={rStyles.sectionTitle}>Product Highlights</Text>
          <View style={rStyles.highlightRow}>
            {data.mostSelling && (
              <View style={[rStyles.highlightCard, { borderTopColor: COLORS.success }]}>
                <Text style={rStyles.hlLabel}>🏆 Most Sold</Text>
                <Text style={rStyles.hlName} numberOfLines={2}>{data.mostSelling.name}</Text>
                <Text style={rStyles.hlQty}>{data.mostSelling.quantitySold} units</Text>
                <Text style={rStyles.hlRevenue}>₹{data.mostSelling.revenue?.toFixed(2)}</Text>
              </View>
            )}
            {data.leastSelling && data.leastSelling.name !== data.mostSelling?.name && (
              <View style={[rStyles.highlightCard, { borderTopColor: COLORS.danger }]}>
                <Text style={rStyles.hlLabel}>📉 Least Sold</Text>
                <Text style={rStyles.hlName} numberOfLines={2}>{data.leastSelling.name}</Text>
                <Text style={rStyles.hlQty}>{data.leastSelling.quantitySold} units</Text>
                <Text style={rStyles.hlRevenue}>₹{data.leastSelling.revenue?.toFixed(2)}</Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* Product Breakdown Table */}
      {data.productBreakdown?.length > 0 && (
        <>
          <Text style={rStyles.sectionTitle}>Product Breakdown</Text>
          <View style={rStyles.table}>
            <View style={[rStyles.tableRow, rStyles.tableHeader]}>
              <Text style={[rStyles.tableCell, rStyles.tableHCell, { flex: 2 }]}>Product</Text>
              <Text style={[rStyles.tableCell, rStyles.tableHCell]}>Qty</Text>
              <Text style={[rStyles.tableCell, rStyles.tableHCell]}>Revenue</Text>
              <Text style={[rStyles.tableCell, rStyles.tableHCell]}>Profit</Text>
            </View>
            {data.productBreakdown.map((p, i) => (
              <View key={i} style={[rStyles.tableRow, i % 2 === 1 && rStyles.tableRowAlt]}>
                <Text style={[rStyles.tableCell, { flex: 2, fontWeight: '600', color: COLORS.textPrimary }]} numberOfLines={1}>{p.name}</Text>
                <Text style={rStyles.tableCell}>{p.quantitySold}</Text>
                <Text style={rStyles.tableCell}>₹{p.revenue?.toFixed(0)}</Text>
                <Text style={[rStyles.tableCell, { color: p.profit >= 0 ? COLORS.success : COLORS.danger, fontWeight: '700' }]}>
                  ₹{p.profit?.toFixed(0)}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* Hourly Heatmap */}
      {data.hourlyData?.length > 0 && (
        <>
          <Text style={rStyles.sectionTitle}>Sales by Hour</Text>
          <View style={rStyles.hourlyGrid}>
            {data.hourlyData.map((h, i) => {
              const maxRev = Math.max(...data.hourlyData.map(x => x.revenue));
              const pct = maxRev > 0 ? h.revenue / maxRev : 0;
              return (
                <View key={i} style={rStyles.hourlyCell}>
                  <View style={[rStyles.hourlyBar, { height: Math.max(4, pct * 60), backgroundColor: COLORS.primary + (Math.round(pct * 200 + 55).toString(16).padStart(2, '0')) }]} />
                  <Text style={rStyles.hourlyLbl}>{h.hour}h</Text>
                  <Text style={rStyles.hourlyTx}>{h.transactions}x</Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </>
  );
}

// ── Weekly Report ─────────────────────────────────────────────────────────────
function WeeklyReport({ data }) {
  const maxRev = Math.max(...(data.dailyBreakdown || []).map(d => d.revenue), 1);

  return (
    <>
      <View style={rStyles.overviewGrid}>
        <BigStatCard label="Week Revenue" value={`₹${data.totalRevenue?.toFixed(2)}`} icon="💰" color={COLORS.primary} />
        <BigStatCard label="Week Profit"  value={`₹${data.totalProfit?.toFixed(2)}`}  icon="📈" color={COLORS.success} />
      </View>
      <View style={rStyles.overviewGrid}>
        <BigStatCard label="Transactions" value={String(data.totalTransactions)} icon="🧾" color={COLORS.info} />
        <BigStatCard
          label="Avg Daily Rev"
          value={`₹${(data.totalRevenue / 7).toFixed(0)}`}
          icon="📊" color={COLORS.warning}
        />
      </View>

      {data.timezone ? (
        <Text style={[rStyles.dateTz, { textAlign: 'center', marginBottom: 10 }]}>
          Calendar: {data.timezone.replace(/_/g, ' ')}
        </Text>
      ) : null}

      <Text style={rStyles.sectionTitle}>Last 7 Days</Text>
      <View style={rStyles.weekChart}>
        {(data.dailyBreakdown || []).map((day, i) => {
          const pct = maxRev > 0 ? day.revenue / maxRev : 0;
          const dayName = weekdayShort(day.date);
          return (
            <View key={i} style={rStyles.weekBar}>
              <Text style={rStyles.weekBarRevTxt}>
                {day.revenue > 0 ? `₹${(day.revenue / 1000).toFixed(1)}k` : ''}
              </Text>
              <View style={rStyles.weekBarTrack}>
                <View style={[
                  rStyles.weekBarFill,
                  { height: Math.max(4, pct * 120), backgroundColor: day.revenue > 0 ? COLORS.primary : COLORS.border }
                ]} />
              </View>
              <Text style={rStyles.weekBarDay}>{dayName}</Text>
              <Text style={rStyles.weekBarTx}>{day.transactions}x</Text>
            </View>
          );
        })}
      </View>

      {/* Profit vs Revenue table */}
      <Text style={rStyles.sectionTitle}>Daily Breakdown</Text>
      <View style={rStyles.table}>
        <View style={[rStyles.tableRow, rStyles.tableHeader]}>
          <Text style={[rStyles.tableCell, rStyles.tableHCell, { flex: 1.5 }]}>Date</Text>
          <Text style={[rStyles.tableCell, rStyles.tableHCell]}>Sales</Text>
          <Text style={[rStyles.tableCell, rStyles.tableHCell]}>Revenue</Text>
          <Text style={[rStyles.tableCell, rStyles.tableHCell]}>Profit</Text>
        </View>
        {(data.dailyBreakdown || []).map((day, i) => (
          <View key={i} style={[rStyles.tableRow, i % 2 === 1 && rStyles.tableRowAlt]}>
            <Text style={[rStyles.tableCell, { flex: 1.5, color: COLORS.textPrimary, fontWeight: '600' }]}>
              {shortLocalDate(day.date)}
            </Text>
            <Text style={rStyles.tableCell}>{day.transactions}</Text>
            <Text style={rStyles.tableCell}>₹{day.revenue?.toFixed(0)}</Text>
            <Text style={[rStyles.tableCell, { color: day.profit >= 0 ? COLORS.success : COLORS.danger, fontWeight: '700' }]}>
              ₹{day.profit?.toFixed(0)}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

// ── Big Stat Card ─────────────────────────────────────────────────────────────
function BigStatCard({ label, value, icon, color }) {
  return (
    <View style={[rStyles.bigStatCard, { borderTopColor: color }]}>
      <Text style={rStyles.bigStatIcon}>{icon}</Text>
      <Text style={rStyles.bigStatValue}>{value}</Text>
      <Text style={rStyles.bigStatLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.dark, paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingBottom: 14,
  },
  backBtn:     { padding: 4 },
  backIcon:    { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff', flex: 1, textAlign: 'center' },
  tabRow:      {
    flexDirection: 'row', backgroundColor: COLORS.dark,
    paddingHorizontal: 16, paddingBottom: 12, gap: 8,
  },
  tab:         {
    flex: 1, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: RADIUS.md, backgroundColor: '#1A3540',
  },
  tabActive:   { backgroundColor: COLORS.primary },
  tabText:     { fontSize: 14, fontWeight: '600', color: '#8AADAA' },
  tabTextActive: { color: '#fff' },
  scroll:      { flex: 1 },
  scrollContent: { padding: 16 },
});

const rStyles = StyleSheet.create({
  dateNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12,
    marginBottom: 14, ...SHADOW.sm,
  },
  dateNavBtn:  { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  dateNavArrow:{ fontSize: 28, color: COLORS.primary, fontWeight: '700' },
  dateCenter:  { alignItems: 'center' },
  dateTxt:     { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  dateTz:      { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginTop: 2 },
  todayBadge:  { fontSize: 11, color: COLORS.primary, fontWeight: '700', marginTop: 4 },

  overviewGrid: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  bigStatCard:  {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 16, alignItems: 'center', borderTopWidth: 4, ...SHADOW.sm,
  },
  bigStatIcon:  { fontSize: 24, marginBottom: 4 },
  bigStatValue: { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary },
  bigStatLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginTop: 4, textAlign: 'center' },

  marginCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16,
    marginBottom: 14, ...SHADOW.sm,
  },
  marginLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', marginBottom: 8 },
  marginBarBg: { height: 10, backgroundColor: COLORS.border, borderRadius: 5, marginBottom: 6 },
  marginBarFill: { height: 10, backgroundColor: COLORS.success, borderRadius: 5 },
  marginPct:  { fontSize: 18, fontWeight: '800', color: COLORS.success, textAlign: 'right' },

  noSales:    { alignItems: 'center', paddingVertical: 32, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, marginBottom: 14 },
  noSalesIcon:{ fontSize: 40, marginBottom: 8 },
  noSalesTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textSecondary },
  noSalesSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, textAlign: 'center' },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10, marginTop: 6 },

  highlightRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  highlightCard: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: 14, borderTopWidth: 4, ...SHADOW.sm,
  },
  hlLabel:   { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  hlName:    { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  hlQty:     { fontSize: 20, fontWeight: '900', color: COLORS.textPrimary, marginTop: 4 },
  hlRevenue: { fontSize: 13, color: COLORS.primary, fontWeight: '700', marginTop: 2 },

  table: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 16, ...SHADOW.sm },
  tableRow:    { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12 },
  tableRowAlt: { backgroundColor: COLORS.bg },
  tableHeader: { backgroundColor: COLORS.dark },
  tableCell:   { flex: 1, fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  tableHCell:  { color: '#8AADAA', fontWeight: '700' },

  hourlyGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 12,
    marginBottom: 16, ...SHADOW.sm,
  },
  hourlyCell:  { alignItems: 'center', width: 36 },
  hourlyBar:   { width: 20, borderRadius: 4, marginBottom: 2 },
  hourlyLbl:   { fontSize: 10, color: COLORS.textMuted },
  hourlyTx:    { fontSize: 9, color: COLORS.textMuted },

  weekChart: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: 16,
    height: 200, marginBottom: 16, ...SHADOW.sm,
  },
  weekBar:       { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  weekBarRevTxt: { fontSize: 9, color: COLORS.textMuted, marginBottom: 2, textAlign: 'center' },
  weekBarTrack:  { width: 28, height: 120, justifyContent: 'flex-end' },
  weekBarFill:   { width: 28, borderRadius: 6, minHeight: 4 },
  weekBarDay:    { fontSize: 11, color: COLORS.textMuted, marginTop: 4, fontWeight: '600' },
  weekBarTx:     { fontSize: 9, color: COLORS.textMuted },
});
