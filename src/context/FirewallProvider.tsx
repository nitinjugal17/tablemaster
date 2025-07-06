"use client";

import React from "react";

// This file's functionality has been disabled.
// The @aikidosec/firewall package, which this component depends on,
// could not be installed from the registry (ETARGET error).
// To prevent breaking the application, the package has been removed
// from package.json and this provider now acts as a pass-through.
// The firewall feature is currently disabled.

export const FirewallProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
