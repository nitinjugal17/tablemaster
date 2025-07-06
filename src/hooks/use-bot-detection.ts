"use client";

// This file's functionality has been disabled.
// The @fpjs-incubator/botd-agent package, which this component depends on,
// could not be installed from the registry (ETARGET error).
// To prevent breaking the application, the package has been removed
// from package.json and this hook now returns a default non-blocking state.
// The bot detection feature is currently disabled.

export function useBotDetection() {
  return { isBot: false, isLoadingBotDetection: false };
}
