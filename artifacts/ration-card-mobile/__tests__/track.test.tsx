/**
 * Tests that track.tsx passes the correct argument shape to
 * useTrackOrder when the user searches for an order.
 *
 * If someone regenerates the API client and the param shape changes
 * (e.g. `orderNumber` renamed to `order_number`), TypeScript will catch
 * it at compile time AND this test will fail at runtime.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// --- module mocks ---
jest.mock('@workspace/api-client-react');
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'Light' },
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
  loadInProgressOrder: jest.fn().mockResolvedValue(null),
  clearInProgressOrder: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  Feather: 'Feather',
}));

import {
  mockUseTrackOrder,
  mockGetTrackOrderQueryKey,
} from '@workspace/api-client-react';
import TrackScreen from '../app/(tabs)/track';

// Suppress the act() warning that fires when loadInProgressOrder resolves
// after the test's synchronous render completes. The warning is cosmetic —
// it does not affect test correctness — and is caused by RNTL 12 / React 19
// handling of async effects in tests, not by the code under test.
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((msg: string, ...args) => {
    if (typeof msg === 'string' && msg.includes('not wrapped in act')) return;
    // eslint-disable-next-line no-console
    console.warn(msg, ...args);
  });
});

afterAll(() => {
  (console.error as jest.Mock).mockRestore();
});

describe('track.tsx — useTrackOrder argument shape', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTrackOrder.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
      queryKey: ['/api/orders/track'],
    });
  });

  it('calls useTrackOrder on every render with params as first argument', () => {
    render(<TrackScreen />);
    expect(mockUseTrackOrder).toHaveBeenCalled();

    const [params] = mockUseTrackOrder.mock.calls[0];
    // Before any search, orderNumber should be undefined (not omitted entirely)
    expect(params).toHaveProperty('orderNumber');
  });

  it('passes { orderNumber: string } when the user searches', () => {
    const { getByTestId } = render(<TrackScreen />);

    fireEvent.changeText(getByTestId('track-search-input'), 'ORD-2024-001');
    fireEvent.press(getByTestId('track-search-btn'));

    // After pressing Track, the hook is re-called with the submitted value
    const calls = mockUseTrackOrder.mock.calls;
    const lastParams = calls[calls.length - 1][0] as Record<string, unknown>;
    expect(lastParams.orderNumber).toBe('ORD-2024-001');
  });

  it('passes options as the second argument with a query sub-object', () => {
    render(<TrackScreen />);

    const [, options] = mockUseTrackOrder.mock.calls[0];
    // The hook must receive the second argument as { query: { ... } }
    expect(options).toHaveProperty('query');
  });

  it('sets enabled: false when no search has been submitted yet', () => {
    render(<TrackScreen />);

    const [, options] = mockUseTrackOrder.mock.calls[0];
    expect(options.query.enabled).toBe(false);
  });

  it('passes queryKey via getTrackOrderQueryKey', () => {
    render(<TrackScreen />);

    // The component should use getTrackOrderQueryKey to build the queryKey
    expect(mockGetTrackOrderQueryKey).toHaveBeenCalled();
    const [, options] = mockUseTrackOrder.mock.calls[0];
    expect(options.query).toHaveProperty('queryKey');
  });

  it('sets enabled: true after the user submits a search', () => {
    const { getByTestId } = render(<TrackScreen />);

    fireEvent.changeText(getByTestId('track-search-input'), 'RC-9876543210');
    fireEvent.press(getByTestId('track-search-btn'));

    const calls = mockUseTrackOrder.mock.calls;
    const lastOptions = calls[calls.length - 1][1] as {
      query: { enabled: boolean };
    };
    expect(lastOptions.query.enabled).toBe(true);
  });
});
