/**
 * Manual mock for @workspace/api-client-react.
 * Lets tests capture what argument shapes the components pass to
 * useCreateOrder / useTrackOrder without hitting the network.
 */

export const mockMutate = jest.fn();
export const mockUseCreateOrder = jest.fn();
export const mockUseTrackOrder = jest.fn();
export const mockGetTrackOrderQueryKey = jest.fn(
  (params?: { orderNumber?: string; rationCardNumber?: string }) =>
    [`/api/orders/track`, ...(params ? [params] : [])] as const,
);

mockUseCreateOrder.mockReturnValue({
  mutate: mockMutate,
  isPending: false,
});

mockUseTrackOrder.mockReturnValue({
  data: undefined,
  isLoading: false,
  error: null,
  refetch: jest.fn(),
  queryKey: ['/api/orders/track'],
});

export const useCreateOrder = mockUseCreateOrder;
export const useTrackOrder = mockUseTrackOrder;
export const getTrackOrderQueryKey = mockGetTrackOrderQueryKey;
