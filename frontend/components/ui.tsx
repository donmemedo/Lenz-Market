"use client";

import { motion, type Transition, type Variants } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

/** Critically damped spring (no overshoot): Apple's default for UI that wasn't flicked. */
export const settle: Transition = { type: "spring", bounce: 0, duration: 0.5 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { ...settle, delay: Math.min(i, 6) * 0.05 } }),
};

export function Reveal({ children, i = 0, className = "" }: { children: ReactNode; i?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      custom={i}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHead({ eyebrow, title, sub, action }: { eyebrow?: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <Reveal>
        <div>
          {eyebrow && (
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-xs font-medium text-muted">
              <span className="size-1.5 rounded-full gradient-bg" />
              {eyebrow}
            </span>
          )}
          <h2 className="display text-3xl font-extrabold sm:text-4xl">{title}</h2>
          {sub && <p className="mt-2 max-w-xl text-muted">{sub}</p>}
        </div>
      </Reveal>
      {action && <Reveal i={1}>{action}</Reveal>}
    </div>
  );
}

// Feedback on press, not release: the scale-down starts on pointer-down and is near-instant.
const base =
  "inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold transition-[transform,filter,background-color,box-shadow] duration-200 ease-out active:scale-[.97] active:duration-75 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40 disabled:opacity-50 disabled:pointer-events-none";
const variants = {
  primary: "gradient-bg text-white ring-glow hover:brightness-110 active:brightness-95",
  ghost: "border border-line bg-surface/60 backdrop-blur hover:bg-surface",
  soft: "bg-ink/5 dark:bg-white/10 hover:bg-ink/10 dark:hover:bg-white/15",
};
// Every size reaches the 44px touch target on coarse pointers.
const sizes = { sm: "h-9 px-4 text-sm pointer-coarse:h-11", md: "h-11 px-5 text-sm", lg: "h-13 px-7 text-base py-3.5" };

type BtnProps = {
  children: ReactNode; href?: string; variant?: keyof typeof variants; size?: keyof typeof sizes;
  className?: string; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean;
};

export function Button({ children, href, variant = "primary", size = "md", className = "", type = "button", ...rest }: BtnProps) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type={type} className={cls} {...rest}>{children}</button>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-2xl ${className}`} aria-hidden />;
}

/** Inline error, announced to screen readers. */
export const Notice = ({ children }: { children: ReactNode }) => (
  <p role="alert" className="rounded-2xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">{children}</p>
);
