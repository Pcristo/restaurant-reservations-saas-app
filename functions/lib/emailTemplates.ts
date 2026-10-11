export interface EmailOptions {
  email: string;
  name: string;
  date: string;
  time: string;
  guests: number;
  restaurantName?: string;
  resendApiKey?: string;
  language?: string;
  logoUrl?: string;
  restaurantEmail?: string;
  resendFromEmail?: string;
  restaurantPhone?: string;
  bookingNumber?: string;
  restaurantAddress?: string;
  restaurantWebsite?: string;
  timezone?: string;
  table?: string;
  reservationId?: string;
  cancelUrl?: string;
  modifyUrl?: string;
  viewUrl?: string;
}

// Generates Schema.org JSON-LD for FoodEstablishmentReservation
export function generateSchemaMarkup(opts: EmailOptions, status: 'ReservationConfirmed' | 'ReservationCancelled') {
  const displayName = (opts.restaurantName || '').trim() || 'DineMaster Pro';
  let startTime = `${opts.date}T${opts.time || '12:00'}:00`;
  try {
    const d = new Date(`${opts.date}T${opts.time || '12:00'}:00`);
    if (!isNaN(d.getTime())) {
      startTime = d.toISOString();
    }
  } catch (e) {
    // fallback
  }

  const schema = {
    "@context": "http://schema.org",
    "@type": "FoodEstablishmentReservation",
    "reservationNumber": opts.bookingNumber || opts.reservationId || "N/A",
    "reservationStatus": `http://schema.org/${status}`,
    "underName": {
      "@type": "Person",
      "name": opts.name
    },
    "reservationFor": {
      "@type": "FoodEstablishment",
      "name": displayName,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": (opts.restaurantAddress || '').trim() || "123 Example Street, Dublin, D01 XXXX, Ireland"
      },
      "telephone": (opts.restaurantPhone || '').trim() || "+353 1 555 0100"
    },
    "startTime": startTime,
    "partySize": opts.guests
  };

  if (opts.viewUrl) {
    (schema as any).modifyReservationUrl = opts.viewUrl;
  }

  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

