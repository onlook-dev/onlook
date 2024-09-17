import React, { useState, useEffect } from 'react';
import TopBar from './TopBar';
import EmblaCarousel from './Carousel';
import { Button } from '@/components/ui/button';
import { DotsVerticalIcon, Pencil2Icon } from '@radix-ui/react-icons';

export default function Projects() {
    const slides = [
        { id: 0, imgSrc: 'https://picsum.photos/id/237/200/300', title: 'Airbnb.com' },
        { id: 1, imgSrc: 'https://picsum.photos/id/238/300/200', title: 'Netflix Clone' },
        { id: 2, imgSrc: 'https://picsum.photos/id/239/500/500', title: 'Personal Portfolio' },
    ];

    const [currentSlide, setCurrentSlide] = useState(0);

    const handleSlideChange = (index: number) => {
        setCurrentSlide(index);
    };

    return (
        <div className="relative h-[calc(100vh-10.5rem)] w-full">
            <TopBar />
            <div className="h-[calc(100vh-2.5rem)] w-full">
                {' '}
                {/* Adjusted to account for 40px AppBar */}
                <div className="flex h-[calc(100vh-5.5rem)] w-full">
                    <div className="w-3/5 flex items-center justify-center">
                        <div className="w-full h-[calc(100vh-5.5rem)]">
                            <EmblaCarousel slides={slides} onSlideChange={handleSlideChange} />
                        </div>
                    </div>
                    <div className="w-2/5 h-full flex flex-col justify-center items-start p-4 gap-6">
                        <AnimatedTitle key={currentSlide} title={slides[currentSlide].title} />
                        <div className="text-text flex flex-col md:flex-row gap-2 md:gap-7 text-small">
                            <p>Last edited 3 days ago </p>
                            <p> localhost: 3000</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 w-full">
                            <Button
                                size="default"
                                variant={'outline'}
                                className="gap-2 bg-bg-active border border-border-active w-full lg:w-auto"
                            >
                                <Pencil2Icon />
                                <p> Edit App </p>
                            </Button>
                            <Button
                                size="default"
                                variant={'ghost'}
                                className="gap-2 w-full lg:w-auto"
                            >
                                <DotsVerticalIcon />
                                <p> Project settings</p>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AnimatedTitle({ title }: { title: string }) {
    const [isAnimating, setIsAnimating] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsAnimating(false), 50);
        return () => clearTimeout(timer);
    }, []);

    return (
        <p className="inline-block overflow-hidden text-text-active text-title1">
            {title.split('').map((char, index) => (
                <span
                    key={index}
                    className={`inline-block transition-all duration-500 ease-out`}
                    style={{
                        transitionDelay: `${index * 50}ms`,
                        opacity: isAnimating ? 0 : 1,
                        transform: isAnimating ? 'translateY(20px)' : 'translateY(0)',
                    }}
                >
                    {char}
                </span>
            ))}
        </p>
    );
}
