// Reusable button-link component
export function ButtonLink({ href, children, rightIcon, target, rel }: { 
    href: string; 
    children: React.ReactNode; 
    rightIcon?: React.ReactNode;
    target?: string;
    rel?: string;
}) {
    return (
        <div className="relative inline-block group">
            <a
                href={href}
                target={target}
                rel={rel}
                className="text-foreground-secondary text-regular flex items-center gap-2 pb-2 hover:text-foreground-primary transition-colors"
                style={{ width: 'fit-content' }}
            >
                {children}
                {rightIcon && <span className="ml-2 flex items-center group-hover:text-foreground-primary group-hover:translate-x-1.5 transition-all duration-200 ease-in-out">{rightIcon}</span>}
            </a>
            <div className="absolute bottom-0 left-0 w-full h-[0.5px] bg-foreground-secondary/50 group-hover:bg-foreground-primary transition-all duration-190 ease-in-out group-hover:w-[calc(100%+6px)]"></div>
        </div>
    );
}
