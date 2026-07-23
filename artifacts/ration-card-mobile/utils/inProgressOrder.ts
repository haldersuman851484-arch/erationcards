import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'in_progress_order';

export interface InProgressOrder {
  orderId: string;
  orderNumber: string;
}

export async function saveInProgressOrder(order: InProgressOrder): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(order));
  } catch {
    // non-fatal
  }
}

export async function loadInProgressOrder(): Promise<InProgressOrder | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as InProgressOrder;
  } catch {
    return null;
  }
}

export async function clearInProgressOrder(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // non-fatal
  }
}
