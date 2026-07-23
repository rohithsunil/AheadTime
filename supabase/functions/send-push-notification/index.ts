import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@8pxstudio.com';

    if (!vapidPublic || !vapidPrivate) {
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured in Edge Function secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: subs, error } = await supabase.from('push_subscriptions').select('*');
    if (error) throw error;

    const bodyData = await req.json().catch(() => ({}));
    const title = bodyData.title || 'AheadTime Alert';
    const body = bodyData.body || 'You have a new notification.';
    const url = bodyData.url || '/';

    const payload = JSON.stringify({ title, body, url });

    let sent = 0;
    let failed = 0;

    await Promise.all(
      (subs || []).map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          };
          await webpush.sendNotification(pushSubscription, payload);
          sent++;
        } catch (err: any) {
          console.error('Failed to send push to endpoint:', sub.endpoint, err?.message || err);
          failed++;
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            // Subscription expired or unsubscribed — delete stale subscription row
            await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          }
        }
      })
    );

    return new Response(
      JSON.stringify({ success: true, total: subs?.length || 0, sent, failed }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Push broadcast failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
