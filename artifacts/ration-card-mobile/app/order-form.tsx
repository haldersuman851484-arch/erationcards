import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateOrder } from '@workspace/api-client-react';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

const CARD_TYPES = [
  { value: 'PHH',  label: 'PHH',  desc: 'Priority Household' },
  { value: 'NPHH', label: 'NPHH', desc: 'Non-Priority HH' },
  { value: 'AAY',  label: 'AAY',  desc: 'Antyodaya' },
  { value: 'APL',  label: 'APL',  desc: 'Above Poverty Line' },
  { value: 'BPL',  label: 'BPL',  desc: 'Below Poverty Line' },
];

type Field =
  | 'customerName'
  | 'customerPhone'
  | 'customerEmail'
  | 'rationCardNumber'
  | 'deliveryName'
  | 'address'
  | 'postOffice'
  | 'state'
  | 'district'
  | 'pincode';

interface FormState {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  rationCardNumber: string;
  deliveryName: string;
  address: string;
  postOffice: string;
  state: string;
  district: string;
  pincode: string;
  cardType: string;
}

const INITIAL: FormState = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  rationCardNumber: '',
  deliveryName: '',
  address: '',
  postOffice: '',
  state: '',
  district: '',
  pincode: '',
  cardType: 'PHH',
};

