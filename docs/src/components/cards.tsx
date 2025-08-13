import { ReactNode } from "react";

interface CardsProps {
  children: ReactNode;
  className?: string;
}

export function Cards({ children, className }: CardsProps) {
  return (
    <div
      className={
        className ?? "grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      }
    >
      {children}
    </div>
  );
}