export function getFromEmail(rawFromEmail?: string, restaurantName?: string): string {
  let from = (rawFromEmail || '').trim();
  const name = (restaurantName || '').trim() || 'DineMaster Bistro';
  const cleanName = name.replace(/[<>"']/g, '').trim();

  // If someone passed an API key or invalid value as from email, default to verified domain
  if (!from || from.startsWith('re_') || !from.includes('@')) {
    from = 'reservations@wordwide.pro';
  }

  // Extract pure email inside <brackets> if present (e.g. "Some Name <res@domain.com>" -> "res@domain.com")
  const bracketMatch = from.match(/<([^>]+)>/);
  const pureEmail = bracketMatch ? bracketMatch[1].trim() : from.trim();

  return `${cleanName} <${pureEmail}>`;
}

export function getBaseHtml(opts: EmailOptions, title: string, content: string, status: 'ReservationConfirmed' | 'ReservationCancelled'): string {
  const displayName = (opts.restaurantName || '').trim() || 'DineMaster Bistro';
  const initialLetter = displayName.charAt(0).toUpperCase() || 'D';

  let cleanLogoUrl = (opts.logoUrl || '').trim();
  if (cleanLogoUrl.startsWith('//')) {
    cleanLogoUrl = 'https:' + cleanLogoUrl;
  }
  // Sanitize blocked domains like Vecteezy that return 403 Forbidden to email clients
  if (cleanLogoUrl.includes('vecteezy.com')) {
    cleanLogoUrl = '';
  }
  const hasValidLogo = !!cleanLogoUrl && (
    cleanLogoUrl.startsWith('http://') || 
    cleanLogoUrl.startsWith('https://') || 
    cleanLogoUrl.startsWith('data:image/')
  );

  const logoHtml = hasValidLogo
    ? `<div style="text-align: center; margin-bottom: 24px;">
         <img src="${cleanLogoUrl}" alt="${displayName}" border="0" style="max-height: 80px; max-width: 240px; height: auto; width: auto; object-fit: contain; display: inline-block; vertical-align: middle; border-radius: 8px;" />
         <div style="font-size: 22px; font-weight: 700; color: #111827; margin-top: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.3px;">
           ${displayName}
         </div>
       </div>`
    : `<div style="text-align: center; margin-bottom: 24px;">
         <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
           <tr>
             <td style="vertical-align: middle; padding-right: 12px;">
               <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #d97706, #b45309); border-radius: 12px; text-align: center; line-height: 48px; color: #ffffff; font-size: 22px; font-weight: bold; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; box-shadow: 0 2px 6px rgba(217, 119, 6, 0.25);">
                 ${initialLetter}
               </div>
             </td>
             <td style="vertical-align: middle;">
               <span style="font-size: 22px; font-weight: 700; color: #111827; letter-spacing: -0.4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                 ${displayName}
               </span>
             </td>
           </tr>
         </table>
       </div>`;

  const contactEmail = (opts.restaurantEmail || '').trim();
  const contactPhone = (opts.restaurantPhone || '').trim();
  const contactWebsite = (opts.restaurantWebsite || '').trim();
  const contactAddress = (opts.restaurantAddress || '').trim();
  const isPt = opts.language === 'pt';

  let footerContactHtml = '';
  if (contactEmail || contactPhone || contactWebsite || contactAddress) {
    footerContactHtml += `<div style="text-align: center; font-size: 13px; color: #4b5563; line-height: 1.6; margin-bottom: 20px; padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #f3f4f6;">`;
    footerContactHtml += `<strong style="font-size: 14px; color: #111827; display: block; margin-bottom: 6px;">${displayName}</strong>`;
    if (contactAddress) footerContactHtml += `<div style="color: #4b5563; margin-bottom: 4px;">📍 ${contactAddress}</div>`;
    if (contactPhone) footerContactHtml += `<div style="color: #4b5563; margin-bottom: 4px;">📞 ${isPt ? 'Telefone' : 'Phone'}: <a href="tel:${contactPhone.replace(/\s+/g, '')}" style="color: #d97706; text-decoration: none; font-weight: 500;">${contactPhone}</a></div>`;
    if (contactEmail) footerContactHtml += `<div style="color: #4b5563; margin-bottom: 4px;">✉️ Email: <a href="mailto:${contactEmail}" style="color: #d97706; text-decoration: none; font-weight: 500;">${contactEmail}</a></div>`;
    if (contactWebsite) footerContactHtml += `<div style="margin-top: 4px;">🌐 <a href="${contactWebsite.startsWith('http') ? contactWebsite : 'https://' + contactWebsite}" style="color: #d97706; text-decoration: none; font-weight: 500;">${contactWebsite.replace(/^https?:\/\//, '')}</a></div>`;
    footerContactHtml += `</div>`;
  } else {
    footerContactHtml += `<div style="text-align: center; font-size: 13px; color: #4b5563; line-height: 1.6; margin-bottom: 20px;">
      <strong style="font-size: 14px; color: #111827;">${displayName}</strong><br>
    </div>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  ${generateSchemaMarkup(opts, status)}
</head>
<body style="margin: 0; padding: 20px; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    ${logoHtml}
    <h1 style="color: #d97706; text-align: center; margin-top: 0; font-size: 24px; font-weight: bold;">${title}</h1>
    ${content}
    <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
    
    ${footerContactHtml}

    <p style="font-size: 12px; color: #6b7280; text-align: center; line-height: 1.6; margin: 0 0 12px 0;">
      <strong>${isPt ? 'Por favor, não responda diretamente a este email.' : 'Please do not reply directly to this email.'}</strong><br>
      ${isPt ? `Para qualquer alteração ou questão, contacte o ${displayName}${contactPhone ? ` através do ${contactPhone}` : ''}.` : `For any changes or questions, contact ${displayName}${contactPhone ? ` at ${contactPhone}` : ''}.`}
    </p>
    <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">
      ${isPt ? `Email oficial de reservas do ${displayName}.` : `Official reservation email from ${displayName}.`}
    </p>
  </div>
</body>
</html>`;
}

// Confirmation Email Generator
export function buildConfirmationEmail(opts: EmailOptions): { subject: string; html: string } {
  const isPt = opts.language === 'pt';
  const displayName = (opts.restaurantName || '').trim() || 'DineMaster Pro';
  const title = isPt ? 'Reserva Confirmada' : 'Reservation Confirmed';

  let buttonsHtml = '';
  if (opts.viewUrl) {
    buttonsHtml += `<a href="${opts.viewUrl}" style="display: inline-block; padding: 12px 24px; margin: 6px; background-color: #d97706; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">${isPt ? 'Ver Reserva' : 'View Reservation'}</a>`;
  }

  const content = `
    <p style="font-size: 15px; color: #374151; line-height: 1.6;">${isPt ? 'Olá' : 'Hi'} <strong>${opts.name}</strong>,</p>
    <p style="font-size: 15px; color: #374151; line-height: 1.6;">${isPt ? 'A sua mesa em' : 'Your table at'} <strong>${displayName}</strong> ${isPt ? 'foi reservada com sucesso.' : 'has been successfully booked.'}</p>
    
    <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0;">
      <p style="margin: 6px 0; font-size: 14px; color: #1f2937;"><strong>${isPt ? 'Data' : 'Date'}:</strong> ${opts.date}</p>
      <p style="margin: 6px 0; font-size: 14px; color: #1f2937;"><strong>${isPt ? 'Hora' : 'Time'}:</strong> ${opts.time}</p>
      <p style="margin: 6px 0; font-size: 14px; color: #1f2937;"><strong>${isPt ? 'Pessoas' : 'Guests'}:</strong> ${opts.guests} ${opts.guests === 1 ? (isPt ? 'Pessoa' : 'Guest') : (isPt ? 'Pessoas' : 'Guests')}</p>
      ${opts.table ? `<p style="margin: 6px 0; font-size: 14px; color: #1f2937;"><strong>${isPt ? 'Mesa' : 'Table'}:</strong> ${opts.table}</p>` : ''}
      ${opts.bookingNumber ? `<p style="margin: 6px 0; font-size: 14px; color: #1f2937;"><strong>${isPt ? 'Nº de Reserva' : 'Booking Ref'}:</strong> <span style="font-family: monospace; font-weight: bold; color: #d97706;">#${opts.bookingNumber}</span></p>` : ''}
    </div>
    
    ${buttonsHtml ? `<div style="text-align: center; margin: 24px 0;">${buttonsHtml}</div>` : ''}
    <p style="font-size: 15px; color: #374151; line-height: 1.6; text-align: center; margin-top: 20px;">${isPt ? `Aguardamos com entusiasmo a sua visita ao ${displayName}!` : `We look forward to seeing you at ${displayName}!`}</p>
  `;

  return {
    subject: `${title} - ${displayName}`,
    html: getBaseHtml(opts, title, content, 'ReservationConfirmed')
  };
}

// Reminder Email Generator
export function buildReminderEmail(opts: EmailOptions): { subject: string; html: string } {
  const isPt = opts.language === 'pt';
  const displayName = (opts.restaurantName || '').trim() || 'DineMaster Pro';
  
  let isToday = false;
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    isToday = opts.date === todayStr;
  } catch (e) {
    // fallback
  }

  const title = isPt
    ? (isToday ? 'A sua reserva é hoje' : 'Lembrete da sua reserva para amanhã')
    : (isToday ? 'Your reservation is today' : 'Reminder: Your reservation is tomorrow');

  const dayWord = isPt
    ? (isToday ? 'hoje' : 'amanhã')
    : (isToday ? 'today' : 'tomorrow');

  let buttonsHtml = '';
  if (opts.viewUrl) {
    buttonsHtml += `<a href="${opts.viewUrl}" style="display: inline-block; padding: 12px 24px; margin: 6px; background-color: #d97706; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">${isPt ? 'Ver Reserva' : 'View Reservation'}</a>`;
  }
  if (opts.cancelUrl) {
    buttonsHtml += `<a href="${opts.cancelUrl}" style="display: inline-block; padding: 12px 24px; margin: 6px; background-color: #ef4444; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">${isPt ? 'Cancelar' : 'Cancel Reservation'}</a>`;
  }

  const content = `
    <p style="font-size: 15px; color: #374151; line-height: 1.6;">${isPt ? 'Olá' : 'Hi'} <strong>${opts.name}</strong>,</p>
    <p style="font-size: 15px; color: #374151; line-height: 1.6;">${isPt ? `Este é um lembrete da sua reserva em <strong>${displayName}</strong> para <strong>${dayWord}</strong>.` : `This is a reminder that you have a reservation at <strong>${displayName}</strong> scheduled for <strong>${dayWord}</strong>.`}</p>
    
    <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0;">
      <p style="margin: 6px 0; font-size: 14px; color: #1f2937;"><strong>${isPt ? 'Data' : 'Date'}:</strong> ${opts.date}</p>
      <p style="margin: 6px 0; font-size: 14px; color: #1f2937;"><strong>${isPt ? 'Hora' : 'Time'}:</strong> ${opts.time}</p>
      <p style="margin: 6px 0; font-size: 14px; color: #1f2937;"><strong>${isPt ? 'Pessoas' : 'Guests'}:</strong> ${opts.guests} ${opts.guests === 1 ? (isPt ? 'Pessoa' : 'Guest') : (isPt ? 'Pessoas' : 'Guests')}</p>
      ${opts.bookingNumber ? `<p style="margin: 6px 0; font-size: 14px; color: #1f2937;"><strong>${isPt ? 'Nº de Reserva' : 'Booking Ref'}:</strong> <span style="font-family: monospace; font-weight: bold; color: #d97706;">#${opts.bookingNumber}</span></p>` : ''}
    </div>
    
    ${buttonsHtml ? `<div style="text-align: center; margin: 24px 0;">${buttonsHtml}</div>` : ''}
    <p style="font-size: 15px; color: #374151; line-height: 1.6; text-align: center; margin-top: 20px;">${isPt ? `Aguardamos com entusiasmo a sua visita ao ${displayName}!` : `We look forward to seeing you at ${displayName}!`}</p>
  `;

  return {
    subject: `${title} - ${displayName}`,
    html: getBaseHtml(opts, title, content, 'ReservationConfirmed')
  };
}

// Cancellation Email Generator
export function buildCancellationEmail(opts: EmailOptions): { subject: string; html: string } {
  const isPt = opts.language === 'pt';
  const displayName = (opts.restaurantName || '').trim() || 'DineMaster Pro';
  const title = isPt ? 'Reserva Cancelada' : 'Reservation Cancelled';

  const content = `
    <p style="font-size: 15px; color: #374151; line-height: 1.6;">${isPt ? 'Olá' : 'Hi'} <strong>${opts.name}</strong>,</p>
    <p style="font-size: 15px; color: #374151; line-height: 1.6;">${isPt ? `A sua reserva em <strong>${displayName}</strong> foi cancelada conforme solicitado.` : `Your reservation at <strong>${displayName}</strong> has been cancelled as requested.`}</p>
    
    <div style="background-color: #fef2f2; border: 1px solid #fee2e2; padding: 20px; border-radius: 10px; margin: 20px 0;">
      <p style="margin: 6px 0; font-size: 14px; color: #991b1b;"><strong>${isPt ? 'Data' : 'Date'}:</strong> ${opts.date}</p>
      <p style="margin: 6px 0; font-size: 14px; color: #991b1b;"><strong>${isPt ? 'Hora' : 'Time'}:</strong> ${opts.time}</p>
      <p style="margin: 6px 0; font-size: 14px; color: #991b1b;"><strong>${isPt ? 'Pessoas' : 'Guests'}:</strong> ${opts.guests}</p>
      ${opts.bookingNumber ? `<p style="margin: 6px 0; font-size: 14px; color: #991b1b;"><strong>${isPt ? 'Nº de Reserva' : 'Booking Ref'}:</strong> #${opts.bookingNumber}</p>` : ''}
    </div>
    
    <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">${isPt ? 'Esperamos ter a oportunidade de o receber numa próxima ocasião.' : 'We hope to have the opportunity to welcome you on another occasion.'}</p>
  `;

  return {
    subject: `${title} - ${displayName}`,
    html: getBaseHtml(opts, title, content, 'ReservationCancelled')
  };
}

// Update Email Generator
export function buildUpdateEmail(opts: EmailOptions): { subject: string; html: string } {
  const isPt = opts.language === 'pt';
  const displayName = (opts.restaurantName || '').trim() || 'DineMaster Pro';
  const title = isPt ? 'Reserva Atualizada' : 'Reservation Updated';

  let buttonsHtml = '';
  if (opts.viewUrl) {
    buttonsHtml += `<a href="${opts.viewUrl}" style="display: inline-block; padding: 12px 24px; margin: 6px; background-color: #d97706; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">${isPt ? 'Ver Reserva' : 'View Reservation'}</a>`;
  }

  const content = `
    <p style="font-size: 15px; color: #374151; line-height: 1.6;">${isPt ? 'Olá' : 'Hi'} <strong>${opts.name}</strong>,</p>
    <p style="font-size: 15px; color: #374151; line-height: 1.6;">${isPt ? `A sua reserva em <strong>${displayName}</strong> foi atualizada com sucesso com os seguintes detalhes:` : `Your reservation at <strong>${displayName}</strong> has been updated with the following details:`}</p>
    
    <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 20px; border-radius: 10px; margin: 20px 0;">
      <p style="margin: 6px 0; font-size: 14px; color: #1f2937;"><strong>${isPt ? 'Data' : 'Date'}:</strong> ${opts.date}</p>
      <p style="margin: 6px 0; font-size: 14px; color: #1f2937;"><strong>${isPt ? 'Hora' : 'Time'}:</strong> ${opts.time}</p>
      <p style="margin: 6px 0; font-size: 14px; color: #1f2937;"><strong>${isPt ? 'Pessoas' : 'Guests'}:</strong> ${opts.guests} ${opts.guests === 1 ? (isPt ? 'Pessoa' : 'Guest') : (isPt ? 'Pessoas' : 'Guests')}</p>
      ${opts.bookingNumber ? `<p style="margin: 6px 0; font-size: 14px; color: #1f2937;"><strong>${isPt ? 'Nº de Reserva' : 'Booking Ref'}:</strong> <span style="font-family: monospace; font-weight: bold; color: #d97706;">#${opts.bookingNumber}</span></p>` : ''}
    </div>
    
    ${buttonsHtml ? `<div style="text-align: center; margin: 24px 0;">${buttonsHtml}</div>` : ''}
    <p style="font-size: 15px; color: #374151; line-height: 1.6; text-align: center; margin-top: 20px;">${isPt ? `Aguardamos com entusiasmo a sua visita ao ${displayName}!` : `We look forward to seeing you at ${displayName}!`}</p>
  `;

  return {
    subject: `${title} - ${displayName}`,
    html: getBaseHtml(opts, title, content, 'ReservationConfirmed')
  };
}

// Test Email Generator
export function buildTestEmail(opts: {
  email: string;
  restaurantName?: string;
  logoUrl?: string;
  restaurantEmail?: string;
  restaurantPhone?: string;
  restaurantAddress?: string;
  restaurantWebsite?: string;
  timezone?: string;
  language?: string;
}): { subject: string; html: string } {
  const isPt = opts.language === 'pt';
  const displayName = (opts.restaurantName || '').trim() || 'DineMaster Bistro';
  const title = isPt ? 'Email de Teste' : 'Test Email';

  const content = `
    <p style="font-size: 15px; color: #374151; line-height: 1.6;">${isPt ? 'Olá!' : 'Hello!'}</p>
    <p style="font-size: 15px; color: #374151; line-height: 1.6;">${isPt ? `Este é um email de teste enviado pelo sistema de reservas do <strong>${displayName}</strong>.` : `This is a test email sent from the <strong>${displayName}</strong> reservation management system.`}</p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 18px; border-radius: 8px; margin: 20px 0; color: #166534;">
      <strong style="font-size: 15px;">✓ ${isPt ? 'Configuração de Email Validada com Sucesso!' : 'Email Configuration Successfully Validated!'}</strong>
      <p style="margin: 6px 0 0 0; font-size: 13px; line-height: 1.5; color: #15803d;">
        ${isPt ? `O seu serviço de envio de emails está 100% operacional e personalizado com o logótipo, nome e informações de contacto do <strong>${displayName}</strong>.` : `Your email delivery service is 100% operational and personalized with the logo, name, and contact details of <strong>${displayName}</strong>.`}
      </p>
    </div>

    <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 16px; border-radius: 8px; margin: 16px 0; font-size: 13px; color: #78350f;">
      <strong style="display: block; margin-bottom: 8px; font-size: 14px;">${isPt ? 'Identidade e Informações do Restaurante:' : 'Restaurant Identity & Info:'}</strong>
      <div style="margin-bottom: 4px;">• <strong>${isPt ? 'Nome do Restaurante' : 'Restaurant Name'}:</strong> ${displayName}</div>
      ${opts.logoUrl ? `<div style="margin-bottom: 4px;">• <strong>${isPt ? 'Logótipo' : 'Logo'}:</strong> ${isPt ? 'Configurado e exibido no topo do email' : 'Configured and displayed in email header'}</div>` : `<div style="margin-bottom: 4px;">• <strong>${isPt ? 'Logótipo' : 'Logo'}:</strong> ${isPt ? 'Monograma tipográfico elegante' : 'Clean typographic monogram'}</div>`}
      ${opts.restaurantPhone ? `<div style="margin-bottom: 4px;">• <strong>${isPt ? 'Telefone' : 'Phone'}:</strong> ${opts.restaurantPhone}</div>` : ''}
      ${opts.restaurantEmail ? `<div style="margin-bottom: 4px;">• <strong>${isPt ? 'Email' : 'Email'}:</strong> ${opts.restaurantEmail}</div>` : ''}
      ${opts.restaurantAddress ? `<div style="margin-bottom: 4px;">• <strong>${isPt ? 'Morada' : 'Address'}:</strong> ${opts.restaurantAddress}</div>` : ''}
      ${opts.restaurantWebsite ? `<div style="margin-bottom: 4px;">• <strong>${isPt ? 'Website' : 'Website'}:</strong> ${opts.restaurantWebsite}</div>` : ''}
    </div>
  `;

  return {
    subject: `${title} - ${displayName}`,
    html: getBaseHtml({
      email: opts.email,
      name: 'Admin',
      date: new Date().toISOString().split('T')[0],
      time: '12:00',
      guests: 2,
      restaurantName: displayName,
      logoUrl: opts.logoUrl,
      restaurantEmail: opts.restaurantEmail,
      restaurantPhone: opts.restaurantPhone,
      restaurantAddress: opts.restaurantAddress,
      restaurantWebsite: opts.restaurantWebsite,
      timezone: opts.timezone,
      language: opts.language,
    } as any, title, content, 'ReservationConfirmed')
  };
}
