import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useGetUpiConfig } from '@workspace/api-client-react';
import * as ImagePicker from 'expo-image-picker';
import { fetch } from 'expo/fetch';
import * as Haptics from 'expo-haptics';
import { clearInProgressOrder } from '@/utils/inProgressOrder';

const BASE_URL = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;

/** Upload with one automatic retry on failure. Returns the uploaded URL. */
async function uploadScreenshotWithRetry(uri: string): Promise<string> {
  const attempt = async (): Promise<string> => {
    const formData = new FormData();
    // React Native FormData accepts { uri, name, type } as a file part
    formData.append('screenshot', {
      uri,
      name: 'screenshot.jpg',
      type: 'image/jpeg',
    } as any);

    const res = await fetch(`${BASE_URL}/api/payments/upload-screenshot`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Upload failed');
    const { url } = (await res.json()) as { url: string };
    return url;
  };

  try {
    return await attempt();
  } catch {
    // One automatic retry
    return await attempt();
  }
}

export default function PaymentScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const { orderId, orderNumber, amount } = useLocalSearchParams<{
    orderId: string;
    orderNumber: string;
    amount: string;
  }>();

  const { data: upiConfig } = useGetUpiConfig();

  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Shown when upload succeeded but patch failed so the customer can still track
  const [patchFailed, setPatchFailed] = useState(false);

  const upiId = upiConfig?.merchantUpiId ?? '';
  const amountNum = Number(amount ?? 70);

  const pickScreenshot = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to upload the payment screenshot.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setScreenshotUri(result.assets[0].uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const navigateToSuccess = async () => {
    await clearInProgressOrder();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace({
      pathname: '/success',
      params: { orderNumber: orderNumber ?? '' },
    });
  };

  const handleSubmit = async () => {
    if (!screenshotUri) {
      Alert.alert('Screenshot required', 'Please upload your UPI payment screenshot before submitting.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUploading(true);
    setPatchFailed(false);

    let screenshotUrl: string;
    try {
      // Upload with one automatic retry
      screenshotUrl = await uploadScreenshotWithRetry(screenshotUri);
    } catch {
      setUploading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        'Upload Failed',
        'Could not upload your screenshot after two attempts. Please check your connection and try again.'
      );
      return;
    }

    setUploading(false);
    setSubmitting(true);

    try {
      // Patch order with screenshot URL
      const patchRes = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentScreenshotUrl: screenshotUrl }),
      });

      if (!patchRes.ok) {
        throw new Error('Patch failed');
      }

      setSubmitting(false);
      await navigateToSuccess();
    } catch {
      // Upload succeeded but patch failed — order still exists; show order number
      setSubmitting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setPatchFailed(true);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip payment screenshot?',
      'You can submit the order now and add the screenshot later by tracking your order. Admins will verify payment before processing.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          onPress: navigateToSuccess,
        },
      ]
    );
  };

  const isLoading = uploading || submitting;

  // ── Patch-failed recovery banner ─────────────────────────────────────────
  if (patchFailed) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: isWeb ? 34 : insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.recoveryCard,
            { backgroundColor: '#fffbeb', borderColor: '#fcd34d' },
          ]}
          testID="patch-failed-banner"
        >
          <Ionicons name="warning-outline" size={36} color="#d97706" style={{ marginBottom: 8 }} />
          <Text style={[styles.recoveryTitle, { color: '#92400e' }]}>
            Screenshot uploaded — save your order number
          </Text>
          <Text style={[styles.recoveryBody, { color: '#78350f' }]}>
            Your payment screenshot was uploaded successfully, but we could not
            update your order record right now. Use the order number below to
            track your order or contact support.
          </Text>
          <View style={[styles.recoveryOrderBox, { backgroundColor: '#fef3c7', borderColor: '#fcd34d' }]}>
            <Text style={[styles.recoveryOrderLabel, { color: '#92400e' }]}>
              Your Order Number
            </Text>
            <Text style={[styles.recoveryOrderNumber, { color: '#d97706' }]} selectable>
              {orderNumber}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.recoveryBtn, { backgroundColor: '#d97706' }]}
            onPress={navigateToSuccess}
            testID="recovery-continue-btn"
          >
            <Text style={styles.recoveryBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: isWeb ? 34 : insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Order summary */}
      <View style={[styles.summaryCard, { backgroundColor: colors.accent, borderColor: colors.primary + '40' }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.accentForeground }]}>
            Order
          </Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {orderNumber}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.accentForeground }]}>
            Amount to Pay
          </Text>
          <Text style={[styles.amountValue, { color: colors.primary }]}>
            ₹{amountNum}
          </Text>
        </View>
      </View>

      {/* UPI ID section */}
      {upiId ? (
        <View style={[styles.upiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.upiHeader}>
            <Ionicons name="qr-code-outline" size={22} color={colors.primary} />
            <Text style={[styles.upiTitle, { color: colors.foreground }]}>
              Pay via UPI
            </Text>
          </View>
          <Text style={[styles.upiIdLabel, { color: colors.mutedForeground }]}>
            UPI ID
          </Text>
          <View style={[styles.upiIdBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.upiIdText, { color: colors.foreground }]} selectable>
              {upiId}
            </Text>
          </View>
          <Text style={[styles.upiInstruction, { color: colors.mutedForeground }]}>
            Open any UPI app, send ₹{amountNum} to the ID above, then upload your payment screenshot below.
          </Text>
        </View>
      ) : (
        <View style={[styles.upiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.upiInstruction, { color: colors.mutedForeground, marginTop: 8 }]}>
            Loading payment details...
          </Text>
        </View>
      )}

      {/* Screenshot upload */}
      <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
        UPLOAD PAYMENT SCREENSHOT
      </Text>

      <TouchableOpacity
        style={[
          styles.uploadArea,
          {
            backgroundColor: colors.card,
            borderColor: screenshotUri ? colors.primary : colors.border,
            borderStyle: screenshotUri ? 'solid' : 'dashed',
          },
        ]}
        onPress={pickScreenshot}
        activeOpacity={0.8}
        testID="upload-screenshot-btn"
      >
        {screenshotUri ? (
          <View style={styles.previewWrapper}>
            <Image
              source={{ uri: screenshotUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
            <View style={[styles.previewOverlay, { backgroundColor: colors.primary + '22' }]}>
              <Ionicons name="checkmark-circle" size={32} color={colors.primary} />
              <Text style={[styles.previewChangeText, { color: colors.primary }]}>
                Tap to change
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.uploadPlaceholder}>
            <View style={[styles.uploadIconBg, { backgroundColor: colors.accent }]}>
              <Feather name="upload" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.uploadTitle, { color: colors.foreground }]}>
              Select from Gallery
            </Text>
            <Text style={[styles.uploadSub, { color: colors.mutedForeground }]}>
              JPG, PNG or WebP · Max 5 MB
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Upload progress label */}
      {uploading && (
        <Text style={[styles.uploadingHint, { color: colors.mutedForeground }]}>
          Uploading screenshot…
        </Text>
      )}
      {submitting && (
        <Text style={[styles.uploadingHint, { color: colors.mutedForeground }]}>
          Saving payment info…
        </Text>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          { backgroundColor: isLoading ? colors.muted : colors.primary },
        ]}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.85}
        testID="submit-payment-btn"
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.submitBtnText}>
              {screenshotUri ? 'Submit Payment' : 'Submit Order'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Skip */}
      <TouchableOpacity
        style={styles.skipBtn}
        onPress={handleSkip}
        disabled={isLoading}
      >
        <Text style={[styles.skipBtnText, { color: colors.mutedForeground }]}>
          Skip for now
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  summaryCard: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    marginBottom: 20,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  summaryValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  amountValue: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  upiCard: {
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    marginBottom: 24,
    gap: 8,
  },
  upiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  upiTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  upiIdLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', letterSpacing: 0.5 },
  upiIdBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  upiIdText: { fontSize: 16, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.5 },
  upiInstruction: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    lineHeight: 19,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.1,
    marginBottom: 12,
  },
  uploadArea: {
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
    marginBottom: 8,
    minHeight: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    gap: 10,
    padding: 32,
  },
  uploadIconBg: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  uploadSub: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  previewWrapper: { width: '100%', height: 220 },
  previewImage: { width: '100%', height: '100%' },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  previewChangeText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  uploadingHint: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: 8,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
    marginTop: 12,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  skipBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 4 },
  skipBtnText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  // Recovery (patch-failed) styles
  recoveryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  recoveryTitle: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  recoveryBody: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    lineHeight: 21,
    textAlign: 'center',
  },
  recoveryOrderBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    gap: 4,
    marginTop: 4,
  },
  recoveryOrderLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    letterSpacing: 0.5,
  },
  recoveryOrderNumber: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  recoveryBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 4,
  },
  recoveryBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
});
