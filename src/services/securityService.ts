'use client';

import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface SecurityStatus {
  allowed: boolean;
  reason?: string;
  type?: 'banned' | 'kicked';
  expiresAt?: number;
}

export interface SecurityLog {
  id: string;
  type: 'rate_limit' | 'ban' | 'kick' | 'honeypot' | 'suspicious_activity';
  deviceId?: string;
  ip?: string;
  userAgent?: string;
  endpoint?: string;
  restaurantId?: string;
  tableId?: string;
  reason?: string;
  timestamp: number | null;
  metadata?: Record<string, unknown>;
}

export interface BannedDevice {
  id: string;
  deviceId: string;
  ip?: string;
  reason: string;
  bannedAt: number | null;
  expiresAt: number | null;
  bannedBy?: string;
  restaurantId?: string;
}

export interface KickedDevice {
  id: string;
  deviceId: string;
  tableId: string;
  restaurantId: string;
  kickedAt: number | null;
  expiresAt: number | null;
  kickedBy?: string;
  reason?: string;
}

// Device ID management
const DEVICE_ID_KEY = 'menux_device_id';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let deviceId = sessionStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = `device_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    sessionStorage.setItem(DEVICE_ID_KEY, deviceId);
  }

  return deviceId;
}

export function resetDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  const newDeviceId = `device_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  sessionStorage.setItem(DEVICE_ID_KEY, newDeviceId);
  return newDeviceId;
}

// Security service class
class SecurityService {
  // Check if device is allowed to access
  async checkSecurityStatus(
    deviceId: string,
    tableId?: string,
    restaurantId?: string
  ): Promise<SecurityStatus> {
    try {
      const fn = httpsCallable(functions, 'checkSecurityStatus');
      const result = await fn({ deviceId, tableId, restaurantId });
      return result.data as SecurityStatus;
    } catch (error) {
      console.error('Error checking security status:', error);
      // On error, allow access (fail open for availability)
      return { allowed: true };
    }
  }

  // Kick a device from a table
  async kickDevice(
    deviceId: string,
    tableId: string,
    restaurantId: string,
    durationMinutes: number = 30,
    reason: string = 'Suspicious activity'
  ): Promise<{ success: boolean; message: string; expiresAt?: number }> {
    try {
      const fn = httpsCallable(functions, 'kickDevice');
      const result = await fn({
        deviceId,
        tableId,
        restaurantId,
        durationMinutes,
        reason,
      });
      return result.data as { success: boolean; message: string; expiresAt?: number };
    } catch (error) {
      console.error('Error kicking device:', error);
      throw error;
    }
  }

  // Lift a kick
  async liftKick(
    deviceId: string,
    tableId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const fn = httpsCallable(functions, 'liftKick');
      const result = await fn({ deviceId, tableId });
      return result.data as { success: boolean; message: string };
    } catch (error) {
      console.error('Error lifting kick:', error);
      throw error;
    }
  }

  // Ban a device
  async banDevice(
    deviceId: string,
    reason: string,
    durationDays?: number,
    ip?: string,
    restaurantId?: string
  ): Promise<{ success: boolean; message: string; expiresAt?: number }> {
    try {
      const fn = httpsCallable(functions, 'banDevice');
      const result = await fn({
        deviceId,
        reason,
        durationDays,
        ip,
        restaurantId,
      });
      return result.data as { success: boolean; message: string; expiresAt?: number };
    } catch (error) {
      console.error('Error banning device:', error);
      throw error;
    }
  }

  // Unban a device
  async unbanDevice(deviceId: string): Promise<{ success: boolean; message: string }> {
    try {
      const fn = httpsCallable(functions, 'unbanDevice');
      const result = await fn({ deviceId });
      return result.data as { success: boolean; message: string };
    } catch (error) {
      console.error('Error unbanning device:', error);
      throw error;
    }
  }

  // Get security logs
  async getSecurityLogs(
    restaurantId?: string,
    type?: string,
    limit: number = 50,
    startAfter?: string
  ): Promise<{ logs: SecurityLog[] }> {
    try {
      const fn = httpsCallable(functions, 'getSecurityLogs');
      const result = await fn({ restaurantId, type, limit, startAfter });
      return result.data as { logs: SecurityLog[] };
    } catch (error) {
      console.error('Error getting security logs:', error);
      throw error;
    }
  }

  // Get banned devices
  async getBannedDevices(): Promise<{ devices: BannedDevice[] }> {
    try {
      const fn = httpsCallable(functions, 'getBannedDevices');
      const result = await fn({});
      return result.data as { devices: BannedDevice[] };
    } catch (error) {
      console.error('Error getting banned devices:', error);
      throw error;
    }
  }

  // Get kicked devices
  async getKickedDevices(restaurantId?: string): Promise<{ devices: KickedDevice[] }> {
    try {
      const fn = httpsCallable(functions, 'getKickedDevices');
      const result = await fn({ restaurantId });
      return result.data as { devices: KickedDevice[] };
    } catch (error) {
      console.error('Error getting kicked devices:', error);
      throw error;
    }
  }
}

export const securityService = new SecurityService();
