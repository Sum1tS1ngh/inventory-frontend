import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, Alert, RefreshControl, StatusBar, Platform,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ProductsAPI, ReportsAPI } from '../utils/api';
import { Button, Input, Card, StatCard, SectionHeader, EmptyState, Badge } from '../components/UI';
import LowStockAlert from '../components/LowStockAlert';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';

export default function HomeScreen({ navigation }) {
  const { user, token, signout } = useAuth();
  const [products, setProducts]   = useState([]);
  const [summary, setSummary]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [addModal, setAddModal]   = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  // Add product form
  const [form, setForm] = useState({
    name: '', buyPrice: '', sellPrice: '', quantity: '', minQuantity: '', category: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving]         = useState(false);

  // ── Load data ─────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [prodRes, sumRes] = await Promise.all([
        ProductsAPI.getAll(token),
        ReportsAPI.summary(token),
      ]);
      setProducts(prodRes.products || []);
      setSummary(sumRes);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  // ── Open add/edit modal ───────────────────────────────────────────────────
  const openAdd = () => {
    setEditProduct(null);
    setForm({ name: '', buyPrice: '', sellPrice: '', quantity: '', minQuantity: '', category: '' });
    setFormErrors({});
    setAddModal(true);
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setForm({
      name:        product.name,
      buyPrice:    String(product.buyPrice),
      sellPrice:   String(product.sellPrice),
      quantity:    String(product.quantity),
      minQuantity: String(product.minQuantity),
      category:    product.category || '',
    });
    setFormErrors({});
    setAddModal(true);
  };

  // ── Validate form ─────────────────────────────────────────────────────────
  const validateForm = () => {
    const e = {};
    if (!form.name.trim())         e.name        = 'Product name required';
    if (!form.buyPrice)            e.buyPrice     = 'Buy price required';
    if (!form.sellPrice)           e.sellPrice    = 'Sell price required';
    if (!form.quantity)            e.quantity     = 'Quantity required';
    if (!form.minQuantity)         e.minQuantity  = 'Min quantity required';
    if (isNaN(Number(form.buyPrice)))  e.buyPrice  = 'Must be a number';
    if (isNaN(Number(form.sellPrice))) e.sellPrice = 'Must be a number';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Save product ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        name:        form.name.trim(),
        buyPrice:    Number(form.buyPrice),
        sellPrice:   Number(form.sellPrice),
        quantity:    Number(form.quantity),
        minQuantity: Number(form.minQuantity),
        category:    form.category.trim() || 'General',
      };

      if (editProduct) {
        await ProductsAPI.update(token, editProduct._id, payload);
        Alert.alert('Success', 'Product updated!');
      } else {
        await ProductsAPI.create(token, payload);
        Alert.alert('Success', 'Product added!');
      }
      setAddModal(false);
      loadData();
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete product ────────────────────────────────────────────────────────
  const handleDelete = (product) => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try {
              await ProductsAPI.delete(token, product._id);
              loadData();
            } catch (err) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  // ── Field updater ─────────────────────────────────────────────────────────
  const setField = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (formErrors[key]) setFormErrors(e => ({ ...e, [key]: undefined }));
  };

  const lowStockProducts = products.filter(p => p.quantity <= p.minQuantity);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
      <LowStockAlert />

      {/* ── Top Nav ── */}
      <View style={styles.topNav}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.storeName}>{user?.storeName}</Text>
        </View>
        <View style={styles.navActions}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Reports')}>
            <Text style={styles.navBtnIcon}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: COLORS.danger + '22' }]} onPress={() => {
            Alert.alert('Logout', 'Are you sure?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Logout', style: 'destructive', onPress: signout },
            ]);
          }}>
            <Text style={styles.navBtnIcon}>🚪</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary Stats ── */}
        {summary ? (
          <View style={styles.statsRow}>
            <StatCard label="TODAY SALES" value={`₹${summary.todayRevenue?.toFixed(0) || 0}`} color={COLORS.primary} />
            <StatCard label="TODAY PROFIT" value={`₹${summary.todayProfit?.toFixed(0) || 0}`} color={COLORS.success} />
          </View>
        ) : null}
        <View style={styles.statsRow}>
          <StatCard label="PRODUCTS"   value={String(products.length)} color={COLORS.info} />
          <StatCard label="LOW STOCK"  value={String(lowStockProducts.length)} color={lowStockProducts.length > 0 ? COLORS.danger : COLORS.textMuted} />
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.qaBtn, { backgroundColor: COLORS.primary }]} onPress={openAdd}>
            <Text style={styles.qaBtnIcon}>＋</Text>
            <Text style={styles.qaBtnText}>Add Product</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qaBtn, { backgroundColor: COLORS.accent }]} onPress={() => navigation.navigate('Selling')}>
            <Text style={styles.qaBtnIcon}>💳</Text>
            <Text style={styles.qaBtnText}>Sell Items</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qaBtn, { backgroundColor: COLORS.info }]} onPress={() => navigation.navigate('Reports')}>
            <Text style={styles.qaBtnIcon}>📈</Text>
            <Text style={styles.qaBtnText}>Reports</Text>
          </TouchableOpacity>
        </View>

        {/* ── Low Stock Warning ── */}
        {lowStockProducts.length > 0 && (
          <View style={styles.lowStockBanner}>
            <Text style={styles.lowStockTitle}>⚠️ {lowStockProducts.length} item(s) need restocking</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {lowStockProducts.map(p => (
                <View key={p._id} style={styles.lowStockChip}>
                  <Text style={styles.lowStockChipName}>{p.name}</Text>
                  <Text style={styles.lowStockChipQty}>{p.quantity} left</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Product List ── */}
        <SectionHeader
          title={`Inventory (${products.length})`}
          action="See All →"
          onAction={() => navigation.navigate('Selling')}
        />

        {loadingData ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 24 }} />
        ) : products.length === 0 ? (
          <EmptyState
            icon="📦"
            title="No products yet"
            subtitle="Tap 'Add Product' to start adding your store inventory"
          />
        ) : (
          products.map(product => (
            <ProductCard
              key={product._id}
              product={product}
              onEdit={() => openEdit(product)}
              onDelete={() => handleDelete(product)}
            />
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB Add Button ── */}
      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* ── Add/Edit Product Modal ── */}
      <Modal visible={addModal} animationType="slide" transparent onRequestClose={() => setAddModal(false)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editProduct ? '✏️  Edit Product' : '📦  Add Product'}
                </Text>
                <TouchableOpacity onPress={() => setAddModal(false)}>
                  <Text style={styles.modalCloseBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Input label="Product Name *"      value={form.name}        onChangeText={v => setField('name', v)}        placeholder="e.g. Sugar 1kg"      autoCapitalize="words" error={formErrors.name} />
                <Input label="Category"            value={form.category}    onChangeText={v => setField('category', v)}    placeholder="e.g. Grocery"        autoCapitalize="words" />
                <View style={styles.row}>
                  <Input label="Buy Price (₹) *"   value={form.buyPrice}    onChangeText={v => setField('buyPrice', v)}    placeholder="0.00"  keyboardType="decimal-pad" error={formErrors.buyPrice}  style={{ flex: 1, marginRight: 8 }} />
                  <Input label="Sell Price (₹) *"  value={form.sellPrice}   onChangeText={v => setField('sellPrice', v)}   placeholder="0.00"  keyboardType="decimal-pad" error={formErrors.sellPrice} style={{ flex: 1 }} />
                </View>
                <View style={styles.row}>
                  <Input label="Quantity *"         value={form.quantity}    onChangeText={v => setField('quantity', v)}    placeholder="0"    keyboardType="number-pad"  error={formErrors.quantity}    style={{ flex: 1, marginRight: 8 }} />
                  <Input label="Min Quantity *"     value={form.minQuantity} onChangeText={v => setField('minQuantity', v)} placeholder="5"    keyboardType="number-pad"  error={formErrors.minQuantity} style={{ flex: 1 }} />
                </View>

                {/* Profit preview */}
                {form.buyPrice && form.sellPrice ? (
                  <View style={styles.profitPreview}>
                    <Text style={styles.profitLabel}>Profit per unit</Text>
                    <Text style={[
                      styles.profitValue,
                      { color: (Number(form.sellPrice) - Number(form.buyPrice)) >= 0 ? COLORS.success : COLORS.danger }
                    ]}>
                      ₹{(Number(form.sellPrice) - Number(form.buyPrice)).toFixed(2)}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.row}>
                  <Button title="Cancel"  variant="secondary" onPress={() => setAddModal(false)} style={{ flex: 1, marginRight: 8 }} />
                  <Button title={editProduct ? 'Update' : 'Add Product'} onPress={handleSave} loading={saving} style={{ flex: 2 }} />
                </View>
                <View style={{ height: 30 }} />
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Product Card ──────────────────────────────────────────────────────────────
function ProductCard({ product, onEdit, onDelete }) {
  const isLow = product.quantity <= product.minQuantity;
  return (
    <View style={[pcStyles.card, isLow && pcStyles.cardLow]}>
      <View style={pcStyles.top}>
        <View style={pcStyles.left}>
          <Text style={pcStyles.name} numberOfLines={1}>{product.name}</Text>
          <Text style={pcStyles.cat}>{product.category || 'General'}</Text>
        </View>
        {isLow && <Badge label="LOW STOCK" color={COLORS.danger} />}
      </View>
      <View style={pcStyles.grid}>
        <PriceCell label="Buy"      value={`₹${product.buyPrice}`} />
        <PriceCell label="Sell"     value={`₹${product.sellPrice}`} highlight />
        <PriceCell label="Stock"    value={String(product.quantity)} color={isLow ? COLORS.danger : COLORS.success} />
        <PriceCell label="Min Stock" value={String(product.minQuantity)} />
      </View>
      <View style={pcStyles.actions}>
        <TouchableOpacity style={pcStyles.editBtn} onPress={onEdit}>
          <Text style={pcStyles.editBtnText}>✏️  Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={pcStyles.deleteBtn} onPress={onDelete}>
          <Text style={pcStyles.deleteBtnText}>🗑️  Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PriceCell({ label, value, highlight, color }) {
  return (
    <View style={pcStyles.cell}>
      <Text style={pcStyles.cellLabel}>{label}</Text>
      <Text style={[pcStyles.cellValue, highlight && { color: COLORS.primary }, color && { color }]}>{value}</Text>
    </View>
  );
}

const pcStyles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginBottom: 10,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  cardLow:   { borderColor: COLORS.danger + '44' },
  top:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  left:      { flex: 1 },
  name:      { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cat:       { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  grid:      { flexDirection: 'row', backgroundColor: COLORS.bg, borderRadius: RADIUS.md, padding: 10, marginBottom: 10 },
  cell:      { flex: 1, alignItems: 'center' },
  cellLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', marginBottom: 2 },
  cellValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  actions:   { flexDirection: 'row', gap: 8 },
  editBtn:   { flex: 1, height: 36, backgroundColor: COLORS.primary + '18', borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  editBtnText:   { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
  deleteBtn:     { flex: 1, height: 36, backgroundColor: COLORS.danger + '14', borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { color: COLORS.danger, fontWeight: '700', fontSize: 13 },
});

const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: COLORS.bg },
  topNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.dark,
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingBottom: 16, paddingHorizontal: 20,
  },
  greeting:  { fontSize: 14, color: '#8AADAA' },
  storeName: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 2 },
  navActions:{ flexDirection: 'row', gap: 8 },
  navBtn:    {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary + '33',
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnIcon: { fontSize: 18 },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  statsRow:      { flexDirection: 'row', marginBottom: 8 },

  quickActions: { flexDirection: 'row', gap: 8, marginBottom: 16, marginTop: 8 },
  qaBtn: {
    flex: 1, borderRadius: RADIUS.md, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center', ...SHADOW.sm,
  },
  qaBtnIcon: { fontSize: 20, marginBottom: 4 },
  qaBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  lowStockBanner: {
    backgroundColor: '#FFF1F0', borderRadius: RADIUS.lg, padding: 14,
    marginBottom: 16, borderLeftWidth: 4, borderLeftColor: COLORS.danger,
  },
  lowStockTitle: { fontSize: 13, fontWeight: '700', color: COLORS.danger, marginBottom: 8 },
  lowStockChip:  {
    backgroundColor: COLORS.danger + '18', borderRadius: RADIUS.full,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, alignItems: 'center',
  },
  lowStockChipName: { fontSize: 12, fontWeight: '700', color: COLORS.danger },
  lowStockChipQty:  { fontSize: 10, color: COLORS.danger + 'AA' },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    ...SHADOW.lg,
  },
  fabText: { fontSize: 30, color: '#fff', fontWeight: '300', marginTop: -2 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:   {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: 20, maxHeight: '92%',
  },
  modalHandle:  { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  modalCloseBtn:{ fontSize: 18, color: COLORS.textMuted },

  row:          { flexDirection: 'row' },
  profitPreview:{
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: COLORS.bg, borderRadius: RADIUS.md, padding: 12, marginBottom: 16,
  },
  profitLabel: { fontSize: 13, color: COLORS.textMuted },
  profitValue: { fontSize: 18, fontWeight: '800' },
});
