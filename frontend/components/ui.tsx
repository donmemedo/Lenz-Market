"use client";

import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import type { ReactNode } from "react";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  }),
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
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
          {sub && <p className="mt-2 max-w-xl text-muted">{sub}</p>}
        </div>
      </Reveal>
      {action && <Reveal i={1}>{action}</Reveal>}
    </div>
  );
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-300 active:scale-[.97] disabled:opacity-50 disabled:pointer-events-none";
const variants = {
  primary: "gradient-bg text-white ring-glow hover:brightness-110",
  ghost: "border border-line bg-surface/60 backdrop-blur hover:bg-surface",
  soft: "bg-ink/5 dark:bg-white/10 hover:bg-ink/10 dark:hover:bg-white/15",
};
const sizes = { sm: "h-9 px-4 text-sm", md: "h-11 px-5 text-sm", lg: "h-13 px-7 text-base py-3.5" };

type BtnProps = {
  children: ReactNode; href?: string; variant?: keyof typeof variants; size?: keyof typeof sizes;
  className?: string; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean;
};

export function Button({ children, href, variant = "primary", size = "md", className = "", ...rest }: BtnProps) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button className={cls} {...rest}>{children}</button>;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-2xl ${className}`} />;
}
