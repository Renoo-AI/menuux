import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Check if a UID has superadmin privileges in Supabase
 */
export async function isSuperadminUid(uid: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { data: staff, error } = await supabase
      .from('staff')
      .select('role')
      .eq('user_id', uid)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !staff) return false;
    return ['super_admin', 'owner'].includes(staff.role);
  } catch (error) {
    console.error('Error checking superadmin status:', error);
    return false;
  }
}

/**
 * Client-side helper to check if a user metadata has admin role
 */
export function isSuperadminClient(userMetadata: Record<string, any> | null): boolean {
  if (!userMetadata) return false;
  return userMetadata.role === 'super_admin' || userMetadata.role === 'owner';
}

export const FALLBACK_SUPERADMIN_UID = process.env.SUPERADMIN_UID || '';

