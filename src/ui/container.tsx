import type { ReactNode } from "react";

export default function Container({ className, props, children }: { className?: string; props?: Record<string, string>; children: ReactNode }) {
    return <div className={`max-w-3xl mx-auto ${className ?? ''}`} {...props}>{children}</div>
}
