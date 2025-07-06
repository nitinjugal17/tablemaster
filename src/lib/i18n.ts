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

import common_hi from '@/locales/hi/common.json';
import invoice_hi from '@/locales/hi/invoice.json';
import generalSettings_hi from '@/locales/hi/general-settings.json';
import dashboard_hi from '@/locales/hi/dashboard.json';
import auth_hi from '@/locales/hi/auth.json';
import attendance_hi from '@/locales/hi/attendance.json';

import common_bn from '@/locales/bn/common.json';
import invoice_bn from '@/locales/bn/invoice.json';
import generalSettings_bn from '@/locales/bn/general-settings.json';
import dashboard_bn from '@/locales/bn/dashboard.json';
import auth_bn from '@/locales/bn/auth.json';
import attendance_bn from '@/locales/bn/attendance.json';


const resources = {
  en: {
    common: common_en,
    invoice: invoice_en,
    'general-settings': generalSettings_en,
    dashboard: dashboard_en,
    auth: auth_en,
    attendance: attendance_en,
  },
  hi: {
    common: common_hi,
    invoice: invoice_hi,
    'general-settings': generalSettings_hi,
    dashboard: dashboard_hi,
    auth: auth_hi,
    attendance: attendance_hi,
  },
  bn: {
    common: common_bn,
    invoice: invoice_bn,
    'general-settings': generalSettings_bn,
    dashboard: dashboard_bn,
    auth: auth_bn,
    attendance: attendance_bn,
  }
};

i18n
  .use(LanguageDetector) 
  .use(initReactI18next) 
  .init({
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
    ns: ['common', 'invoice', 'general-settings', 'dashboard', 'auth', 'attendance'], // Declare all namespaces
  });

export default i18n;
