import axios from "axios";
import { API_BASE } from "./api";

export interface NotificationRecipient {
  id: string;
  name: string;
  phone_number: string | null;
  telegram_chat_id: string | null;
  whatsapp_enabled: boolean;
  telegram_enabled: boolean;
  is_active: boolean;
  created_at: string;
}

export interface NotificationRecipientInput {
  name: string;
  phone_number?: string | null;
  telegram_chat_id?: string | null;
  whatsapp_enabled?: boolean;
  telegram_enabled?: boolean;
}

export type NotificationRecipientPatch = Partial<NotificationRecipientInput> & {
  is_active?: boolean;
};

export async function listRecipients(): Promise<NotificationRecipient[]> {
  const { data } = await axios.get<NotificationRecipient[]>(`${API_BASE}/notifications/recipients`);
  return data;
}

export async function createRecipient(input: NotificationRecipientInput): Promise<NotificationRecipient> {
  const { data } = await axios.post<NotificationRecipient>(`${API_BASE}/notifications/recipients`, input);
  return data;
}

export async function updateRecipient(id: string, patch: NotificationRecipientPatch): Promise<NotificationRecipient> {
  const { data } = await axios.patch<NotificationRecipient>(`${API_BASE}/notifications/recipients/${id}`, patch);
  return data;
}

export async function deleteRecipient(id: string): Promise<void> {
  await axios.delete(`${API_BASE}/notifications/recipients/${id}`);
}

export async function testRecipient(id: string): Promise<Record<string, string>> {
  const { data } = await axios.post<Record<string, string>>(`${API_BASE}/notifications/recipients/${id}/test`);
  return data;
}
