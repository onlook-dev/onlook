// Reusable button-link component
export function ButtonLink({
    href,
    children,
    rightIcon,
    target,
    rel,
}: {
    href: string;
    children: React.ReactNode;
    rightIcon?: React.ReactNode;
    target?: string;
    rel?: string;
}) {
    return (
        <div className="group relative inline-block">
            <a
                href={href}
                target={target}
                rel={rel}
                className="text-foreground-secondary text-regular hover:text-foreground-primary flex items-center gap-2 pb-2 transition-colors"
                style={{ width: 'fit-content' }}
            >
                {children}
                {rightIcon && (
                    <span className="group-hover:text-foreground-primary ml-2 flex items-center transition-all duration-200 ease-in-out group-hover:translate-x-1.5">
                        {rightIcon}
                    </span>
                )}
            </a>
            <div className="bg-foreground-secondary/50 group-hover:bg-foreground-primary absolute bottom-0 left-0 h-[0.5px] w-full transition-all duration-190 ease-in-out group-hover:w-[calc(100%+6px)]"></div>
        </div>
    );
}
