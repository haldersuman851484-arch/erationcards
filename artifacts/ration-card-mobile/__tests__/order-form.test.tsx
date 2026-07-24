/**
 * Tests that order-form.tsx passes the correct argument shape to
 * useCreateOrder / mutate when a valid form is submitted.
 *
 * If someone regenerates the API client and the required variable shape
 * changes (e.g. `data` wrapper removed, field renamed), TypeScript will
 * catch it at compile time AND this test will fail at runtime.
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// --- module mocks (declared before any imports that use them) ---
jest.mock('@workspace/api-client-react');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'Medium' },
  NotificationFeedbackType: { Error: 'Error', Success: 'Success' },
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/hooks/useColors', () => ({
  useColors: () => ({
    background: '#fff',
    foreground: '#000',
    primary: '#000',
    muted: '#ccc',
    mutedForeground: '#999',
    card: '#f5f5f5',
    border: '#ddd',
    accent: '#f0f0f0',
    accentForeground: '#333',
    destructive: '#ef4444',
  }),
}));
jest.mock('@/utils/inProgressOrder', () => ({
  saveInProgressOrder: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

import { mockMutate, mockUseCreateOrder } from '@workspace/api-client-react';
import OrderFormScreen from '../app/order-form';

// Required fields for a valid submission
const VALID_FORM = {
  name: 'Ravi Kumar',
  phone: '9876543210',
  rationCard: 'AP12345678',
  address: '12 Main Street, Gandhi Nagar',
  state: 'Andhra Pradesh',
  district: 'Guntur',
  pincode: '522001',
};

function fillAndSubmit(getByTestId: ReturnType<typeof render>['getByTestId']) {
  fireEvent.changeText(getByTestId('field-name'), VALID_FORM.name);
  fireEvent.changeText(getByTestId('field-phone'), VALID_FORM.phone);
  fireEvent.changeText(getByTestId('field-ration-card'), VALID_FORM.rationCard);
  fireEvent.changeText(getByTestId('field-address'), VALID_FORM.address);
  fireEvent.changeText(getByTestId('field-state'), VALID_FORM.state);
  fireEvent.changeText(getByTestId('field-district'), VALID_FORM.district);
  fireEvent.changeText(getByTestId('field-pincode'), VALID_FORM.pincode);
  fireEvent.press(getByTestId('submit-order-btn'));
}

describe('order-form.tsx — createOrder argument shape', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock to capture the mutate fn
    mockUseCreateOrder.mockReturnValue({ mutate: mockMutate, isPending: false });
  });

  it('calls mutate with a { data: OrderInput } wrapper', () => {
    const { getByTestId } = render(<OrderFormScreen />);
    fillAndSubmit(getByTestId);

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const [variables] = mockMutate.mock.calls[0];
    // The generated hook expects variables shaped as { data: BodyType<OrderInput> }
    expect(variables).toHaveProperty('data');
  });

  it('passes all required OrderInput fields inside data', () => {
    const { getByTestId } = render(<OrderFormScreen />);
    fillAndSubmit(getByTestId);

    const [variables] = mockMutate.mock.calls[0];
    const data = variables.data as Record<string, unknown>;

    // Required fields that must be present for a valid order
    expect(data).toMatchObject({
      customerName: VALID_FORM.name,
      customerPhone: VALID_FORM.phone,
      rationCardNumber: VALID_FORM.rationCard,
      address: VALID_FORM.address,
      state: VALID_FORM.state,
      district: VALID_FORM.district,
      pincode: VALID_FORM.pincode,
      cardType: expect.any(String),
      quantity: expect.any(Number),
      amount: expect.any(Number),
      paymentMethod: expect.any(String),
    });
  });

  it('does NOT pass extra top-level keys alongside data', () => {
    const { getByTestId } = render(<OrderFormScreen />);
    fillAndSubmit(getByTestId);

    const [variables] = mockMutate.mock.calls[0];
    // Only `data` key is expected at the top level (generated hook shape)
    expect(Object.keys(variables)).toEqual(['data']);
  });

  it('does not call mutate when required fields are missing', () => {
    const { getByTestId } = render(<OrderFormScreen />);
    // Press submit without filling any field
    fireEvent.press(getByTestId('submit-order-btn'));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('does not call mutate when phone number is invalid', () => {
    const { getByTestId } = render(<OrderFormScreen />);
    fireEvent.changeText(getByTestId('field-name'), VALID_FORM.name);
    fireEvent.changeText(getByTestId('field-phone'), '12345'); // too short
    fireEvent.changeText(getByTestId('field-ration-card'), VALID_FORM.rationCard);
    fireEvent.changeText(getByTestId('field-address'), VALID_FORM.address);
    fireEvent.changeText(getByTestId('field-state'), VALID_FORM.state);
    fireEvent.changeText(getByTestId('field-district'), VALID_FORM.district);
    fireEvent.changeText(getByTestId('field-pincode'), VALID_FORM.pincode);
    fireEvent.press(getByTestId('submit-order-btn'));
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
