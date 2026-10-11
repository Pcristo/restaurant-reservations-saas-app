// Edge-compatible Firebase Auth and Firestore REST API helpers

import firebaseConfig from '../../firebase-applet-config.json';

export function parseFirestoreFields(fields: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.integerValue !== undefined) result[key] = parseInt(val.integerValue, 10);
    else if (val.doubleValue !== undefined) result[key] = parseFloat(val.doubleValue);
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
    else if (val.mapValue?.fields !== undefined) result[key] = parseFirestoreFields(val.mapValue.fields);
    else if (val.nullValue !== undefined) result[key] = null;
    else if (val.arrayValue?.values !== undefined) {
      result[key] = val.arrayValue.values.map((v: any) => {
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
        if (v.mapValue?.fields !== undefined) return parseFirestoreFields(v.mapValue.fields);
        return v;
      });
    } else result[key] = val;
  }
  return result;
}

export async function getFirestoreSettings(env: Record<string, any> = {}, restaurantId?: string): Promise<Record<string, any>> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const docIds = restaurantId && restaurantId !== 'main' ? [restaurantId, 'main'] : ['main'];
  const dbIds = [databaseId, '(default)'];

  let result: Record<string, any> = {};

  // 1. Try settings collection documents
  for (const docId of docIds) {
    for (const dbId of dbIds) {
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/settings/${docId}?key=${apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const doc = await res.json();
          if (doc.fields) {
            const parsed = parseFirestoreFields(doc.fields);
            result = { ...parsed, ...result };
            if (result.name || result.restaurantName) {
              break;
            }
          }
        }
      } catch (e) {
        // try next
      }
    }
    if (result.name || result.restaurantName) break;
  }

  // 2. Try restaurants collection documents for tenant branding and contact info
  for (const docId of docIds) {
    for (const dbId of dbIds) {
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/restaurants/${docId}?key=${apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const doc = await res.json();
          if (doc.fields) {
            const parsed = parseFirestoreFields(doc.fields);
            if (!result.name && parsed.name) result.name = parsed.name;
            if (!result.restaurantName && parsed.name) result.restaurantName = parsed.name;
            if (!result.logoUrl && parsed.logoUrl) result.logoUrl = parsed.logoUrl;
            if (!result.logoUrl && parsed.cloudinaryLogoUrl) result.logoUrl = parsed.cloudinaryLogoUrl;
            if (!result.logoUrl && parsed.branding?.logoUrl) result.logoUrl = parsed.branding.logoUrl;
            if (!result.email && parsed.email) result.email = parsed.email;
            if (!result.phone && parsed.phone) result.phone = parsed.phone;
            if (!result.address && parsed.address) result.address = parsed.address;
            if (!result.city && parsed.city) result.city = parsed.city;
            if (!result.websiteUrl && (parsed.website || parsed.websiteUrl)) result.websiteUrl = parsed.website || parsed.websiteUrl;
            if (!result.timezone && parsed.timezone) result.timezone = parsed.timezone;
            break;
          }
        }
      } catch (e) {
        // try next
      }
    }
  }

  // Handle settings branding.logoUrl if set
  if (!result.logoUrl && result.branding?.logoUrl) {
    result.logoUrl = result.branding.logoUrl;
  }
  if (!result.logoUrl && result.cloudinaryLogoUrl) {
    result.logoUrl = result.cloudinaryLogoUrl;
  }
  // Sanitize blocked or 403-inducing domains
  if (result.logoUrl && result.logoUrl.includes('vecteezy.com')) {
    result.logoUrl = '';
  }

  return result;
}

export async function getPlatformSettings(env: Record<string, any> = {}): Promise<Record<string, any>> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const docIds = ['general', 'main'];
  const dbIds = [databaseId, '(default)'];
  for (const docId of docIds) {
    for (const dbId of dbIds) {
      try {
        const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/platform_settings/${docId}?key=${apiKey}`;
        const res = await fetch(url);
        if (res.ok) {
          const doc = await res.json();
          if (doc.fields) {
            return parseFirestoreFields(doc.fields);
          }
        }
      } catch (e) {
        // try next
      }
    }
  }
  return {};
}

export async function getMarketingWebsiteSettingsRest(env: Record<string, any> = {}): Promise<Record<string, any>> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const dbIds = [databaseId, '(default)'];
  for (const dbId of dbIds) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents/settings/marketing_website?key=${apiKey}`;
      const res = await fetch(url);
      if (res.ok) {
        const doc = await res.json();
        if (doc.fields) {
          return parseFirestoreFields(doc.fields);
        }
      }
    } catch (e) {
      // try next
    }
  }
  return {};
}

export async function verifyAuthToken(idToken: string, env: Record<string, any> = {}): Promise<{ success: boolean; uid?: string; email?: string; error?: string }> {
  if (!idToken) {
    return { success: false, error: 'No authorization token provided' };
  }
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.users || data.users.length === 0) {
      return { success: false, error: data?.error?.message || 'Invalid or expired auth token' };
    }
    const user = data.users[0];
    return { success: true, uid: user.localId, email: user.email };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Authentication failed' };
  }
}

