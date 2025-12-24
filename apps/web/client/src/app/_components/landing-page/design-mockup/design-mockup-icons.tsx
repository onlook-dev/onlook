
export interface IconProps {
    className?: string;
    [key: string]: any;
}

export const DesignMockupIcons = {
    Add: ({ className, ...props }: IconProps) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g clipPath="url(#clip0_9157_282219)">
                <path d="M12 9V14.9998" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                <path d="M15 12.0002L9 12" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                <path d="M20 20V4H4V20H20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </g>
            <defs>
                <clipPath id="clip0_9157_282219">
                    <rect width="24" height="24" fill="currentColor" />
                </clipPath>
            </defs>
        </svg>
    ),
    CrossL: ({ className, ...props }: IconProps) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    ),
    Explore: ({ className, ...props }: IconProps) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g clipPath="url(#clip0_9157_282181)">
                <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" />
                <path d="M14.8287 9.17188L10.0003 10.0003L9.17188 14.8287L14.0003 14.0003L14.8287 9.17188Z" stroke="currentColor" strokeWidth="2" />
            </g>
            <defs>
                <clipPath id="clip0_9157_282181">
                    <rect width="24" height="24" fill="none" />
                </clipPath>
            </defs>
        </svg>
    ),
    Gear: ({ className, ...props }: IconProps) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g clipPath="url(#clip0_9157_282242)">
                <path d="M9.3 5.7L6.375 5.025L5.025 6.375L5.7 9.3L3 11.1V12.9L5.7 14.7L5.025 17.625L6.375 18.975L9.3 18.3L11.1 21H12.9L14.7 18.3L17.625 18.975L18.975 17.625L18.3 14.7L21 12.9V11.1L18.3 9.3L18.975 6.375L17.625 5.025L14.7 5.7L12.9 3H11.1L9.3 5.7Z" stroke="currentColor" strokeWidth="2" />
                <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" strokeWidth="2" />
            </g>
            <defs>
                <clipPath id="clip0_9157_282242">
                    <rect width="24" height="24" fill="none" />
                </clipPath>
            </defs>
        </svg>

    ),
    Home: ({ className, ...props }: IconProps) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g clipPath="url(#clip0_9157_282227)">
                <path d="M4 9L12 2.5L20 9V20H4V9Z" stroke="currentColor" strokeWidth="2" />
                <path d="M9 13H15V20H9V13Z" stroke="currentColor" strokeWidth="2" />
            </g>
            <defs>
                <clipPath id="clip0_9157_282227">
                    <rect width="24" height="24" fill="currentColor" />
                </clipPath>
            </defs>
        </svg>

    ),
    Messages: ({ className, ...props }: IconProps) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g clipPath="url(#clip0_9157_282235)">
                <path d="M20.0001 4H4V21.5L8 19H20.0001V4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                <path d="M8 10.625C8.48325 10.625 8.875 11.0168 8.875 11.5C8.875 11.9832 8.48325 12.375 8 12.375C7.51675 12.375 7.125 11.9832 7.125 11.5C7.125 11.0168 7.51675 10.625 8 10.625ZM12 10.625C12.4832 10.625 12.875 11.0168 12.875 11.5C12.875 11.9832 12.4832 12.375 12 12.375C11.5168 12.375 11.125 11.9832 11.125 11.5C11.125 11.0168 11.5168 10.625 12 10.625ZM16 10.625C16.4832 10.625 16.875 11.0168 16.875 11.5C16.875 11.9832 16.4832 12.375 16 12.375C15.5168 12.375 15.125 11.9832 15.125 11.5C15.125 11.0168 15.5168 10.625 16 10.625Z" fill="currentColor" stroke="currentColor" strokeWidth="0.75" strokeLinecap="square" />
            </g>
            <defs>
                <clipPath id="clip0_9157_282235">
                    <rect width="24" height="24" fill="currentColor" />
                </clipPath>
            </defs>
        </svg>

    ),
    Notifications: ({ className, ...props }: IconProps) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <g clipPath="url(#clip0_9157_282249)">
                <path d="M20 17H4V16L5.5 13L5.70037 8.99251C5.86822 5.63561 8.6389 3 12 3C15.3611 3 18.1318 5.63561 18.2996 8.99251L18.5 13L20 16V17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
                <path d="M8.03125 17.5C8.2773 19.4732 9.9605 21 12.0003 21C14.0401 21 15.7233 19.4732 15.9694 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
            </g>
            <defs>
                <clipPath id="clip0_9157_282249">
                    <rect width="24" height="24" fill="none" />
                </clipPath>
            </defs>
        </svg>

    ),

} satisfies { [key: string]: React.FC<IconProps> };
