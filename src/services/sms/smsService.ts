export interface SmsPayload {
  to: string;
  message?: string;
  code?: string;
  restaurantId?: string;
  restaurantName?: string;
}

export interface SmsServiceResponse {
  success: boolean;
  sid?: string;
  simulated?: boolean;
  error?: string;
}

export async function sendSms(payload: SmsPayload): Promise<SmsServiceResponse> {
  try {
    const response = await fetch('/api/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: Failed to send SMS`
      };
    }

    return {
      success: true,
      sid: data.sid,
      simulated: Boolean(data.simulated)
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Network error while sending SMS'
    };
  }
}
