'use client';

import { WaitlistManager } from '@/components/waitlist-manager';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';

export default function WaitlistPage() {
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
            <Users className="h-8 w-8 text-primary" />
            Waitlist
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage customer waitlist and seating queue.
          </p>
        </div>
      </div>

      <WaitlistManager />
    </motion.div>
  );
}
