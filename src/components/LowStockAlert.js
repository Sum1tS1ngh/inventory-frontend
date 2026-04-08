import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, ScrollView, Modal, Platform,
} from 'react-native';
import { AlertsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { COLORS, RADIUS, SHADOW } from '../utils/theme';

const POLL_INTERVAL = 60_000; // poll every 60 seconds

export default function LowStockAlertBanner() {
  const { token } = useAuth();
  const [alerts, setAlerts]       = useState([]);
  const [visible, setVisible]     = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const intervalRef = useRef(null);

  const fetchAlerts = useCallback(async () => {
    if (!token) return;
    try {
      const res = await AlertsAPI.getLowStock(token);
      if (res.success && res.alerts.length > 0) {
        setAlerts(res.alerts);
        showBanner();
      } else {
        setAlerts([]);
        hideBanner();
      }
    } catch (_) {}
  }, [token]);

  const showBanner = () => {
    setVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  };

  const hideBanner = () => {
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  useEffect(() => {
    fetchAlerts();
    intervalRef.current = setInterval(fetchAlerts, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchAlerts]);

  if (!visible || alerts.length === 0) return null;

  return (
    <>
      <Animated.View
        style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
      >
        <TouchableOpacity
          style={styles.bannerInner}
          onPress={() => setModalOpen(true)}
          activeOpacity={0.9}
        >
          <Text style={styles.bannerIcon}>⚠️</Text>
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>
              {alerts.length} Product{alerts.length > 1 ? 's' : ''} Low on Stock!
            </Text>
            <Text style={styles.bannerSub} numberOfLines={1}>
              Tap to view details
            </Text>
          </View>
          <TouchableOpacity onPress={hideBanner} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>

      {/* Detail Modal */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚠️  Low Stock Alerts</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {alerts.map((a, i) => (
                <View key={i} style={styles.alertItem}>
                  <View style={styles.alertLeft}>
                    <Text style={styles.alertName}>{a.name}</Text>
                    <Text style={styles.alertSub}>{a.category || 'General'}</Text>
                  </View>
                  <View style={styles.alertRight}>
                    <Text style={styles.alertQty}>{a.quantity}</Text>
                    <Text style={styles.alertMin}>min: {a.minQuantity}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setModalOpen(false)}
            >
              <Text style={styles.modalBtnText}>Got it, I'll restock</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 10,
    left: 16,
    right: 16,
    zIndex: 999,
    borderRadius: RADIUS.lg,
    ...SHADOW.lg,
  },
  bannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7B2D00',
    borderRadius: RADIUS.lg,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  bannerIcon:     { fontSize: 22, marginRight: 10 },
  bannerTextWrap: { flex: 1 },
  bannerTitle:    { color: '#fff', fontWeight: '700', fontSize: 14 },
  bannerSub:      { color: '#FFB89A', fontSize: 12, marginTop: 2 },
  closeBtn:       { padding: 6 },
  closeBtnText:   { color: '#fff', fontSize: 14, fontWeight: '700' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  modalClose: { fontSize: 18, color: COLORS.textMuted, padding: 4 },

  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  alertLeft:  { flex: 1 },
  alertName:  { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  alertSub:   { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  alertRight: { alignItems: 'flex-end' },
  alertQty:   { fontSize: 22, fontWeight: '800', color: COLORS.danger },
  alertMin:   { fontSize: 11, color: COLORS.textMuted },

  modalBtn: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
