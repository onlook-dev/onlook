import React from 'react';

import { Icons } from '@onlook/ui/icons';

export function ComponentsBlock() {
    return (
        <div className="flex flex-col gap-4">
            {/* Custom Components Menu + Calendar Preview */}
            <div className="bg-background-onlook/80 relative flex min-h-[400px] flex-row gap-8 overflow-hidden rounded-lg">
                {/* Left menu container with grey background and overflow hidden */}
                <div className="border-foreground-primary/20 absolute top-12 left-1/8 flex h-100 w-56 flex-col items-center justify-start overflow-hidden rounded-xl border-[0.5px] bg-black md:left-1/30 lg:left-1/20">
                    <p className="text-foreground-primary text-regular border-foreground-primary/20 w-full border-b-[0.5px] px-3 py-2 text-left font-light">
                        Components
                    </p>
                    <div className="grid h-full w-full grid-cols-2 grid-rows-3 gap-6 p-4">
                        {[
                            { label: 'Calendar', selected: true },
                            { label: 'Card', selected: false },
                            { label: 'Carousel', selected: false },
                            { label: 'Chart', selected: false },
                            { label: 'Table', selected: false },
                            { label: 'Weather', selected: false },
                        ].map((item, idx) => (
                            <div key={item.label} className="flex w-full flex-col items-center">
                                <div
                                    className={
                                        `bg-background-secondary mb-1.5 flex h-24 w-24 items-center justify-center rounded-xs transition-all ` +
                                        (item.selected
                                            ? 'outline outline-1 outline-offset-2 outline-purple-400'
                                            : '')
                                    }
                                >
                                    {/* Custom component previews */}
                                    {item.label === 'Calendar' && (
                                        <div
                                            className="h-fit w-16 rounded-[4px] bg-black p-1.5 select-none"
                                            style={{ fontSize: '3px' }}
                                        >
                                            {/* Mini calendar header */}
                                            <div className="mx-0.5 mb-1 flex items-center justify-between">
                                                <Icons.ArrowLeft className="text-foreground-primary h-1 w-1" />
                                                <div className="flex gap-0.5">
                                                    <div className="rounded-[1px] bg-zinc-800 px-0.5 py-0.5 text-[3px] text-white">
                                                        {new Date().toLocaleString('default', {
                                                            month: 'short',
                                                        })}
                                                    </div>
                                                    <div className="rounded-[1px] bg-zinc-800 px-0.5 py-0.5 text-[3px] text-white">
                                                        {new Date().getFullYear()}
                                                    </div>
                                                </div>
                                                <Icons.ArrowRight className="text-foreground-primary h-1 w-1" />
                                            </div>
                                            {/* Mini calendar grid */}
                                            <div className="mb-0.5 grid grid-cols-7 gap-[0.5px] text-center text-[3px] text-zinc-500">
                                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(
                                                    (d, index) => (
                                                        <div key={`mini-${d}-${index}`}>{d}</div>
                                                    ),
                                                )}
                                            </div>
                                            <div className="grid grid-cols-7 gap-[0.5px] text-center">
                                                {(() => {
                                                    const today = new Date();
                                                    const currentMonth = today.getMonth();
                                                    const currentYear = today.getFullYear();
                                                    const firstDay = new Date(
                                                        currentYear,
                                                        currentMonth,
                                                        1,
                                                    );
                                                    const lastDay = new Date(
                                                        currentYear,
                                                        currentMonth + 1,
                                                        0,
                                                    );
                                                    const daysInMonth = lastDay.getDate();
                                                    const startingDay = firstDay.getDay();

                                                    return Array.from({ length: 35 }, (_, i) => {
                                                        const day = i - startingDay + 1;
                                                        const isToday =
                                                            day === today.getDate() &&
                                                            currentMonth === today.getMonth() &&
                                                            currentYear === today.getFullYear();

                                                        if (day < 1 || day > daysInMonth)
                                                            return <div key={i}></div>;

                                                        return (
                                                            <div
                                                                key={i}
                                                                className={`rounded-[4px] py-[0.5px] text-[3px] ${
                                                                    isToday
                                                                        ? 'bg-white font-bold text-black'
                                                                        : 'text-zinc-300'
                                                                }`}
                                                            >
                                                                {day}
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    )}
                                    {item.label === 'Card' && (
                                        <div
                                            className="flex h-18 w-18 flex-col gap-[1.5px] rounded-[4px] bg-black p-1.5 select-none"
                                            style={{ fontSize: '3.5px' }}
                                        >
                                            {/* Header */}
                                            <div className="mb-0.5 flex items-center justify-between">
                                                <span className="font-semibold text-white">
                                                    Login
                                                </span>
                                                <span className="text-zinc-400">Sign Up</span>
                                            </div>
                                            <span className="mb-0.5 text-zinc-400">
                                                Enter your email below
                                            </span>
                                            {/* Email field */}
                                            <div className="mb-0.5 text-zinc-400">Email</div>
                                            <div className="flex h-2 w-full items-center rounded-[1px] bg-zinc-800 px-0.5 text-zinc-500">
                                                m@example.com
                                            </div>
                                            {/* Password field */}
                                            <div className="mt-0.5 flex items-center justify-between">
                                                <span className="text-zinc-400">Password</span>
                                                <span className="text-zinc-500">Forgot?</span>
                                            </div>
                                            <div className="mb-0.5 h-2 w-full rounded-[1px] bg-zinc-800"></div>
                                            {/* Login button */}
                                            <div className="mb-0.5 flex h-2 w-full items-center justify-center rounded-[1px] bg-white font-semibold text-black">
                                                Login
                                            </div>
                                            {/* Google button */}
                                            <div className="flex h-2 w-full items-center justify-center rounded-[1px] bg-zinc-900 text-white">
                                                Login with Google
                                            </div>
                                        </div>
                                    )}
                                    {item.label === 'Carousel' && (
                                        <div className="flex h-20 w-20 items-center justify-center bg-transparent select-none">
                                            {/* Left arrow button */}
                                            <div className="border-foreground-tertiary/50 mr-1 flex h-4 w-4 items-center justify-center rounded-full border-[0.25px] bg-black">
                                                <Icons.ArrowLeft className="text-foreground-primary h-1 w-1" />
                                            </div>
                                            {/* Center slide */}
                                            <div className="border-foreground-tertiary/50 flex h-12 w-12 items-center justify-center rounded-[6px] border-[0.25px] bg-black">
                                                <span className="text-[10px] font-light text-white">
                                                    2
                                                </span>
                                            </div>
                                            {/* Right arrow button */}
                                            <div className="border-foreground-tertiary/50 ml-1 flex h-4 w-4 items-center justify-center rounded-full border-[0.25px] bg-black">
                                                <Icons.ArrowRight className="text-foreground-primary h-1 w-1" />
                                            </div>
                                        </div>
                                    )}
                                    {item.label === 'Chart' && (
                                        <div className="relative flex h-16 w-18 flex-col overflow-hidden rounded-[4px] bg-black p-0.5 select-none">
                                            {/* Header */}
                                            <div className="px-1 pt-1 pb-0.5">
                                                <div className="mb-1 text-[4.5px] leading-none font-semibold text-white">
                                                    Bar Chart
                                                </div>
                                                <div className="text-[3.2px] leading-none text-zinc-400">
                                                    Visitors last 3 months
                                                </div>
                                            </div>
                                            {/* Chart area */}
                                            <div className="relative flex flex-1 flex-col justify-end">
                                                {/* Grid lines */}
                                                <div
                                                    className="absolute top-[30%] right-0 left-0 h-[1px] bg-zinc-700/40"
                                                    style={{ zIndex: 1 }}
                                                ></div>
                                                <div
                                                    className="absolute top-[60%] right-0 left-0 h-[1px] bg-zinc-700/40"
                                                    style={{ zIndex: 1 }}
                                                ></div>
                                                {/* Bars */}
                                                <div
                                                    className="absolute right-0 bottom-0 left-0 z-10 flex w-full items-end gap-[0.5px] px-1 py-1"
                                                    style={{ height: 'calc(100% - 15px)' }}
                                                >
                                                    {[
                                                        8, 15, 6, 18, 13, 10, 17, 7, 19, 12, 5, 16,
                                                        14, 9, 18, 11, 8, 17, 6, 15, 12, 14, 10, 6,
                                                        7, 18, 13, 9, 1, 11, 17, 8, 14, 6, 19, 14,
                                                        14, 9, 20, 10, 13, 15, 9, 17, 8, 12, 14, 6,
                                                        18, 11,
                                                    ].map((h, i) => (
                                                        <div
                                                            key={i}
                                                            className="rounded-[1px] bg-teal-300"
                                                            style={{
                                                                width: '1.2px',
                                                                height: `${h * 1.6}px`,
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {item.label === 'Table' && (
                                        <div className="h-16 w-16 rounded-[4px] bg-black p-0.5 select-none">
                                            <div className="grid grid-cols-3 gap-[1px] text-[3px] text-zinc-300">
                                                <div className="bg-background-onlook rounded-[1px] p-1">
                                                    Name
                                                </div>
                                                <div className="bg-background-onlook rounded-[1px] p-1">
                                                    Age
                                                </div>
                                                <div className="bg-background-onlook rounded-[1px] p-1">
                                                    City
                                                </div>
                                                <div className="bg-background-onlook rounded-[1px] p-1">
                                                    John
                                                </div>
                                                <div className="bg-background-onlook rounded-[1px] p-1">
                                                    25
                                                </div>
                                                <div className="bg-background-onlook rounded-[1px] p-1">
                                                    NYC
                                                </div>
                                                <div className="bg-background-onlook rounded-[1px] p-1">
                                                    Jane
                                                </div>
                                                <div className="bg-background-onlook rounded-[1px] p-1">
                                                    30
                                                </div>
                                                <div className="bg-background-onlook rounded-[1px] p-1">
                                                    LA
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {item.label === 'Weather' && (
                                        <div className="relative flex h-16 w-16 flex-col items-center overflow-hidden rounded-[4px] bg-black p-1 select-none">
                                            {/* Sun icon */}
                                            <div className="mt-2 flex w-full items-center justify-center">
                                                <svg
                                                    width="16"
                                                    height="16"
                                                    viewBox="0 0 16 16"
                                                    fill="none"
                                                >
                                                    <circle cx="8" cy="8" r="4" fill="#fbbf24" />
                                                    {[...Array(10)].map((_, i) => (
                                                        <rect
                                                            key={i}
                                                            x={8 - 0.5}
                                                            y={1}
                                                            width={1}
                                                            height={3}
                                                            fill="#fbbf24"
                                                            transform={`rotate(${i * 45} 8 8)`}
                                                        />
                                                    ))}
                                                </svg>
                                                <div className="ml-1 text-[15px] font-light text-white">
                                                    72°
                                                </div>
                                            </div>
                                            {/* Forecast bar */}
                                            <div className="mt-2 mb-1 flex w-full justify-center gap-[1px]">
                                                <div className="h-1.5 w-2 rounded-[1px] bg-amber-400" />
                                                <div className="h-1 w-2 rounded-[1px] bg-amber-300" />
                                                <div className="h-2.5 w-2 rounded-[1px] bg-amber-200" />
                                                <div className="h-2 w-2 rounded-[1px] bg-amber-300" />
                                                <div className="h-1.5 w-2 rounded-[1px] bg-amber-400" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <span className="text-foreground-secondary text-mini ml-[-12px] w-full text-left">
                                    {item.label}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Floating calendar preview */}
                <div className="absolute top-30 right-1/10 z-10 md:right-1/30">
                    <div
                        className="min-w-[240px] rounded-xl border-1 border-purple-400 bg-black p-4"
                        style={{ fontSize: '0.6rem' }}
                    >
                        {/* Calendar header */}
                        <div className="mx-2 mb-3 flex items-center justify-between">
                            <Icons.ArrowLeft className="text-foreground-primary h-4 w-4" />
                            <div className="flex gap-1">
                                <button className="text-foreground-primary flex items-center rounded bg-zinc-900 px-2 py-0.5 text-xs">
                                    {new Date().toLocaleString('default', { month: 'short' })}
                                    <svg width="8" height="8" className="ml-1">
                                        <path
                                            d="M2 3l2 2 2-2"
                                            stroke="white"
                                            strokeWidth="1"
                                            fill="none"
                                        />
                                    </svg>
                                </button>
                                <button className="text-foreground-primary flex items-center rounded bg-zinc-900 px-2 py-0.5 text-xs">
                                    {new Date().getFullYear()}
                                    <svg width="8" height="8" className="ml-1">
                                        <path
                                            d="M2 3l2 2 2-2"
                                            stroke="white"
                                            strokeWidth="1"
                                            fill="none"
                                        />
                                    </svg>
                                </button>
                            </div>
                            <Icons.ArrowRight className="text-foreground-primary h-4 w-4" />
                        </div>
                        {/* Calendar grid */}
                        <div className="mb-2 grid cursor-pointer grid-cols-7 gap-[2px] text-center text-xs text-zinc-400">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, index) => (
                                <div key={`main-${d}-${index}`}>{d}</div>
                            ))}
                        </div>
                        <div className="grid cursor-pointer grid-cols-7 gap-[2px] text-center">
                            {(() => {
                                const today = new Date();
                                const currentMonth = today.getMonth();
                                const currentYear = today.getFullYear();
                                const firstDay = new Date(currentYear, currentMonth, 1);
                                const lastDay = new Date(currentYear, currentMonth + 1, 0);
                                const daysInMonth = lastDay.getDate();
                                const startingDay = firstDay.getDay();

                                return Array.from({ length: 42 }, (_, i) => {
                                    const day = i - startingDay + 1;
                                    const isToday =
                                        day === today.getDate() &&
                                        currentMonth === today.getMonth() &&
                                        currentYear === today.getFullYear();

                                    if (day < 1 || day > daysInMonth) return <div key={i}></div>;

                                    return (
                                        <div
                                            key={i}
                                            className={
                                                `rounded-full py-[2px] text-xs ` +
                                                (isToday
                                                    ? 'bg-white font-bold text-black'
                                                    : 'text-zinc-200 hover:bg-zinc-800')
                                            }
                                        >
                                            {day}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex w-full flex-row items-start gap-8">
                {/* Icon + Title */}
                <div className="flex w-1/2 flex-col items-start">
                    <div className="mb-2">
                        <Icons.Component className="text-foreground-primary h-6 w-6" />
                    </div>
                    <span className="text-foreground-primary text-largePlus font-light">
                        Components
                    </span>
                </div>
                {/* Description */}
                <p className="text-foreground-secondary text-regular w-1/2 text-balance">
                    Customize reusable components that you can swap-out across websites.
                </p>
            </div>
        </div>
    );
}