export function encodeFirestoreFields(data: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    if (v === null) {
      fields[k] = { nullValue: null };
    } else if (typeof v === 'string') {
      fields[k] = { stringValue: v };
    } else if (typeof v === 'boolean') {
      fields[k] = { booleanValue: v };
    } else if (typeof v === 'number') {
      if (Number.isInteger(v)) {
        fields[k] = { integerValue: String(v) };
      } else {
        fields[k] = { doubleValue: v };
      }
    } else if (Array.isArray(v)) {
      fields[k] = {
        arrayValue: {
          values: v.map((item) => {
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') return Number.isInteger(item) ? { integerValue: String(item) } : { doubleValue: item };
            if (typeof item === 'boolean') return { booleanValue: item };
            if (typeof item === 'object' && item !== null) return { mapValue: { fields: encodeFirestoreFields(item) } };
            return { stringValue: String(item) };
          })
        }
      };
    } else if (typeof v === 'object') {
      fields[k] = { mapValue: { fields: encodeFirestoreFields(v) } };
    }
  }
  return fields;
}

export async function saveFirestoreDocRest(
  collectionName: string, 
  docId: string, 
  data: Record<string, any>, 
  env: Record<string, any> = {},
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const fields = encodeFirestoreFields(data);
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collectionName}/${docId}?key=${apiKey}`;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    const res = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData?.error?.message || `Failed to save document: status ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save document' };
  }
}

export async function createUserInAuth(
  email: string,
  password?: string,
  displayName?: string,
  env: Record<string, any> = {}
): Promise<{ success: boolean; uid?: string; user?: any; error?: string }> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  if (!apiKey) {
    return { success: false, error: 'Firebase API key is not configured.' };
  }

  try {
    const body: Record<string, any> = {
      email,
      returnSecureToken: true
    };
    if (password) body.password = password;
    if (displayName) body.displayName = displayName;

    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data?.error?.message === 'EMAIL_EXISTS') {
        const lookup = await lookupUserByEmail(email, env);
        if (lookup.success && lookup.user) {
          if (password) {
            await updateUserPasswordInAuth(lookup.user.localId, password, env);
          }
          return { success: true, uid: lookup.user.localId, user: lookup.user };
        }
      }
      return { success: false, error: data?.error?.message || `Failed to create auth user: ${res.status}` };
    }

    return { success: true, uid: data.localId, user: data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error creating user in Firebase Auth' };
  }
}


export async function deleteUserFromAuth(uid: string, env: Record<string, any> = {}): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  if (!apiKey) {
    return { success: false, error: 'Firebase API key is not configured.' };
  }

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId: uid })
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      // If user not found, treat as already deleted
      if (data?.error?.message === 'USER_NOT_FOUND') {
        return { success: true };
      }
      return { success: false, error: data?.error?.message || `Failed with status ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error communicating with Firebase Auth' };
  }
}

export async function lookupUserByEmail(email: string, env: Record<string, any> = {}): Promise<{ success: boolean; user?: any; error?: string }> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  if (!apiKey) {
    return { success: false, error: 'Firebase API key is not configured.' };
  }

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: [email] })
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (data?.error?.message === 'EMAIL_NOT_FOUND') {
        return { success: true, user: null };
      }
      return { success: false, error: data?.error?.message || `Failed with status ${res.status}` };
    }

    const user = data.users && data.users.length > 0 ? data.users[0] : null;
    return { success: true, user };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error communicating with Firebase Auth' };
  }
}

export async function updateUserInAuth(
  uid: string, 
  updates: { email?: string; password?: string; displayName?: string }, 
  env: Record<string, any> = {}
): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  if (!apiKey) {
    return { success: false, error: 'Firebase API key is not configured.' };
  }

  try {
    const body: Record<string, any> = { localId: uid };
    if (updates.email) body.email = updates.email;
    if (updates.password) body.password = updates.password;
    if (updates.displayName) body.displayName = updates.displayName;

    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.error?.message || `Failed with status ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error communicating with Firebase Auth' };
  }
}

export async function updateUserPasswordInAuth(uid: string, newPassword: string, env: Record<string, any> = {}): Promise<{ success: boolean; error?: string }> {
  return updateUserInAuth(uid, { password: newPassword }, env);
}

export async function deleteFirestoreDocRest(
  collectionName: string, 
  docId: string, 
  env: Record<string, any> = {},
  idToken?: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/${collectionName}/${docId}?key=${apiKey}`;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    const res = await fetch(url, {
      method: 'DELETE',
      headers
    });
    if (!res.ok && res.status !== 404) {
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData?.error?.message || `Failed to delete document: status ${res.status}` };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete document' };
  }
}

export async function deleteMatchingDocsRest(
  collectionName: string,
  fieldName: string,
  fieldValue: string,
  env: Record<string, any> = {},
  idToken?: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const apiKey = env.VITE_FIREBASE_API_KEY || env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const projectId = env.VITE_FIREBASE_PROJECT_ID || env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const databaseId = env.VITE_FIREBASE_DATABASE_ID || env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;

  const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents:runQuery?key=${apiKey}`;

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }

    const queryRes = await fetch(queryUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collectionName }],
          where: {
            fieldFilter: {
              field: { fieldPath: fieldName },
              op: 'EQUAL',
              value: { stringValue: fieldValue }
            }
          }
        }
      })
    });

    if (!queryRes.ok) {
      return { success: false, count: 0 };
    }

    const results = await queryRes.json().catch(() => []);
    let deletedCount = 0;

    if (Array.isArray(results)) {
      for (const item of results) {
        if (item.document?.name) {
          const docPath = item.document.name;
          const deleteUrl = `https://firestore.googleapis.com/v1/${docPath}?key=${apiKey}`;
          await fetch(deleteUrl, { method: 'DELETE', headers }).catch(() => {});
          deletedCount++;
        }
      }
    }

    return { success: true, count: deletedCount };
  } catch (err: any) {
    return { success: false, count: 0, error: err?.message };
  }
}

