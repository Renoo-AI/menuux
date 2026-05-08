'use client';

import { FloorPlan } from '@/components/floor-plan';
import { motion } from 'framer-motion';
import { Grid3X3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FloorPlanPage() {
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
            <Grid3X3 className="h-8 w-8 text-primary" />
            Floor Plan
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize and manage your restaurant layout in real-time.
          </p>
        </div>
        <Button variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Edit Layout
        </Button>
      </div>

      <FloorPlan editable={false} />
    </motion.div>
  );
}
