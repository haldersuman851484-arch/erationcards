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
import { File } from 'expo-file-system';
import { fetch } from 'expo/fetch';
import * as Haptics from 'expo-haptics';

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

  const upiId = upiConfig?.merchantUpiId ?? '';
  const amountNum = Number(amount ?? 70);
  const upiLink = upiId
    ? `upi://pay?pa=${upiId}&pn=PVC+Ration+Card&am=${amountNum}&cu=INR`
    : null;

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

  const handleSubmit = async () => {
    if (!screenshotUri) {
      Alert.alert('Screenshot required', 'Please upload your UPI payment screenshot before submitting.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUploading(true);

    try {
      // Upload screenshot
      const file = new File(screenshotUri);
      const formData = new FormData();
      formData.append('screenshot', file as any);

      const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}`;
      const uploadRes = await fetch(`${baseUrl}/api/payments/upload-screenshot`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      const { url: screenshotUrl } = (await uploadRes.json()) as { url: string };
      setUploading(false);
      setSubmitting(true);

      // Patch order with screenshot URL
      const patchRes = await fetch(`${baseUrl}/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentScreenshotUrl: screenshotUrl }),
      });

      if (!patchRes.ok) {
        throw new Error('Could not save payment info');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: '/success',
        params: { orderNumber: orderNumber ?? '' },
      });
    } catch (err) {
      setUploading(false);
      setSubmitting(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Submission Failed', 'Could not submit your payment. Please try again.');
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
          onPress: () => {
            router.replace({
              pathname: '/success',
              params: { orderNumber: orderNumber ?? '' },
            });
          },
        },
      ]
    );
  };

  const isLoading = uploading || submitting;

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
    marginBottom: 20,
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
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  submitBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: '#fff',
  },
  skipBtn: { alignItems: 'center', paddingVertical: 10, marginBottom: 4 },
  skipBtnText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
