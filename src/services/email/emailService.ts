export interface EmailBasePayload {
  email: string;
  customerName?: string;
  reservationId?: string;
  restaurantId?: string;
  restaurantName?: string;
  language?: 'en' | 'pt';
  date?: string;
  time?: string;
  guests?: number;
  tableNumber?: string;
  bookingNumber?: string;
  notes?: string;
  cancelUrl?: string;
}

export interface EmailServiceResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

async function postEmailEndpoint(endpoint: string, payload: Record<string, unknown>): Promise<EmailServiceResponse> {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}: Failed to send email`
      };
    }

    return {
      success: true,
      messageId: data.messageId || data.id
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Network error while sending email'
    };
  }
}

export async function sendConfirmationEmail(payload: EmailBasePayload): Promise<EmailServiceResponse> {
  return postEmailEndpoint('/api/email/confirmation', payload as unknown as Record<string, unknown>);
}

export async function sendReminderEmail(payload: EmailBasePayload): Promise<EmailServiceResponse> {
  return postEmailEndpoint('/api/email/reminder', payload as unknown as Record<string, unknown>);
}

export async function sendCancellationEmail(payload: EmailBasePayload): Promise<EmailServiceResponse> {
  return postEmailEndpoint('/api/email/cancellation', payload as unknown as Record<string, unknown>);
}

export async function sendUpdateEmail(payload: EmailBasePayload): Promise<EmailServiceResponse> {
  return postEmailEndpoint('/api/email/update', payload as unknown as Record<string, unknown>);
}

export async function sendTestEmail(payload: { email: string; restaurantName?: string; apiKey?: string; fromEmail?: string }): Promise<EmailServiceResponse> {
  return postEmailEndpoint('/api/email/test', payload as Record<string, unknown>);
}
