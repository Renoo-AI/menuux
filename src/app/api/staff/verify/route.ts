import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

// Initialize Firebase Admin
function getAdminApp() {
  if (getApps().length > 0) return getApp();
  
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials');
  }
  
  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const SUPERADMIN_UID = process.env.NEXT_PUBLIC_SUPERADMIN_UID || '';

// Simple hash function for PIN (use bcrypt in production)
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'menux-salt-2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// POST - Verify staff PIN
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantSlug, pin } = body;
    
    if (!restaurantSlug || !pin) {
      return NextResponse.json({ error: 'restaurantSlug and pin are required' }, { status: 400 });
    }
    
    // Rate limit by restaurant slug + IP (brute-force protection)
    const clientIp = getClientIp(request);
    const rateLimitKey = `${restaurantSlug.toLowerCase()}:${clientIp}`;
    const rateLimitResult = checkRateLimit(rateLimitKey, RATE_LIMIT_CONFIGS.staffPin);
    
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfter);
    }
    
    // Validate PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      return NextResponse.json({ error: 'Invalid PIN format' }, { status: 400 });
    }
    
    const app = getAdminApp();
    const db = getFirestore(app);
    
    // Find restaurant by slug
    const restaurantSnapshot = await db.collection('restaurants')
      .where('slug', '==', restaurantSlug.toLowerCase())
      .where('status', '==', 'ACTIVE')
      .limit(1)
      .get();
    
    if (restaurantSnapshot.empty) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }
    
    const restaurantDoc = restaurantSnapshot.docs[0];
    const restaurantId = restaurantDoc.id;
    const restaurantData = restaurantDoc.data();
    
    // Find staff member with matching PIN for this restaurant
    const staffSnapshot = await db.collection('staff')
      .where('restaurantId', '==', restaurantId)
      .where('active', '==', true)
      .get();
    
    // Check each staff member's PIN hash
    for (const staffDoc of staffSnapshot.docs) {
      const staffData = staffDoc.data();
      
      // Compare PIN hash
      if (staffData.pinHash) {
        const providedPinHash = await hashPin(pin);
        if (providedPinHash === staffData.pinHash) {
          // Found matching staff
          return NextResponse.json({
            success: true,
            session: {
              restaurantId,
              restaurantSlug: restaurantData.slug,
              restaurantName: restaurantData.name,
              staffId: staffDoc.id,
              staffName: staffData.name,
              role: staffData.role,
            },
          });
        }
      } else if (staffData.pin === pin) {
        // Legacy plain PIN (for migration) - auto-upgrade to hash
        const pinHash = await hashPin(pin);
        await db.collection('staff').doc(staffDoc.id).update({ pinHash, pin: null });
        
        return NextResponse.json({
          success: true,
          session: {
            restaurantId,
            restaurantSlug: restaurantData.slug,
            restaurantName: restaurantData.name,
            staffId: staffDoc.id,
            staffName: staffData.name,
            role: staffData.role,
          },
        });
      }
    }
    
    // No matching staff found
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
  } catch (error) {
    console.error('Error in POST /api/staff/verify:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
