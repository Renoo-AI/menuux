'use client';

import { DailySpecialsManager } from '@/components/daily-specials';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function DailySpecialsPage() {
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
            <Sparkles className="h-8 w-8 text-primary" />
            Daily Specials
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage time-limited offers and featured items for your menu.
          </p>
        </div>
      </div>

      <DailySpecialsManager />
    </motion.div>
  );
}
