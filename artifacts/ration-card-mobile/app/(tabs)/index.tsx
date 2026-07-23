import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const topPad = isWeb ? 67 : insets.top;

  const handleOrder = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/order-form');
  };

  const handleTrack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/track');
  };

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
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <View style={styles.heroIconRow}>
          <View style={[styles.heroIconBg, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name="card" size={36} color="#fff" />
          </View>
        </View>
        <Text style={styles.heroTitle}>PVC Ration Card</Text>
        <Text style={styles.heroSubtitle}>
          Get your durable PVC ration card delivered home
        </Text>
      </View>

      {/* Primary CTA */}
      <View style={styles.ctaSection}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={handleOrder}
          activeOpacity={0.85}
          testID="place-order-btn"
        >
          <Ionicons name="add-circle-outline" size={22} color="#fff" />
          <Text style={styles.primaryBtnText}>Place New Order</Text>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={handleTrack}
          activeOpacity={0.8}
          testID="track-order-btn"
        >
          <Ionicons name="location-outline" size={22} color={colors.primary} />
          <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
            Track Existing Order
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* Info Cards */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
        HOW IT WORKS
      </Text>

      <View style={styles.stepsGrid}>
        {STEPS.map((step, i) => (
          <View
            key={i}
            style={[
              styles.stepCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.stepNum, { backgroundColor: colors.accent }]}>
              <Text style={[styles.stepNumText, { color: colors.primary }]}>
                {i + 1}
              </Text>
            </View>
            <Feather name={step.icon as any} size={24} color={colors.primary} style={styles.stepIcon} />
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              {step.title}
            </Text>
            <Text style={[styles.stepDesc, { color: colors.mutedForeground }]}>
              {step.desc}
            </Text>
          </View>
        ))}
      </View>

      {/* Pricing note */}
      <View style={[styles.pricingCard, { backgroundColor: colors.accent, borderColor: colors.primary + '30' }]}>
        <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
        <Text style={[styles.pricingText, { color: colors.accentForeground }]}>
          Single card: ₹70 · Family pack: ₹50/card
        </Text>
      </View>
    </ScrollView>
  );
}

const STEPS = [
  {
    icon: 'edit-3',
    title: 'Fill Details',
    desc: 'Enter your ration card and address info',
  },
  {
    icon: 'credit-card',
    title: 'Pay via UPI',
    desc: 'Scan QR and upload the payment screenshot',
  },
  {
    icon: 'truck',
    title: 'Get Delivered',
    desc: 'Track your order and receive at door',
  },
];

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  hero: {
    borderRadius: 20,
    padding: 28,
    marginBottom: 24,
    alignItems: 'center',
  },
  heroIconRow: { marginBottom: 12 },
  heroIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 22,
  },
  ctaSection: { gap: 12, marginBottom: 32 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 10,
  },
  primaryBtnText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  secondaryBtnText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  stepsGrid: { gap: 12, marginBottom: 20 },
  stepCard: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  stepNumText: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
  },
  stepIcon: { marginBottom: 8 },
  stepTitle: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
  },
  pricingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  pricingText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
});