export default function OrderFormScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  const { mutate: createOrder, isPending } = useCreateOrder();

  const set = (field: Field) => (val: string) =>
    setForm((f) => ({ ...f, [field]: val }));

  const validate = (): boolean => {
    const e: Partial<Record<Field, string>> = {};
    if (!form.customerName.trim()) e.customerName = 'Required';
    if (!form.customerPhone.trim() || !/^\d{10}$/.test(form.customerPhone.trim()))
      e.customerPhone = '10-digit mobile number';
    if (!form.rationCardNumber.trim()) e.rationCardNumber = 'Required';
    if (!form.address.trim()) e.address = 'Required';
    if (!form.state.trim()) e.state = 'Required';
    if (!form.district.trim()) e.district = 'Required';
    if (
      !form.pincode.trim() ||
      !/^\d{6}$/.test(form.pincode.trim())
    )
      e.pincode = '6-digit pincode';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    createOrder(
      {
        customerName: form.customerName.trim(),
        customerPhone: form.customerPhone.trim(),
        customerEmail: form.customerEmail.trim() || undefined,
        rationCardNumber: form.rationCardNumber.trim(),
        deliveryName: form.deliveryName.trim() || undefined,
        address: form.address.trim(),
        postOffice: form.postOffice.trim() || undefined,
        state: form.state.trim(),
        district: form.district.trim(),
        pincode: form.pincode.trim(),
        cardType: form.cardType,
        quantity: 1,
        amount: 70,
        paymentMethod: 'upi',
      },
      {
        onSuccess: (order) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.push({
            pathname: '/payment',
            params: {
              orderId: String(order.id),
              orderNumber: order.orderNumber,
              amount: String(order.amount),
            },
          });
        },
        onError: (err) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(
            'Order Failed',
            'Could not place your order. Please check your details and try again.'
          );
        },
      }
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: isWeb ? 34 : insets.bottom + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Section: Personal Info */}
      <SectionHeader title="Personal Information" colors={colors} />

      <FieldInput
        label="Full Name"
        required
        value={form.customerName}
        onChangeText={set('customerName')}
        error={errors.customerName}
        placeholder="As on ration card"
        colors={colors}
        testID="field-name"
      />
      <FieldInput
        label="Mobile Number"
        required
        value={form.customerPhone}
        onChangeText={set('customerPhone')}
        error={errors.customerPhone}
        placeholder="10-digit number"
        keyboardType="number-pad"
        maxLength={10}
        colors={colors}
        testID="field-phone"
      />
      <FieldInput
        label="Email (optional)"
        value={form.customerEmail}
        onChangeText={set('customerEmail')}
        placeholder="For order updates"
        keyboardType="email-address"
        autoCapitalize="none"
        colors={colors}
        testID="field-email"
      />
      <FieldInput
        label="Ration Card Number"
        required
        value={form.rationCardNumber}
        onChangeText={set('rationCardNumber')}
        error={errors.rationCardNumber}
        placeholder="Your existing ration card number"
        autoCapitalize="characters"
        colors={colors}
        testID="field-ration-card"
      />

      {/* Section: Card Type */}
      <SectionHeader title="Card Category" colors={colors} />

      <View style={styles.cardTypeGrid}>
        {CARD_TYPES.map((ct) => (
          <TouchableOpacity
            key={ct.value}
            style={[
              styles.cardTypeBtn,
              {
                borderColor:
                  form.cardType === ct.value ? colors.primary : colors.border,
                backgroundColor:
                  form.cardType === ct.value ? colors.accent : colors.card,
              },
            ]}
            onPress={() => {
              setForm((f) => ({ ...f, cardType: ct.value }));
              Haptics.selectionAsync();
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.cardTypeBtnLabel,
                {
                  color:
                    form.cardType === ct.value
                      ? colors.primary
                      : colors.foreground,
                },
              ]}
            >
              {ct.label}
            </Text>
            <Text
              style={[styles.cardTypeBtnDesc, { color: colors.mutedForeground }]}
            >
              {ct.desc}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Section: Address */}
      <SectionHeader title="Delivery Address" colors={colors} />

      <FieldInput
        label="Delivery Name (optional)"
        value={form.deliveryName}
        onChangeText={set('deliveryName')}
        placeholder="If different from above"
        colors={colors}
        testID="field-delivery-name"
      />
      <FieldInput
        label="Street / House Address"
        required
        value={form.address}
        onChangeText={set('address')}
        error={errors.address}
        placeholder="House no., street, locality"
        multiline
        colors={colors}
        testID="field-address"
      />
      <FieldInput
        label="Post Office (optional)"
        value={form.postOffice}
        onChangeText={set('postOffice')}
        placeholder="Nearest post office"
        colors={colors}
        testID="field-post-office"
      />
      <View style={styles.row}>
        <View style={styles.half}>
          <FieldInput
            label="State"
            required
            value={form.state}
            onChangeText={set('state')}
            error={errors.state}
            placeholder="State"
            colors={colors}
            testID="field-state"
          />
        </View>
        <View style={styles.half}>
          <FieldInput
            label="District"
            required
            value={form.district}
            onChangeText={set('district')}
            error={errors.district}
            placeholder="District"
            colors={colors}
            testID="field-district"
          />
        </View>
      </View>
      <FieldInput
        label="Pincode"
        required
        value={form.pincode}
        onChangeText={set('pincode')}
        error={errors.pincode}
        placeholder="6-digit pincode"
        keyboardType="number-pad"
        maxLength={6}
        colors={colors}
        testID="field-pincode"
      />

      {/* Pricing note */}
      <View style={[styles.priceNote, { backgroundColor: colors.accent, borderColor: colors.border }]}>
        <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
        <Text style={[styles.priceNoteText, { color: colors.accentForeground }]}>
          Amount: ₹70 for a single card · ₹50/card for family packs
        </Text>
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[
          styles.submitBtn,
          { backgroundColor: isPending ? colors.muted : colors.primary },
        ]}
        onPress={handleSubmit}
        disabled={isPending}
        activeOpacity={0.85}
        testID="submit-order-btn"
      >
        {isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.submitBtnText}>Continue to Payment</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function SectionHeader({ title, colors }: { title: string; colors: any }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
      {title.toUpperCase()}
    </Text>
  );
}

function FieldInput({
  label,
  required,
  value,
  onChangeText,
  error,
  placeholder,
  keyboardType,
  autoCapitalize,
  maxLength,
  multiline,
  colors,
  testID,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChangeText: (val: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  maxLength?: number;
  multiline?: boolean;
  colors: any;
  testID?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
        {label}
        {required && <Text style={{ color: colors.destructive }}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.fieldInput,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.destructive : colors.border,
            color: colors.foreground,
          },
          multiline && styles.fieldInputMulti,
        ]}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
        maxLength={maxLength}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        testID={testID}
      />
      {error && (
        <Text style={[styles.errorText, { color: colors.destructive }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  sectionHeader: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.1,
    marginTop: 24,
    marginBottom: 12,
  },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 14, fontFamily: 'Inter_500Medium', marginBottom: 6 },
  fieldInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  fieldInputMulti: { height: 80, textAlignVertical: 'top' },
  errorText: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  cardTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  cardTypeBtn: {
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 90,
    alignItems: 'center',
  },
  cardTypeBtnLabel: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  cardTypeBtnDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  priceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 20,
  },
  priceNoteText: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
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
});
