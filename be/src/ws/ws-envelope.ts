export type WsMessageType = 'INTENT' | 'COMMAND' | 'EVENT';

export type WsEnvelope<T = unknown> = {
  type: WsMessageType;
  code: string;
  payload?: T;
  requestId?: string;
};

export const COMMAND_CODES = {
  AUTH_OK: 'AUTH_OK',
} as const;
