import { Icons } from '@onlook/ui/icons';
import React from 'react';

export function ComponentsBlock() {
    return (
        <div className="flex flex-col gap-4">
            {/* Custom Components Menu + Calendar Preview */}
            <div className="flex flex-row gap-8 relative min-h-[400px] overflow-hidden bg-background-onlook/80 rounded-lg">
                {/* Left menu container with grey background and overflow hidden */}
                <div className="w-56 h-100 rounded-xl overflow-hidden absolute lg:left-1/20 md:left-1/30 left-1/8 top-12 flex flex-col items-center justify-start bg-black border-[0.5px] border-foreground-primary/20">
                    <p className="text-foreground-primary text-regular font-light w-full text-left px-3 py-2 border-b-[0.5px] border-foreground-primary/20">Components</p>
                    <div className="grid grid-cols-2 grid-rows-3 gap-6 w-full h-full p-4">
                        {[
                            { label: 'Calendar', selected: true },
                            { label: 'Card', selected: false },
                            { label: 'Carousel', selected: false },                            
                            { label: 'Chart', selected: false },
                            { label: 'Table', selected: false },
                            { label: 'Weather', selected: false },
                            
                        ].map((item, idx) => (
                            <div key={item.label} className="flex flex-col items-center w-full">
                                <div
                                    className={
                                        `w-24 h-24 rounded-xs mb-1.5 flex items-center justify-center bg-background-secondary transition-all ` +
                                        (item.selected
                                            ? 'outline outline-1 outline-purple-400 outline-offset-2'
                                            : '')
                                    }
                                >
                                    {/* Custom component previews */}
                                    {item.label === 'Calendar' && (
                                        <div className="w-16 h-fit bg-black rounded-[4px] p-1.5 select-none" style={{ fontSize: '3px' }}>
                                            {/* Mini calendar header */}
                                            <div className="flex items-center justify-between mb-1 mx-0.5">
                                                <Icons.ArrowLeft className="w-1 h-1 text-foreground-primary" />
                                                <div className="flex gap-0.5">
                                                    <div className="px-0.5 py-0.5 rounded-[1px] bg-zinc-800 text-white text-[3px]">
                                                        {new Date().toLocaleString('default', { month: 'short' })}
                                                    </div>
                                                    <div className="px-0.5 py-0.5 rounded-[1px] bg-zinc-800 text-white text-[3px]">
                                                        {new Date().getFullYear()}
                                                    </div>
                                                </div>
                                                <Icons.ArrowRight className="w-1 h-1 text-foreground-primary" />
                                            </div>
                                            {/* Mini calendar grid */}
                                            <div className="grid grid-cols-7 gap-[0.5px] text-center text-zinc-500 text-[3px] mb-0.5">
                                                {["S","M","T","W","T","F","S"].map((d, index) => <div key={`mini-${d}-${index}`}>{d}</div>)}
                                            </div>
                                            <div className="grid grid-cols-7 gap-[0.5px] text-center">
                                                {(() => {
                                                    const today = new Date();
                                                    const currentMonth = today.getMonth();
                                                    const currentYear = today.getFullYear();
                                                    const firstDay = new Date(currentYear, currentMonth, 1);
                                                    const lastDay = new Date(currentYear, currentMonth + 1, 0);
                                                    const daysInMonth = lastDay.getDate();
                                                    const startingDay = firstDay.getDay();
                                                    
                                                    return Array.from({length: 35}, (_,i) => {
                                                        const day = i - startingDay + 1;
                                                        const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                                                        
                                                        if (day < 1 || day > daysInMonth) return <div key={i}></div>;
                                                        
                                                        return (
                                                            <div
                                                                key={i}
                                                                className={`py-[0.5px] rounded-[4px] text-[3px] ${
                                                                    isToday ? 'bg-white text-black font-bold' : 'text-zinc-300'
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
                                        <div className="w-18 h-18 bg-black rounded-[4px] p-1.5 flex flex-col gap-[1.5px] select-none" style={{ fontSize: '3.5px' }}>
                                            {/* Header */}
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="text-white font-semibold">Login</span>
                                                <span className="text-zinc-400">Sign Up</span>
                                            </div>
                                            <span className="text-zinc-400 mb-0.5">Enter your email below</span>
                                            {/* Email field */}
                                            <div className="text-zinc-400 mb-0.5">Email</div>
                                            <div className="w-full h-2 bg-zinc-800 rounded-[1px] flex items-center px-0.5 text-zinc-500">m@example.com</div>
                                            {/* Password field */}
                                            <div className="flex items-center justify-between mt-0.5">
                                                <span className="text-zinc-400">Password</span>
                                                <span className="text-zinc-500">Forgot?</span>
                                            </div>
                                            <div className="w-full h-2 bg-zinc-800 rounded-[1px] mb-0.5"></div>
                                            {/* Login button */}
                                            <div className="w-full h-2 bg-white rounded-[1px] text-black flex items-center justify-center font-semibold mb-0.5">Login</div>
                                            {/* Google button */}
                                            <div className="w-full h-2 bg-zinc-900 rounded-[1px] text-white flex items-center justify-center">Login with Google</div>
                                        </div>
                                    )}
                                    {item.label === 'Carousel' && (
                                        <div className="w-20 h-20 bg-transparent flex items-center justify-center select-none">
                                            {/* Left arrow button */}
                                            <div className="w-4 h-4 rounded-full bg-black border-[0.25px] border-foreground-tertiary/50 flex items-center justify-center mr-1">
                                                <Icons.ArrowLeft className="w-1 h-1 text-foreground-primary" />
                                            </div>
                                            {/* Center slide */}
                                            <div className="w-12 h-12 bg-black rounded-[6px] flex items-center justify-center border-[0.25px] border-foreground-tertiary/50">
                                                <span className="text-white text-[10px] font-light">2</span>
                                            </div>
                                            {/* Right arrow button */}
                                            <div className="w-4 h-4 rounded-full bg-black border-[0.25px] border-foreground-tertiary/50 flex items-center justify-center ml-1">
                                                <Icons.ArrowRight className="w-1 h-1 text-foreground-primary" />
                                            </div>
                                        </div>
                                    )}
                                    {item.label === 'Chart' && (
                                        <div className="w-18 h-16 bg-black rounded-[4px] p-0.5 flex flex-col select-none overflow-hidden relative">
                                            {/* Header */}
                                            <div className="px-1 pt-1 pb-0.5">
                                                <div className="text-white text-[4.5px] font-semibold leading-none mb-1">Bar Chart</div>
                                                <div className="text-zinc-400 text-[3.2px] leading-none">Visitors last 3 months</div>
                                            </div>
                                            {/* Chart area */}
                                            <div className="flex-1 flex flex-col justify-end relative">
                                                {/* Grid lines */}
                                                <div className="absolute left-0 right-0 top-[30%] h-[1px] bg-zinc-700/40" style={{zIndex:1}}></div>
                                                <div className="absolute left-0 right-0 top-[60%] h-[1px] bg-zinc-700/40" style={{zIndex:1}}></div>
                                                {/* Bars */}
                                                <div className="absolute left-0 right-0 bottom-0 flex items-end w-full gap-[0.5px] px-1 py-1 z-10" style={{height:'calc(100% - 15px)'}}>
                                                    {[
                                                        8, 15, 6, 18, 13, 10, 17, 7, 19, 12, 5, 16, 14, 9, 18, 11, 8, 17, 6, 15,
                                                        12, 14, 10, 6, 7, 18, 13, 9, 1, 11, 17, 8, 14, 6, 19, 14, 14, 9, 20, 10,
                                                        13, 15, 9, 17, 8, 12, 14, 6, 18, 11
                                                    ].map((h, i) => (
                                                        <div
                                                            key={i}
                                                            className="bg-teal-300 rounded-[1px]"
                                                            style={{ width: '1.2px', height: `${h * 1.6}px` }}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {item.label === 'Table' && (
                                        <div className="w-16 h-16 bg-black rounded-[4px] p-0.5 select-none" >
                                            <div className="grid grid-cols-3 gap-[1px] text-[3px] text-zinc-300">
                                                <div className="bg-background-onlook p-1 rounded-[1px]">Name</div>
                                                <div className="bg-background-onlook p-1 rounded-[1px]">Age</div>
                                                <div className="bg-background-onlook p-1 rounded-[1px]">City</div>
                                                <div className="bg-background-onlook p-1 rounded-[1px]">John</div>
                                                <div className="bg-background-onlook p-1 rounded-[1px]">25</div>
                                                <div className="bg-background-onlook p-1 rounded-[1px]">NYC</div>
                                                <div className="bg-background-onlook p-1 rounded-[1px]">Jane</div>
                                                <div className="bg-background-onlook p-1 rounded-[1px]">30</div>
                                                <div className="bg-background-onlook p-1 rounded-[1px]">LA</div>
                                            </div>
                                        </div>
                                    )}
                                    {item.label === 'Weather' && (
                                        <div className="w-16 h-16 bg-black rounded-[4px] p-1 flex flex-col items-center select-none relative overflow-hidden">
                                            {/* Sun icon */}
                                            <div className="flex items-center justify-center w-full mt-2">
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
                                                <div className="text-white text-[15px] font-light ml-1">72°</div>
                                            </div>
                                            {/* Forecast bar */}
                                            <div className="flex gap-[1px] w-full justify-center mb-1 mt-2">
                                                <div className="w-2 h-1.5 bg-amber-400 rounded-[1px]" />
                                                <div className="w-2 h-1 bg-amber-300 rounded-[1px]" />
                                                <div className="w-2 h-2.5 bg-amber-200 rounded-[1px]" />
                                                <div className="w-2 h-2 bg-amber-300 rounded-[1px]" />
                                                <div className="w-2 h-1.5 bg-amber-400 rounded-[1px]" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <span className="text-foreground-secondary text-mini text-left w-full ml-[-12px]">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Floating calendar preview */}
                <div className="absolute md:right-1/30 right-1/10 top-30 z-10">
                    <div className="rounded-xl border-1 border-purple-400 bg-black p-4 min-w-[240px]" style={{ fontSize: '0.6rem' }}>
                        {/* Calendar header */}
                        <div className="flex items-center justify-between mb-3 mx-2">
                        <Icons.ArrowLeft className="w-4 h-4 text-foreground-primary" />
                            <div className="flex gap-1">
                                <button className="px-2 py-0.5 rounded bg-zinc-900 text-foreground-primary text-xs flex items-center">
                                    {new Date().toLocaleString('default', { month: 'short' })} 
                                    <svg width='8' height='8' className='ml-1'><path d='M2 3l2 2 2-2' stroke='white' strokeWidth='1' fill='none'/></svg>
                                </button>
                                <button className="px-2 py-0.5 rounded bg-zinc-900 text-foreground-primary text-xs flex items-center">
                                    {new Date().getFullYear()} 
                                    <svg width='8' height='8' className='ml-1'><path d='M2 3l2 2 2-2' stroke='white' strokeWidth='1' fill='none'/></svg>
                                </button>
                            </div>
                            <Icons.ArrowRight className="w-4 h-4 text-foreground-primary" />
                        </div>
                        {/* Calendar grid */}
                        <div className="grid grid-cols-7 gap-[2px] text-center text-zinc-400 text-xs mb-2 cursor-pointer">
                            {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d, index) => <div key={`main-${d}-${index}`}>{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-[2px] text-center cursor-pointer">
                            {(() => {
                                const today = new Date();
                                const currentMonth = today.getMonth();
                                const currentYear = today.getFullYear();
                                const firstDay = new Date(currentYear, currentMonth, 1);
                                const lastDay = new Date(currentYear, currentMonth + 1, 0);
                                const daysInMonth = lastDay.getDate();
                                const startingDay = firstDay.getDay();
                                
                                return Array.from({length: 42}, (_,i) => {
                                    const day = i - startingDay + 1;
                                    const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
                                    
                                    if (day < 1 || day > daysInMonth) return <div key={i}></div>;
                                    
                                    return (
                                        <div
                                            key={i}
                                            className={
                                                `py-[2px] rounded-full text-xs ` +
                                                (isToday ? 'bg-white text-black font-bold' : 'hover:bg-zinc-800 text-zinc-200')
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
            <div className="flex flex-row items-start gap-8 w-full">
                {/* Icon + Title */}
                <div className="flex flex-col items-start w-1/2">
                    <div className="mb-2"><Icons.Component className="w-6 h-6 text-foreground-primary" /></div>
                    <span className="text-foreground-primary text-largePlus font-light">Components</span>
                </div>
                {/* Description */}
                <p className="text-foreground-secondary text-regular text-balance w-1/2">Customize reusable components that you can swap-out across websites.</p>
            </div>
        </div>
    );
} 