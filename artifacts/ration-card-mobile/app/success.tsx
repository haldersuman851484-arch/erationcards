import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function SuccessScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();

  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 6,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleTrack = () => {
    router.replace('/(tabs)/track');
  };

  const handleNewOrder = () => {
    router.replace('/(tabs)/');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: isWeb ? 67 : insets.top,
          paddingBottom: isWeb ? 34 : insets.bottom,
        },
      ]}
    >
      <Animated.View style={[styles.inner, { opacity, transform: [{ scale }] }]}>
        {/* Success icon */}
        <View style={[styles.iconCircle, { backgroundColor: '#10b981' + '18' }]}>
          <Ionicons name="checkmark-circle" size={72} color="#10b981" />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          Order Placed!
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Your PVC ration card order has been received successfully.
        </Text>

        {/* Order number */}
        {orderNumber ? (
          <View style={[styles.orderBox, { backgroundColor: colors.accent, borderColor: colors.primary + '40' }]}>
            <Text style={[styles.orderLabel, { color: colors.mutedForeground }]}>
              Order Number
            </Text>
            <Text style={[styles.orderNumber, { color: colors.primary }]}>
              {orderNumber}
            </Text>
            <Text style={[styles.orderNote, { color: colors.mutedForeground }]}>
              Save this to track your order
            </Text>
          </View>
        ) : null}

        {/* Next steps */}
        <View style={styles.nextSteps}>
          <NextStep
            icon="time-outline"
            text="Admin will verify your payment within 24 hours"
            colors={colors}
          />
          <NextStep
            icon="print-outline"
            text="Your card will be printed and dispatched"
            colors={colors}
          />
          <NextStep
            icon="home-outline"
            text="Delivered to your address in 5–10 working days"
            colors={colors}
          />
        </View>
      </Animated.View>

      {/* Bottom actions */}
      <View
        style={[
          styles.actions,
          { paddingBottom: isWeb ? 16 : insets.bottom + 8 },
        ]}
      >
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={handleTrack}
          activeOpacity={0.85}
          testID="go-to-track-btn"
        >
          <Ionicons name="location-outline" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>Track My Order</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ghostBtn, { borderColor: colors.border }]}
          onPress={handleNewOrder}
          activeOpacity={0.8}
          testID="new-order-btn"
        >
          <Text style={[styles.ghostBtnText, { color: colors.foreground }]}>
            Back to Home
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NextStep({ icon, text, colors }: { icon: string; text: string; colors: any }) {
  return (
    <View style={styles.nextStep}>
      <View style={[styles.nextStepIcon, { backgroundColor: colors.accent }]}>
        <Ionicons name={icon as any} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.nextStepText, { color: colors.foreground }]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 16,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  orderBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    gap: 4,
  },
  orderLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
  orderNumber: { fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  orderNote: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  nextSteps: { width: '100%', gap: 10, marginTop: 4 },
  nextStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  nextStepIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 20,
    paddingTop: 6,
  },
  actions: { paddingHorizontal: 20, gap: 12, paddingTop: 8 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  primaryBtnText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', color: '#fff' },
  ghostBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  ghostBtnText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});
