'use client';

import { PromotionsManager } from '@/components/promotions-manager';
import { motion } from 'framer-motion';

export default function PromotionsPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Promotions</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage discounts, special offers, and promo codes.
          </p>
        </div>
      </div>

      <PromotionsManager />
    </motion.div>
  );
}
