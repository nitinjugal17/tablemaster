// src/lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import common_en from '@/locales/en/common.json';
import invoice_en from '@/locales/en/invoice.json';
import generalSettings_en from '@/locales/en/general-settings.json';
import dashboard_en from '@/locales/en/dashboard.json';
import auth_en from '@/locales/en/auth.json';
import attendance_en from '@/locales/en/attendance.json';
import sidebar_en from '@/locales/en/sidebar.json'; 

import common_hi from '@/locales/hi/common.json';
import invoice_hi from '@/locales/hi/invoice.json';
import generalSettings_hi from '@/locales/hi/general-settings.json';
import dashboard_hi from '@/locales/hi/dashboard.json';
import auth_hi from '@/locales/hi/auth.json';
import attendance_hi from '@/locales/hi/attendance.json';
import sidebar_hi from '@/locales/hi/sidebar.json'; 

import common_bn from '@/locales/bn/common.json';
import invoice_bn from '@/locales/bn/invoice.json';
import generalSettings_bn from '@/locales/bn/general-settings.json';
import dashboard_bn from '@/locales/bn/dashboard.json';
import auth_bn from '@/locales/bn/auth.json';
import attendance_bn from '@/locales/bn/attendance.json';
import sidebar_bn from '@/locales/bn/sidebar.json'; 


const resources = {
  en: {
    common: common_en,
    invoice: invoice_en,
    'general-settings': generalSettings_en,
    dashboard: dashboard_en,
    auth: auth_en,
    attendance: attendance_en,
    sidebar: sidebar_en, 
  },
  hi: {
    common: common_hi,
    invoice: invoice_hi,
    'general-settings': generalSettings_hi,
    dashboard: dashboard_hi,
    auth: auth_hi,
    attendance: attendance_hi,
    sidebar: sidebar_hi, 
  },
  bn: {
    common: common_bn,
    invoice: invoice_bn,
    'general-settings': generalSettings_bn,
    dashboard: dashboard_bn,
    auth: auth_bn,
    attendance: attendance_bn,
    sidebar: sidebar_bn, 
  }
};

const i18nInstance = i18n.use(initReactI18next);

// Conditionally add LanguageDetector only on the client-side
if (typeof window !== 'undefined') {
  i18nInstance.use(LanguageDetector);
}

i18nInstance.init({
    resources,
    fallbackLng: 'en', 
    debug: process.env.NODE_ENV === 'development', 
    interpolation: {
      escapeValue: false, 
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    defaultNS: 'common',
    ns: ['common', 'invoice', 'general-settings', 'dashboard', 'auth', 'attendance', 'sidebar'], // Declare all namespaces
  });

export default i18n;
