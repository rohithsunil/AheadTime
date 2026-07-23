/**
 * usePushNotifications — manages Web Push subscription lifecycle
 *
 * Usage:
 *   const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications();
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/api/supabaseClient';

const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BNFers1pmGVT8TgMybZ-WlQ54qZ4T7w-QItxGEs4VkO2GyAcO1Fu86iNhfEFe-AqDlwLgFzS-LtDEVd5ezHZdAM';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionState, setPermissionState] = useState('default');

  useEffect(() => {
    const check = async () => {
      const supported =
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
      setIsSupported(supported);

      if (!supported) {
        setIsLoading(false);
        return;
      }

      setPermissionState(Notification.permission);

      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(!!sub);

        // If permission is granted but pushManager subscription isn't synced to DB yet, sync it!
        if (Notification.permission === 'granted' && sub) {
          const json = sub.toJSON();
          const { data: { user } } = await supabase.auth.getUser();
          if (user && json.endpoint && json.keys) {
            await supabase.from('push_subscriptions').upsert(
              {
                user_id: user.id,
                endpoint: json.endpoint,
                p256dh: json.keys.p256dh,
                auth: json.keys.auth,
                user_agent: navigator.userAgent.slice(0, 255),
                updated_date: new Date().toISOString(),
              },
              { onConflict: 'endpoint' }
            );
          }
        }
      } catch (err) {
        console.warn('Push status check warning:', err);
      } finally {
        setIsLoading(false);
      }
    };

    check();
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) return { success: false, error: 'Push notifications not supported on this browser' };
    if (!VAPID_PUBLIC_KEY) return { success: false, error: 'VAPID public key missing' };

    setIsLoading(true);
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      if (permission !== 'granted') {
        return { success: false, error: 'Notification permission was denied' };
      }

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json = sub.toJSON();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to subscribe to notifications');

      // Save subscription to Supabase
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent.slice(0, 255),
          updated_date: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      );

      if (error) throw error;

      setIsSubscribed(true);
      return { success: true };
    } catch (err) {
      console.error('Push subscribe error:', err);
      return { success: false, error: err.message || 'Failed to subscribe' };
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      }
      setIsSubscribed(false);
      return { success: true };
    } catch (err) {
      console.error('Push unsubscribe error:', err);
      return { success: false, error: err.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permissionState,
    subscribe,
    unsubscribe,
  };
}
