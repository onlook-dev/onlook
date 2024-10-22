import clsx from 'clsx';
import H1Icon from './Icons/header-level-icons/h1Icon';
import H2Icon from './Icons/header-level-icons/h2Icon';
import H3Icon from './Icons/header-level-icons/h3Icon';
import H4Icon from './Icons/header-level-icons/h4Icon';
import H5Icon from './Icons/header-level-icons/h5Icon';
import H6Icon from './Icons/header-level-icons/h6Icon';

interface IconProps {
    className?: string;
    [key: string]: any;
}

export const Icons = {
    EyeDropper: (props: any) => (
        <svg xmlns="http://www.w3.org/2000/svg" width={15} height={15} fill="none" {...props}>
            <path
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M9.65098 3.01801C10.3799 2.26432 11.585 2.25428 12.3263 2.99571C13.0677 3.73715 13.0577 4.94231 12.304 5.67128L10.1041 7.79928C10.0222 7.8785 9.97552 7.98729 9.97457 8.10124C9.97362 8.21519 10.0185 8.32474 10.099 8.40531L10.6259 8.93224C10.7694 9.0757 10.7877 9.26188 10.7148 9.39002C10.5901 9.60936 10.452 9.80888 10.3287 9.92046C10.3126 9.93507 10.2989 9.94616 10.2876 9.95455C9.49985 9.34257 8.75216 8.59581 7.7444 7.58796C6.74234 6.58582 6.09783 5.92672 5.3679 5.03152C5.37539 5.02186 5.38474 5.01062 5.39637 4.9978C5.50841 4.87426 5.70999 4.73496 5.93151 4.60884C6.06074 4.53526 6.24789 4.55385 6.39152 4.6975L6.91718 5.2232C6.99774 5.30377 7.10729 5.34862 7.22122 5.34767C7.33516 5.34672 7.44394 5.30005 7.52316 5.21815L9.65098 3.01801ZM12.9273 2.39465C11.8501 1.31734 10.0992 1.33193 9.04003 2.42704L7.21263 4.31655L6.99254 4.09643C6.61768 3.72155 6.019 3.5809 5.511 3.87012C5.27335 4.00543 4.97343 4.19889 4.76679 4.42673C4.66384 4.54024 4.55311 4.69549 4.51041 4.88697C4.46226 5.10293 4.51054 5.32376 4.6602 5.50846C5.12817 6.086 5.55941 6.56637 6.05118 7.07991L2.04643 11.0827C1.4409 11.6879 1.44076 12.6695 2.04611 13.2749C2.65134 13.8802 3.6326 13.8802 4.23782 13.2749L8.23887 9.27353C8.78734 9.80411 9.29355 10.2634 9.82262 10.6694C10.01 10.8132 10.2294 10.8558 10.4415 10.8069C10.6311 10.7631 10.7853 10.6537 10.8991 10.5507C11.1269 10.3445 11.3192 10.0466 11.4536 9.81026C11.7424 9.30248 11.6007 8.70501 11.2269 8.33118L11.0056 8.10983L12.895 6.28228C13.99 5.22307 14.0046 3.47196 12.9273 2.39465ZM2.64727 11.6839C2.37384 11.9572 2.37378 12.4005 2.64713 12.6738C2.92042 12.9472 3.36352 12.9472 3.63681 12.6738L7.63192 8.6784L6.64339 7.68979L2.64727 11.6839Z"
            />
        </svg>
    ),
    H1: ({ className, ...props }: IconProps) => (
        <H1Icon
            className={className}
            letterClassName={clsx(
                {
                    'fill-black/50 dark:fill-white/50': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            levelClassName={clsx(
                {
                    'fill-[#313131] dark:fill-[#CECECE]': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            {...props}
        />
    ),
    H2: ({ className, ...props }: IconProps) => (
        <H2Icon
            className={className}
            letterClassName={clsx(
                {
                    'fill-black/50 dark:fill-white/50': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            levelClassName={clsx(
                {
                    'fill-[#313131] dark:fill-[#CECECE]': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            {...props}
        />
    ),
    H3: ({ className, ...props }: IconProps) => (
        <H3Icon
            className={className}
            letterClassName={clsx(
                {
                    'fill-black/50 dark:fill-white/50': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            levelClassName={clsx(
                {
                    'fill-[#313131] dark:fill-[#CECECE]': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            {...props}
        />
    ),
    H4: ({ className, ...props }: IconProps) => (
        <H4Icon
            className={className}
            letterClassName={clsx(
                {
                    'fill-black/50 dark:fill-white/50': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            levelClassName={clsx(
                {
                    'stroke-[#313131] dark:stroke-[#CECECE] fill-none': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                {
                    'stroke-white dark:stroke-primary fill-none': className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
            )}
            {...props}
        />
    ),
    H5: ({ className, ...props }: IconProps) => (
        <H5Icon
            className={className}
            letterClassName={clsx(
                {
                    'fill-black/50 dark:fill-white/50': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            levelClassName={clsx(
                {
                    'stroke-[#313131] dark:stroke-[#CECECE] fill-none': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                {
                    'stroke-white dark:stroke-primary fill-none': className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
            )}
            {...props}
        />
    ),
    H6: ({ className, ...props }: IconProps) => (
        <H6Icon
            className={className}
            letterClassName={clsx(
                {
                    'fill-black/50 dark:fill-white/50': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            levelClassName={clsx(
                {
                    'fill-[#313131] dark:fill-[#CECECE]': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            {...props}
        />
    ),
};
