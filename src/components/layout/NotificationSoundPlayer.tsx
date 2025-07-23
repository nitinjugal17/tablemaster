
"use client";

import React, { useEffect, useRef } from 'react';
import { useNotification } from '@/context/NotificationContext';
import { useGeneralSettings } from '@/context/GeneralSettingsContext';

const NotificationSoundPlayer: React.FC = () => {
  const { lastNotification } = useNotification();
  const { settings, isLoadingSettings } = useGeneralSettings();
  const newOrderAudioRef = useRef<HTMLAudioElement | null>(null);
  const newBookingAudioRef = useRef<HTMLAudioElement | null>(null);

  // Pre-load audio elements on the client
  useEffect(() => {
    newOrderAudioRef.current = new Audio('/sounds/new-order.mp3');
    newBookingAudioRef.current = new Audio('/sounds/new-booking.mp3');
  }, []);

  useEffect(() => {
    if (isLoadingSettings || !lastNotification || !settings.soundNotifications) {
      return;
    }

    const { type } = lastNotification;
    const soundSettings = settings.soundNotifications;

    let audioToPlay: HTMLAudioElement | null = null;

    if (type === 'new_order' && soundSettings.playOnNewOrder) {
      audioToPlay = newOrderAudioRef.current;
    } else if (type === 'new_booking' && soundSettings.playOnNewBooking) {
      audioToPlay = newBookingAudioRef.current;
    } else if (type === 'chef_update' && soundSettings.playOnChefUpdate) {
      // Future implementation for chef update sound
    }

    if (audioToPlay) {
      audioToPlay.play().catch(error => {
        // Autoplay can be blocked by the browser. A user interaction is often required first.
        // We can log this for debugging but shouldn't show a toast as it can be spammy.
        console.warn(`[Sound Notification] Audio playback failed:`, error);
      });
    }

  }, [lastNotification, settings, isLoadingSettings]);

  return null; // This component does not render anything
};

export default NotificationSoundPlayer;
