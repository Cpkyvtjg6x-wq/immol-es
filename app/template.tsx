'use client'

import { motion } from 'framer-motion'

/**
 * Transition de page globale (Next App Router).
 * template.tsx est re-monté à chaque navigation → chaque page entre en fondu
 * doux. Volontairement subtil et rapide pour ne pas gêner la navigation.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
