/* ============================================================
   usePushNotifications.js
   Hook that registers the service worker, requests permission,
   subscribes with the VAPID public key and syncs the subscription
   with our backend. Also handles incoming notification clicks.
   ============================================================ */

import { useEffect, useRef } from 'react';
import axios from 'axios';

const API = '/api';

// Server's VAPID public key (must match server/.env VAPID_PUBLIC_KEY)
const VAPID_PUBLIC_KEY = 'BOMNoP6xpd1jzbqCV1nbjlxp9sMGFrEPCaC9HoBdMi6RhySYdmGy2EO7CfCyAy18_zIkhXWRyebWNtJuZEn7wZo';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData  = window.atob(base64);
  const output   = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export default function usePushNotifications(navigate) {
  const registeredRef = useRef(false);

  useEffect(() => {
    if (registeredRef.current) return;
    registeredRef.current = true;

    const token = sessionStorage.getItem('aether_token');
    if (!token) return;

    // Must be in a secure context (https or localhost)
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.info('[Push] Push notifications not supported in this browser.');
      return;
    }

    const setup = async () => {
      try {
        /* 1 — Register (or get existing) service worker */
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;

        /* 2 — Request notification permission */
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.info('[Push] Notification permission denied.');
          return;
        }

        /* 3 — Subscribe via PushManager */
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly:      true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
        }

        /* 4 — Send subscription to backend */
        await axios.post(
          `${API}/push/subscribe`,
          subscription.toJSON(),
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.info('[Push] Subscribed to push notifications ✓');
      } catch (err) {
        console.warn('[Push] Setup failed:', err);
      }
    };

    setup();

    /* 5 — Handle notification-click messages from the SW */
    const handleSWMessage = (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK' && event.data.url) {
        if (navigate) navigate(event.data.url);
      }
    };
    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    };
  }, [navigate]);
}
