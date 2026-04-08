import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Alert, Platform, StatusBar,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ProductsAPI, SalesAPI } from '../utils/api';
import { buildBillMessageFromSale, openWhatsAppWithBill } from '../utils/whatsappBill';
import { Button, Badge, EmptyState } from '../components/UI';
import LowStockAlert from '../components/LowStockAlert';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';

export default function SellingScreen({ navigation }) {
  const { token } = useAuth();
  const [products, setProducts]     = useState([]);
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [cart, setCart]             = useState([]);     // [{ product, qty }]
  const [cartModal, setCartModal]   = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState(null); // sale result
  const [billWhatsApp, setBillWhatsApp] = useState('');

  // ── Fetch products ────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const res = await ProductsAPI.getAll(token, q);
      setProducts(res.products || []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => fetchProducts(search), 400);
    return () => clearTimeout(t);
  }, [search, fetchProducts]);

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const cartTotal = cart.reduce((s, c) => s + c.product.sellPrice * c.qty, 0);

  const addToCart = (product) => {
    if (product.quantity <= 0) {
      Alert.alert('Out of Stock', `"${product.name}" is out of stock.`);
      return;
    }
    setCart(prev => {
      const idx = prev.findIndex(c => c.product._id === product._id);
      if (idx >= 0) {
        const existing = prev[idx];
        if (existing.qty >= product.quantity) {
          Alert.alert('Stock Limit', `Only ${product.quantity} units available.`);
          return prev;
        }
        const updated = [...prev];
        updated[idx] = { ...existing, qty: existing.qty + 1 };
        return updated;
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(c => c.product._id !== productId));
  };

  const updateQty = (productId, delta) => {
    setCart(prev => {
      return prev.map(c => {
        if (c.product._id !== productId) return c;
        const newQty = c.qty + delta;
        if (newQty <= 0) return null;
        if (newQty > c.product.quantity) {
          Alert.alert('Stock Limit', `Max ${c.product.quantity} units.`);
          return c;
        }
        return { ...c, qty: newQty };
      }).filter(Boolean);
    });
  };

  // ── Checkout ──────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    Alert.alert(
      'Confirm Sale',
      `Sell ${cartCount} item(s) for ₹${cartTotal.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setCheckingOut(true);
            try {
              const res = await SalesAPI.create(token, {
                items: cart.map(c => ({ productId: c.product._id, quantity: c.qty })),
              });
              setSaleSuccess(res);
              setCart([]);
              setCartModal(false);
              fetchProducts(search);
            } catch (err) {
              Alert.alert('Sale Failed', err.message);
            } finally {
              setCheckingOut(false);
            }
          },
        },
      ]
    );
  };

  // ── Render product row ────────────────────────────────────────────────────
  const renderProduct = ({ item: product }) => {
    const inCart = cart.find(c => c.product._id === product._id);
    const isOut  = product.quantity === 0;
    const isLow  = product.quantity <= product.minQuantity && product.quantity > 0;

    return (
      <View style={[pStyles.row, isOut && pStyles.rowOut]}>
        <View style={pStyles.left}>
          <View style={pStyles.nameRow}>
            <Text style={pStyles.name} numberOfLines={1}>{product.name}</Text>
            {isLow && <Badge label="LOW" color={COLORS.warning} style={{ marginLeft: 6 }} />}
            {isOut && <Badge label="OUT" color={COLORS.danger} style={{ marginLeft: 6 }} />}
          </View>
          <Text style={pStyles.cat}>{product.category || 'General'}</Text>
          <View style={pStyles.priceRow}>
            <Text style={pStyles.price}>₹{product.sellPrice}</Text>
            <Text style={pStyles.stock}>  •  {product.quantity} in stock</Text>
          </View>
        </View>

        <View style={pStyles.right}>
          {inCart ? (
            <View style={pStyles.qtyCtrl}>
              <TouchableOpacity style={pStyles.qtyBtn} onPress={() => updateQty(product._id, -1)}>
                <Text style={pStyles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={pStyles.qtyVal}>{inCart.qty}</Text>
              <TouchableOpacity style={pStyles.qtyBtn} onPress={() => updateQty(product._id, 1)}>
                <Text style={pStyles.qtyBtnText}>＋</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[pStyles.addBtn, isOut && { opacity: 0.4 }]}
              onPress={() => addToCart(product)}
              disabled={isOut}
            >
              <Text style={pStyles.addBtnText}>＋ Add</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.dark} />
      <LowStockAlert />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>💳  Sell Products</Text>
        <TouchableOpacity style={styles.cartBtn} onPress={() => cart.length > 0 && setCartModal(true)}>
          <Text style={styles.cartIcon}>🛒</Text>
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search products by name..."
          placeholderTextColor={COLORS.textMuted}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={{ color: COLORS.textMuted, fontSize: 16, paddingHorizontal: 6 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Product List */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={p => p._id}
          renderItem={renderProduct}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="🔍"
              title="No products found"
              subtitle={search ? `No results for "${search}"` : 'Add products from the home screen'}
            />
          }
          ListFooterComponent={<View style={{ height: 120 }} />}
        />
      )}

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <TouchableOpacity style={styles.cartFab} onPress={() => setCartModal(true)}>
          <View style={styles.cartFabInner}>
            <Text style={styles.cartFabText}>🛒  {cartCount} item{cartCount > 1 ? 's' : ''}</Text>
            <Text style={styles.cartFabTotal}>₹{cartTotal.toFixed(2)}</Text>
          </View>
          <Text style={styles.cartFabArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Cart Modal */}
      <Modal visible={cartModal} animationType="slide" transparent onRequestClose={() => setCartModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🛒  Your Cart ({cartCount})</Text>
              <TouchableOpacity onPress={() => setCartModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {cart.map(c => (
                <View key={c.product._id} style={styles.cartItem}>
                  <View style={styles.cartItemLeft}>
                    <Text style={styles.cartItemName}>{c.product.name}</Text>
                    <Text style={styles.cartItemUnit}>₹{c.product.sellPrice} × {c.qty}</Text>
                  </View>
                  <View style={styles.cartItemRight}>
                    <Text style={styles.cartItemTotal}>₹{(c.product.sellPrice * c.qty).toFixed(2)}</Text>
                    <View style={pStyles.qtyCtrl}>
                      <TouchableOpacity style={pStyles.qtyBtn} onPress={() => updateQty(c.product._id, -1)}>
                        <Text style={pStyles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={pStyles.qtyVal}>{c.qty}</Text>
                      <TouchableOpacity style={pStyles.qtyBtn} onPress={() => updateQty(c.product._id, 1)}>
                        <Text style={pStyles.qtyBtnText}>＋</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity onPress={() => removeFromCart(c.product._id)} style={styles.removeBtn}>
                      <Text style={styles.removeBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Totals */}
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalVal}>₹{cartTotal.toFixed(2)}</Text>
              </View>
              <View style={[styles.totalRow, { marginTop: 4 }]}>
                <Text style={[styles.totalLabel, { fontWeight: '800', color: COLORS.textPrimary }]}>Total</Text>
                <Text style={[styles.totalVal, { fontSize: 22, color: COLORS.primary }]}>₹{cartTotal.toFixed(2)}</Text>
              </View>
            </View>

            <Text style={styles.whatsappLabel}>Customer WhatsApp (optional)</Text>
            <TextInput
              style={styles.whatsappInput}
              value={billWhatsApp}
              onChangeText={setBillWhatsApp}
              placeholder="Country code + number, e.g. 919876543210"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              autoCorrect={false}
            />

            <Button
              title={`Confirm Sale  ₹${cartTotal.toFixed(2)}`}
              onPress={handleCheckout}
              loading={checkingOut}
              style={{ marginTop: 12 }}
            />
            <Button title="Continue Shopping" variant="secondary" onPress={() => setCartModal(false)} style={{ marginTop: 8 }} />
            <View style={{ height: 20 }} />
          </View>
        </View>
      </Modal>

      {/* Sale Success Modal */}
      <Modal visible={!!saleSuccess} animationType="fade" transparent onRequestClose={() => setSaleSuccess(null)}>
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Text style={styles.successIcon}>🎉</Text>
            <Text style={styles.successTitle}>Sale Recorded!</Text>
            <Text style={styles.successAmount}>₹{saleSuccess?.sale?.totalRevenue?.toFixed(2)}</Text>
            <Text style={styles.successProfit}>Profit: ₹{saleSuccess?.sale?.totalProfit?.toFixed(2)}</Text>
            {saleSuccess?.lowStockAlerts?.length > 0 && (
              <View style={styles.saleAlertBox}>
                <Text style={styles.saleAlertTitle}>⚠️ Low Stock Alerts:</Text>
                {saleSuccess.lowStockAlerts.map((a, i) => (
                  <Text key={i} style={styles.saleAlertItem}>• {a.name}: {a.quantity} left</Text>
                ))}
              </View>
            )}
            <Text style={[styles.whatsappLabel, { marginTop: 16, alignSelf: 'stretch', textAlign: 'left' }]}>
              Send bill on WhatsApp
            </Text>
            <TextInput
              style={[styles.whatsappInput, { alignSelf: 'stretch', width: '100%' }]}
              value={billWhatsApp}
              onChangeText={setBillWhatsApp}
              placeholder="Country code + number, e.g. 919876543210"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
              autoCorrect={false}
            />
            <Button
              title="Send bill on WhatsApp"
              variant="secondary"
              onPress={() =>
                openWhatsAppWithBill(billWhatsApp, buildBillMessageFromSale(saleSuccess?.sale))
              }
              style={{ marginTop: 12, alignSelf: 'stretch', width: '100%' }}
            />
            <Button title="Done" onPress={() => setSaleSuccess(null)} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const pStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: 14, marginBottom: 8, ...SHADOW.sm,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  rowOut:  { opacity: 0.5 },
  left:    { flex: 1, marginRight: 12 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name:    { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  cat:     { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  priceRow:{ flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  price:   { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  stock:   { fontSize: 12, color: COLORS.textMuted },
  right:   { alignItems: 'flex-end' },
  addBtn:  {
    backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  qtyCtrl: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg, borderRadius: RADIUS.full },
  qtyBtn:  { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 18, color: COLORS.primary, fontWeight: '700' },
  qtyVal:  { fontSize: 15, fontWeight: '800', minWidth: 24, textAlign: 'center', color: COLORS.textPrimary },
});

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.dark, paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 20, paddingBottom: 14,
  },
  backBtn:     { padding: 4 },
  backIcon:    { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff', flex: 1, textAlign: 'center' },
  cartBtn:     { padding: 4, position: 'relative' },
  cartIcon:    { fontSize: 24 },
  cartBadge:   {
    position: 'absolute', top: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.danger, alignItems: 'center', justifyContent: 'center',
  },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, margin: 14, borderRadius: RADIUS.lg,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1.5, borderColor: COLORS.border, ...SHADOW.sm,
  },
  searchIcon:  { fontSize: 16, marginRight: 8, color: COLORS.textMuted },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary },

  list: { paddingHorizontal: 14 },

  cartFab: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    backgroundColor: COLORS.primary, borderRadius: RADIUS.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, ...SHADOW.lg,
  },
  cartFabInner: {},
  cartFabText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  cartFabTotal: { color: '#A8E6DE', fontSize: 12, marginTop: 2 },
  cartFabArrow: { color: '#fff', fontSize: 20, fontWeight: '700' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet:   {
    backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl, padding: 20, maxHeight: '85%',
  },
  modalHandle:  { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle:   { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  modalClose:   { fontSize: 18, color: COLORS.textMuted },

  cartItem:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  cartItemLeft:  { flex: 1 },
  cartItemRight: { alignItems: 'flex-end', gap: 4 },
  cartItemName:  { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  cartItemUnit:  { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  cartItemTotal: { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  removeBtn:     { marginTop: 4 },
  removeBtnText: { fontSize: 11, color: COLORS.danger, fontWeight: '600' },

  totalsBox:  { backgroundColor: COLORS.bg, borderRadius: RADIUS.md, padding: 14, marginTop: 14 },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: COLORS.textSecondary },
  totalVal:   { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },

  successOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  successCard: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.xl,
    padding: 32, width: '82%', alignItems: 'center', ...SHADOW.lg,
  },
  successIcon:   { fontSize: 56, marginBottom: 12 },
  successTitle:  { fontSize: 22, fontWeight: '900', color: COLORS.textPrimary },
  successAmount: { fontSize: 36, fontWeight: '900', color: COLORS.primary, marginTop: 8 },
  successProfit: { fontSize: 16, color: COLORS.success, fontWeight: '700', marginTop: 4 },
  saleAlertBox:  { backgroundColor: '#FFF1F0', borderRadius: RADIUS.md, padding: 12, marginTop: 14, width: '100%' },
  saleAlertTitle:{ fontSize: 13, fontWeight: '700', color: COLORS.danger, marginBottom: 4 },
  saleAlertItem: { fontSize: 12, color: COLORS.danger, marginTop: 2 },

  whatsappLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: 14,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  whatsappInput: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: COLORS.textPrimary,
    width: '100%',
    marginBottom: 4,
  },
});
