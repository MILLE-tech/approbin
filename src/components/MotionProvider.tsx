import { LazyMotion, domAnimation } from 'motion/react'
import type { ReactNode } from 'react'

// `domAnimation` (pas `domMax`) : anime/exit/hover/tap/focus, sans drag ni
// layout animations, pour garder le bundle le plus léger possible. `strict`
// interdit toute utilisation accidentelle de <motion.div> (qui chargerait
// le bundle complet) : seuls les composants <m.*> sont autorisés.
export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  )
}
