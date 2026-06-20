/**
 * Protected Routes Configuration
 * 
 * Single source of truth for route protection settings.
 * Used by middleware.ts for route access control.
 */

export interface ProtectedRouteConfig {
  paths: string[];
  loginPath: string;
  sessionCookie: string;
  excludePaths?: string[];
}

export const PROTECTED_ROUTES: Record<string, ProtectedRouteConfig> = {
  // Admin routes require superadmin authentication
  admin: {
    paths: ['/admin'],
    loginPath: '/admin/login',
    sessionCookie: 'sb-access-token',
  },
  // Staff routes require staff authentication
  staff: {
    paths: ['/staff'],
    loginPath: '/staff/login',
    sessionCookie: 'staff-session',
    excludePaths: ['/staff/login'],
  },
  // Dashboard routes require staff authentication with proper role
  dashboard: {
    paths: ['/dashboard'],
    loginPath: '/staff/login',
    sessionCookie: 'staff-session',
  },
} as const;

/**
 * Check if a path matches any protected route pattern
 */
export function getProtectedRouteType(pathname: string): { type: keyof typeof PROTECTED_ROUTES; config: ProtectedRouteConfig } | null {
  for (const [type, config] of Object.entries(PROTECTED_ROUTES)) {
    for (const path of config.paths) {
      // Check if pathname starts with the protected path
      if (pathname.startsWith(path)) {
        // Check if this path should be excluded
        if (config.excludePaths) {
          const isExcluded = config.excludePaths.some(excluded => pathname.startsWith(excluded));
          if (isExcluded) continue;
        }
        // Exact match for the protected path itself (e.g., /admin but not /admin/login)
        if (pathname === path || pathname.startsWith(path + '/')) {
          return { type: type as keyof typeof PROTECTED_ROUTES, config };
        }
      }
    }
  }
  return null;
}
