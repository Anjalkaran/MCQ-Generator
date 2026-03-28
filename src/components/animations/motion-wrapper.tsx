
"use client";

import { motion, HTMLMotionProps, Variants } from "framer-motion";
import { ReactNode } from "react";

interface MotionWrapperProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
  duration?: number;
}

export const FadeIn = ({ children, delay = 0, duration = 0.5, ...props }: MotionWrapperProps) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration, delay, ease: "easeOut" }}
    {...props}
  >
    {children}
  </motion.div>
);

export const SlideUp = ({ children, delay = 0, duration = 0.5, ...props }: MotionWrapperProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration, delay, ease: "easeOut" }}
    {...props}
  >
    {children}
  </motion.div>
);

export const ScaleIn = ({ children, delay = 0, duration = 0.5, ...props }: MotionWrapperProps) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration, delay, ease: "easeOut" }}
    {...props}
  >
    {children}
  </motion.div>
);

export const StaggerContainer = ({ children, ...props }: MotionWrapperProps) => {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const StaggerItem = ({ children, ...props }: MotionWrapperProps) => {
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div variants={itemVariants} {...props}>
      {children}
    </motion.div>
  );
};

export const HoverScale = ({ children, ...props }: MotionWrapperProps) => (
  <motion.div
    whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    whileTap={{ scale: 0.98 }}
    {...props}
  >
    {children}
  </motion.div>
);
