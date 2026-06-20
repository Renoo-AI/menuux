import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Fallback UID for backwards compatibility
const FALLBACK_SUPERADMIN_UID = process.env.SUPERADMIN_UID || '';

/**
 * Verify that the request comes from an authorized admin or superadmin user in Supabase.
 * 
 * @param request - The Next.js API request
 * @returns The user's ID if verified, null otherwise
 */
export async function verifySuperAdmin(request: NextRequest): Promise<{ uid: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  
  const token = authHeader.substring(7);
  
  try {
    const supabase = createAdminClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      // Fallback to direct env comparison if provided
      if (FALLBACK_SUPERADMIN_UID && token === FALLBACK_SUPERADMIN_UID) {
        return { uid: FALLBACK_SUPERADMIN_UID };
      }
      return null;
    }

    // Check staff role in the Supabase database
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('role', ['super_admin', 'owner', 'admin'])
      .maybeSingle();

    if (staffError || !staff) {
      return null;
    }
    
    return { uid: user.id };
  } catch {
    return null;
  }
}

/**
 * Check if a UID is the fallback superadmin UID
 */
export function isFallbackSuperadmin(uid: string): boolean {
  return uid === FALLBACK_SUPERADMIN_UID;
}

