import { supabase } from './supabaseClient';

const ENTITY_TABLES = {
  Document: 'documents',
  Subscription: 'subscriptions',
  Voucher: 'vouchers',
  Warranty: 'warranties',
  Category: 'categories',
  FamilyProfile: 'family_profiles',
  RenewalHistory: 'renewal_history',
  StreakRecord: 'streak_records',
  StreakAdjustment: 'streak_adjustments',
  PushBroadcast: 'push_broadcasts',
  ChangelogEntry: 'changelog_entries',
  User: 'profiles',
};

const META_COLUMNS = new Set(['id', 'created_by_id', 'created_date', 'updated_date']);

function parseSort(sortField) {
  if (!sortField) return { column: 'created_date', ascending: false };
  const desc = sortField.startsWith('-');
  const column = desc ? sortField.slice(1) : sortField;
  const mapped = column === 'date' ? 'date' : column;
  return { column: mapped, ascending: !desc };
}

function stripMeta(row) {
  if (!row) return row;
  const { created_by_id, ...rest } = row;
  return rest;
}

async function getUserId() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');
  return user.id;
}

function createEntityApi(tableName, { isProfileTable = false } = {}) {
  return {
    async list(sortField, limit) {
      const { column, ascending } = parseSort(sortField);
      let query = supabase.from(tableName).select('*').order(column, { ascending });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((row) => (isProfileTable ? row : stripMeta(row)));
    },

    async filter(criteria) {
      let query = supabase.from(tableName).select('*');
      for (const [key, value] of Object.entries(criteria || {})) {
        query = query.eq(key, value);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(stripMeta);
    },

    async get(id) {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return stripMeta(data);
    },

    async create(payload) {
      if (isProfileTable) {
        const { data, error } = await supabase.from(tableName).insert(payload).select('*').single();
        if (error) throw error;
        return data;
      }
      const userId = await getUserId();
      const row = {
        ...payload,
        created_by_id: userId,
        updated_date: new Date().toISOString(),
      };
      const { data, error } = await supabase.from(tableName).insert(row).select('*').single();
      if (error) throw error;
      return stripMeta(data);
    },

    async update(id, payload) {
      const row = { ...payload, updated_date: new Date().toISOString() };
      delete row.id;
      delete row.created_by_id;
      delete row.created_date;
      const { data, error } = await supabase.from(tableName).update(row).eq('id', id).select('*').single();
      if (error) throw error;
      return stripMeta(data);
    },

    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
    },

    async bulkCreate(items) {
      if (!items?.length) return [];
      const userId = await getUserId();
      const rows = items.map((item) => {
        const { id, created_by_id, created_date, updated_date, ...rest } = item;
        return {
          ...rest,
          ...(id ? { id } : {}),
          created_by_id: userId,
          updated_date: new Date().toISOString(),
        };
      });
      const { data, error } = await supabase.from(tableName).insert(rows).select('*');
      if (error) throw error;
      return (data || []).map(stripMeta);
    },

    async bulkUpdate(items) {
      const results = [];
      for (const item of items) {
        const { id, ...rest } = item;
        results.push(await this.update(id, rest));
      }
      return results;
    },
  };
}

async function buildUserProfile() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Not authenticated');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  return {
    id: user.id,
    email: user.email,
    full_name: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || '',
    display_name: profile?.display_name || '',
    role: profile?.role || 'user',
    preferred_theme: profile?.preferred_theme || 'system',
    monthly_salary: profile?.monthly_salary ?? null,
    created_date: profile?.created_date,
  };
}

const auth = {
  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  async me() {
    return buildUserProfile();
  },

  async updateMe(updates) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const profileUpdates = {};
    for (const key of ['display_name', 'preferred_theme', 'monthly_salary', 'role']) {
      if (updates[key] !== undefined) profileUpdates[key] = updates[key];
    }

    if (Object.keys(profileUpdates).length) {
      profileUpdates.updated_date = new Date().toISOString();
      const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', user.id);
      if (error) throw error;
    }

    return buildUserProfile();
  },

  async loginViaEmailPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  async register({ email, password }) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  },

  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'signup',
    });
    if (error) throw error;
    return { access_token: data.session?.access_token };
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
  },

  async loginWithProvider(provider, redirectPath = '/') {
    const redirectTo = `${window.location.origin}${redirectPath}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (error) throw error;
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  },

  redirectToLogin(returnUrl) {
    const path = `/login${returnUrl ? `?return=${encodeURIComponent(returnUrl)}` : ''}`;
    window.location.href = path;
  },

  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  async resetPassword({ resetToken, newPassword }) {
    if (resetToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: resetToken,
        refresh_token: resetToken,
      });
      if (sessionError) throw sessionError;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    await supabase.auth.signOut();
  },

  setToken(token) {
    return supabase.auth.setSession({ access_token: token, refresh_token: token });
  },
};

const integrations = {
  Core: {
    async UploadFile({ file }) {
      const userId = await getUserId();
      const ext = file.name.split('.').pop();
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('attachments').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from('attachments').getPublicUrl(path);
      return { file_url: data.publicUrl };
    },

    async InvokeLLM() {
      throw new Error('AI document scanning is not configured. Set up a Supabase Edge Function or external OCR service.');
    },

    async SendEmail({ to, subject, body }) {
      console.warn('SendEmail not configured — would send to:', to, subject, body?.slice?.(0, 80));
      return { success: false, message: 'Email integration not configured' };
    },
  },
};

const entities = new Proxy(
  {},
  {
    get(_target, entityName) {
      const table = ENTITY_TABLES[entityName];
      if (!table) {
        throw new Error(`Unknown entity: ${String(entityName)}`);
      }
      return createEntityApi(table, { isProfileTable: entityName === 'User' });
    },
  }
);

export const db = { auth, entities, integrations };
export default db;
