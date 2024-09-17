import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import useEmblaCarousel from 'embla-carousel-react';
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
import React, { useCallback, useEffect, useRef, useState } from 'react';

type CarouselProps = {
    slides: { id: number; imgSrc: string; title: string }[];
};

const EmblaCarousel: React.FC<CarouselProps> = ({ slides }) => {
    const [emblaRef, emblaApi] = useEmblaCarousel(
        {
            axis: 'y',
            loop: false,
            align: 'center',
            dragFree: false,
            skipSnaps: false,
            containScroll: 'trimSnaps',
        },
        [WheelGesturesPlugin()],
    );
    const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
    const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

    const onSelect = useCallback(() => {
        if (!emblaApi) {
            return;
        }
        setPrevBtnEnabled(emblaApi.canScrollPrev());
        setNextBtnEnabled(emblaApi.canScrollNext());
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

    const calculateImageSize = (imageNaturalWidth: number, imageNaturalHeight: number) => {
        if (!containerRef.current) {
            return { width: 'auto', height: 'auto' };
        }

        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        const targetSize = Math.min(containerWidth, containerHeight) * 0.6;

        const imageAspectRatio = imageNaturalWidth / imageNaturalHeight;
        const containerAspectRatio = containerWidth / containerHeight;

        if (imageAspectRatio > containerAspectRatio) {
            return { width: targetSize, height: 'auto' };
        } else {
            return { width: 'auto', height: targetSize };
        }
    };

    return (
        <div className="embla relative h-full overflow-hidden" ref={containerRef}>
            <div className="embla__viewport h-full" ref={emblaRef}>
                <div className="embla__container h-full">
                    {slides.map((slide) => (
                        <div
                            key={slide.id}
                            className="embla__slide h-full relative flex items-center justify-center"
                            style={{
                                flex: '0 0 100%',
                                minWidth: 0,
                            }}
                        >
                            <img
                                src={slide.imgSrc}
                                alt={slide.title}
                                className="rounded-lg object-contain"
                                style={{
                                    maxWidth: '60%',
                                    maxHeight: '60%',
                                }}
                                onLoad={(e) => {
                                    const img = e.target as HTMLImageElement;
                                    const { width, height } = calculateImageSize(
                                        img.naturalWidth,
                                        img.naturalHeight,
                                    );
                                    img.style.width =
                                        typeof width === 'number' ? `${width}px` : width;
                                    img.style.height =
                                        typeof height === 'number' ? `${height}px` : height;
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>
            <div className="embla__buttons absolute left-24 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 z-10">
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
