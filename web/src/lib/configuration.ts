/**
 * Minimal engine configuration accessor — the slice of the console's
 * WorkersTab/api the chat backend needs (approval-gate defaults). Talks to the
 * engine `configuration::get` / `configuration::set` bus functions.
 */

import { getIiiClient } from "@/lib/iii-client";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

interface GetResponse {
  id: string;
  value: JsonValue;
}

export interface SetResponse {
  new_value: JsonValue;
  old_value: JsonValue | null;
}

export interface GetOptions {
  raw?: boolean;
}

export async function getConfiguration(
  id: string,
  options: GetOptions = {},
): Promise<JsonValue> {
  const client = await getIiiClient();
  const response = await client.trigger<GetResponse>("configuration::get", {
    id,
    raw: options.raw ?? true,
  });
  return response.value;
}

export interface SetConfigurationPayload {
  id: string;
  value: JsonValue;
}

export async function setConfiguration(
  payload: SetConfigurationPayload,
): Promise<SetResponse> {
  const client = await getIiiClient();
  return client.trigger<SetResponse>(
    "configuration::set",
    payload as unknown as Record<string, unknown>,
  );
}
