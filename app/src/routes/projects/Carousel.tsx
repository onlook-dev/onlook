import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import useEmblaCarousel from 'embla-carousel-react';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import React, { useCallback, useEffect, useState } from 'react';

type CarouselProps = {
    slides: { id: number; imgSrc: string; title: string }[];
};

const EmblaCarousel: React.FC<CarouselProps> = ({ slides }) => {
    const [emblaRef, emblaApi] = useEmblaCarousel(
        {
            axis: 'y',
            loop: false,
            align: 'center',
        },
        [WheelGesturesPlugin()],
    );
    const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
    const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [scrollProgress, setScrollProgress] = useState(0);

    const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

    const onSelect = useCallback(() => {
        if (!emblaApi) {
            return;
        }
        setPrevBtnEnabled(emblaApi.canScrollPrev());
        setNextBtnEnabled(emblaApi.canScrollNext());
        setSelectedIndex(emblaApi.selectedScrollSnap());
    }, [emblaApi]);

    const onScroll = useCallback(() => {
        if (!emblaApi) {
            return;
        }
        const progress = emblaApi.scrollProgress();
        setScrollProgress(progress);
    }, [emblaApi]);

    useEffect(() => {
        if (!emblaApi) {
            return;
        }
        onSelect();
        onScroll();
        emblaApi.on('select', onSelect);
        emblaApi.on('scroll', onScroll);
        emblaApi.on('reInit', onSelect);
    }, [emblaApi, onSelect, onScroll]);

    const interpolate = (start: number, end: number, progress: number) => {
        return start + (end - start) * progress;
    };

    return (
        <div className="embla relative h-full overflow-hidden">
            <div className="embla__viewport h-full" ref={emblaRef}>
                <div className="embla__container h-full">
                    {slides.map((slide, index) => {
                        const distance = Math.abs(selectedIndex - index);
                        const progress = 1 - Math.min(distance, 1);
                        const scale = interpolate(0.7, 1, progress);
                        const opacity = interpolate(0.5, 1, progress);
                        const width = interpolate(33.33, 66.67, progress);
                        return (
                            <div
                                key={slide.id}
                                className="embla__slide h-full relative flex items-center justify-center"
                                style={{
                                    flex: '0 0 100%',
                                    minWidth: 0,
                                }}
                            >
                                <div
                                    className="embla__slide__inner bg-cover bg-center transition-all duration-300 ease-in-out"
                                    style={{
                                        backgroundImage: `url(${slide.imgSrc})`,
                                        transform: `scale(${scale})`,
                                        opacity: opacity,
                                        height: '66.67vh',
                                        width: `${width}%`,
                                        margin: 'auto',
                                    }}
                                >
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <h2 className="text-white text-4xl font-bold">
                                            {slide.title}
                                        </h2>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="embla__buttons absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 z-10">
                <button
                    className="embla__button embla__button--prev"
                    onClick={scrollPrev}
                    disabled={!prevBtnEnabled}
                >
                    <ChevronUpIcon
                        className={`w-8 h-8 ${prevBtnEnabled ? 'text-white' : 'text-gray-400'}`}
                    />
                </button>
                <button
                    className="embla__button embla__button--next"
                    onClick={scrollNext}
                    disabled={!nextBtnEnabled}
                >
                    <ChevronDownIcon
                        className={`w-8 h-8 ${nextBtnEnabled ? 'text-white' : 'text-gray-400'}`}
                    />
                </button>
            </div>
        </div>
    );
};

export default EmblaCarousel;
