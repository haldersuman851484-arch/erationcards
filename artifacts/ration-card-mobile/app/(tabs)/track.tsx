import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrackOrder, getTrackOrderQueryKey } from '@workspace/api-client-react';
import type { Order } from '@workspace/api-client-react';
import * as Haptics from 'expo-haptics';
import {
  loadInProgressOrder,
  clearInProgressOrder,
  type InProgressOrder,
} from '@/utils/inProgressOrder';
import { router } from 'expo-router';

const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  pending:    { label: 'Pending',    icon: 'time-outline',         color: '#f59e0b' },
  processing: { label: 'Processing', icon: 'construct-outline',    color: '#3b82f6' },
  printed:    { label: 'Printed',    icon: 'print-outline',        color: '#8b5cf6' },
  dispatched: { label: 'Dispatched', icon: 'paper-plane-outline',  color: '#06b6d4' },
  delivered:  { label: 'Delivered',  icon: 'checkmark-circle',     color: '#10b981' },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pending',   color: '#f59e0b' },
  confirmed: { label: 'Confirmed', color: '#10b981' },
  rejected:  { label: 'Rejected',  color: '#ef4444' },
};

export default function TrackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? 67 : insets.top;

  const [searchText, setSearchText] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [inProgress, setInProgress] = useState<InProgressOrder | null>(null);

  useEffect(() => {
    loadInProgressOrder().then(setInProgress);
  }, []);

  // Only query when user has submitted
  const trackParams = { orderNumber: submitted || undefined };
  const { data: order, isLoading, error, refetch } = useTrackOrder(
    trackParams,
    {
      query: {
        queryKey: getTrackOrderQueryKey(trackParams),
        enabled: !!submitted,
        retry: false,
      },
    }
  );

  const handleSearch = () => {
    const val = searchText.trim();
    if (!val) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSubmitted(val);
  };

  const handleClear = () => {
    setSearchText('');
    setSubmitted('');
  };

  const status = order ? STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending : null;
  const payStatus = order ? PAYMENT_STATUS_CONFIG[order.paymentStatus] : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPad + 16,
          paddingBottom: isWeb ? 34 + 84 : insets.bottom + 100,
        },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Track Order
        </Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          Enter your order number or ration card number
        </Text>
      </View>

      {/* Search bar */}
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Ionicons name="search-outline" size={20} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
          placeholder="Order # or Ration Card #"
          placeholderTextColor={colors.mutedForeground}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="characters"
          testID="track-search-input"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.searchBtn,
          { backgroundColor: searchText.trim() ? colors.primary : colors.muted },
        ]}
        onPress={handleSearch}
        disabled={!searchText.trim()}
        activeOpacity={0.85}
        testID="track-search-btn"
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={[styles.searchBtnText, { color: searchText.trim() ? '#fff' : colors.mutedForeground }]}>
            Track
          </Text>
        )}
      </TouchableOpacity>

      {/* In-progress order banner (shown after app restart mid-flow) */}
      {inProgress && (
        <View
          style={[styles.inProgressBanner, { backgroundColor: '#eff6ff', borderColor: '#93c5fd' }]}
          testID="in-progress-banner"
        >
          <Ionicons name="time-outline" size={20} color="#2563eb" />
          <View style={{ flex: 1 }}>
            <Text style={styles.inProgressTitle}>Unfinished order found</Text>
            <Text style={styles.inProgressSub}>
              Order <Text style={{ fontFamily: 'Inter_600SemiBold' }}>{inProgress.orderNumber}</Text> is waiting for payment.
            </Text>
          </View>
          <View style={styles.inProgressActions}>
            <TouchableOpacity
              style={[styles.inProgressResumeBtn, { backgroundColor: '#2563eb' }]}
              onPress={() => {
                router.push({
                  pathname: '/payment',
                  params: {
                    orderId: inProgress.orderId,
                    orderNumber: inProgress.orderNumber,
                    amount: '70',
                  },
                });
              }}
              testID="resume-payment-btn"
            >
              <Text style={styles.inProgressResumeBtnText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                clearInProgressOrder();
                setInProgress(null);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="dismiss-in-progress-btn"
            >
              <Ionicons name="close-circle" size={18} color="#93c5fd" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Error state */}
      {error && submitted && (
        <View style={[styles.errorCard, { backgroundColor: '#fff5f5', borderColor: '#fecaca' }]}>
          <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
          <Text style={styles.errorText}>
            {(error as any)?.response?.status === 404
              ? 'No order found. Check your order number or ration card number.'
              : 'Something went wrong. Please try again.'}
          </Text>
        </View>
      )}

      {/* Order result */}
      {order && (
        <View style={styles.resultSection}>
          {/* Status badge */}
          <View
            style={[
              styles.statusBanner,
              { backgroundColor: (status?.color ?? '#6b7280') + '18', borderColor: status?.color ?? '#6b7280' },
            ]}
          >
            <Ionicons
              name={status?.icon as any ?? 'time-outline'}
              size={24}
              color={status?.color ?? '#6b7280'}
            />
            <View style={styles.statusBannerText}>
              <Text style={[styles.statusBannerLabel, { color: colors.mutedForeground }]}>
                Order Status
              </Text>
              <Text style={[styles.statusBannerValue, { color: status?.color ?? '#6b7280' }]}>
                {status?.label ?? order.status}
              </Text>
            </View>
          </View>

          {/* Order details card */}
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Row label="Order Number" value={order.orderNumber} colors={colors} mono />
            <Row label="Customer" value={order.customerName} colors={colors} />
            <Row label="Card Type" value={order.cardType} colors={colors} />
            <Row label="Quantity" value={`${order.quantity} card${order.quantity > 1 ? 's' : ''}`} colors={colors} />
            <Row
              label="Amount"
              value={`₹${order.amount}`}
              colors={colors}
              highlight
            />
            <Row
              label="Payment"
              value={payStatus?.label ?? order.paymentStatus}
              colors={colors}
              valueColor={payStatus?.color}
            />
            {order.trackingNumber && (
              <Row label="Tracking #" value={order.trackingNumber} colors={colors} mono />
            )}
            {order.courierName && (
              <Row label="Courier" value={order.courierName} colors={colors} />
            )}
            <Row
              label="Placed On"
              value={new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              colors={colors}
              last
            />
          </View>

          {/* Delivery address */}
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.detailSectionTitle, { color: colors.mutedForeground }]}>
              DELIVERY ADDRESS
            </Text>
            <Text style={[styles.addressText, { color: colors.foreground }]}>
              {order.address}
            </Text>
            {order.postOffice && (
              <Text style={[styles.addressText, { color: colors.mutedForeground }]}>
                {order.postOffice}
              </Text>
            )}
            <Text style={[styles.addressText, { color: colors.mutedForeground }]}>
              {order.district}, {order.state} — {order.pincode}
            </Text>
          </View>
        </View>
      )}

      {/* Empty state (no search yet) */}
      {!submitted && (
        <View style={styles.emptyState}>
          <Feather name="package" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
            Enter your order details above
          </Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Use the order number from your confirmation, or your ration card number
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function Row({
  label,
  value,
  colors,
  mono = false,
  highlight = false,
  valueColor,
  last = false,
}: {
  label: string;
  value: string;
  colors: any;
  mono?: boolean;
  highlight?: boolean;
  valueColor?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text
        style={[
          styles.rowValue,
          { color: valueColor ?? (highlight ? colors.primary : colors.foreground) },
          mono && styles.rowValueMono,
          highlight && styles.rowValueBold,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  searchBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  searchBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: '#ef4444',
    lineHeight: 20,
  },
  resultSection: { gap: 12 },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusBannerText: { gap: 2 },
  statusBannerLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  statusBannerValue: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  detailCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  detailSectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  rowValue: { fontSize: 14, fontFamily: 'Inter_500Medium', maxWidth: '55%', textAlign: 'right' },
  rowValueMono: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  rowValueBold: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  addressText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 16,
    paddingBottom: 10,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 48,
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 19,
  },
  inProgressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  inProgressTitle: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: '#1d4ed8',
    marginBottom: 2,
  },
  inProgressSub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: '#3b82f6',
    lineHeight: 17,
  },
  inProgressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inProgressResumeBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  inProgressResumeBtnText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
});
