export interface DemoDataState {
  enabled: boolean;
  teacherCount: number;
  ratingCount: number;
  commentCount: number;
}

export interface DemoDataActionState {
  ok: boolean;
  error?: string;
}

export const EMPTY_DEMO_DATA_ACTION: DemoDataActionState = { ok: false };
