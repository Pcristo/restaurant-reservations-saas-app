export interface FunctionEnv {
  VITE_FIREBASE_PROJECT_ID?: string;
  VITE_FIREBASE_APP_ID?: string;
  VITE_FIREBASE_API_KEY?: string;
  VITE_RESEND_API_KEY?: string;
  VITE_RESEND_FROM_EMAIL?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  [key: string]: any;
}

export interface FunctionContext<TEnv = FunctionEnv> {
  request: Request;
  env: TEnv;
  params: Record<string, string>;
  data: Record<string, any>;
  waitUntil: (promise: Promise<any>) => void;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  [key: string]: any;
}
