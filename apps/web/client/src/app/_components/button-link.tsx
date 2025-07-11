// Reusable button-link component
export function ButtonLink({ href, children, rightIcon, target, rel }: { 
    href: string; 
    children: React.ReactNode; 
    rightIcon?: React.ReactNode;
    target?: string;
    rel?: string;
}) {
    return (
        <a
            href={href}
            target={target}
            rel={rel}
            className="text-foreground-secondary text-regular flex items-center gap-2 border-b-[0.5px] border-foreground-secondary/50 hover:border-foreground-primary pb-2 hover:text-foreground-primary transition-colors group"
            style={{ width: 'fit-content' }}
        >
            {children}
            {rightIcon && <span className="ml-2 flex items-center group-hover:text-foreground-primary transition-colors">{rightIcon}</span>}
        </a>
    );
}
