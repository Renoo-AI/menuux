'use client';

import { SecurityDashboard } from '@/components/security/security-dashboard';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export default function SecurityPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Security Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor threats, manage bans, and protect your restaurant.
          </p>
        </div>
      </div>

      <SecurityDashboard />
    </motion.div>
  );
}
