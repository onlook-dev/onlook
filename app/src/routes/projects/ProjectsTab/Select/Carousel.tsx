import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import useEmblaCarousel from 'embla-carousel-react';
import debounce from 'lodash/debounce';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getPreviewImage } from '../../helpers';
import { Project } from '/common/models/project';

interface EmblaCarouselProps {
    slides: Project[];
    onSlideChange: (index: number) => void;
}

const EmblaCarousel: React.FC<EmblaCarouselProps> = ({ slides, onSlideChange }) => {
    const WHEEL_SENSITIVITY = 10;
    const [emblaRef, emblaApi] = useEmblaCarousel({
        axis: 'y',
        loop: false,
        align: 'center',
        containScroll: 'trimSnaps',
        skipSnaps: false,
        dragFree: false,
    });
    const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
    const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [previewImages, setPreviewImages] = useState<{ [key: string]: string }>({});

    const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

    const onSelect = useCallback(() => {
        if (!emblaApi) {
            return;
        }
        setPrevBtnEnabled(emblaApi.canScrollPrev());
        setNextBtnEnabled(emblaApi.canScrollNext());
        setCurrentIndex(emblaApi.selectedScrollSnap());
        onSlideChange(emblaApi.selectedScrollSnap());
    }, [emblaApi, onSlideChange]);

    useEffect(() => {
        if (!emblaApi) {
            return;
        }
        onSelect();
        emblaApi.on('select', onSelect);
        emblaApi.on('reInit', onSelect);
    }, [emblaApi, onSelect]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                scrollPrev();
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                scrollNext();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [scrollPrev, scrollNext]);

    useEffect(() => {
        const loadPreviewImages = async () => {
            const images: { [key: string]: string } = {};
            for (const slide of slides) {
                if (slide.previewImg) {
                    const img = await getPreviewImage(slide.previewImg);
                    if (img) {
                        images[slide.id] = img;
                    } else {
                        console.error(`Failed to load preview image for slide ${slide.id}`);
                    }
                }
            }
            setPreviewImages(images);
        };
        loadPreviewImages();
    }, [slides]);

    const debouncedScroll = useMemo(
        () =>
            debounce(
                (deltaY: number) => {
                    if (deltaY > 0) {
                        scrollNext();
                    } else {
                        scrollPrev();
                    }
                },
                50,
                { leading: true, trailing: false },
            ),
        [scrollNext, scrollPrev],
    );

    const handleWheel = useCallback(
        (e: React.WheelEvent) => {
            if (Math.abs(e.deltaY) > WHEEL_SENSITIVITY) {
                debouncedScroll(e.deltaY);
            }
        },
        [debouncedScroll],
    );

    return (
        <div
            className="embla relative h-[calc(100vh-5.5rem)] overflow-hidden"
            style={{ zIndex: 0 }}
        >
            <div
                className="embla__viewport h-full absolute inset-0"
                ref={emblaRef}
                style={{
                    transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                    zIndex: -1,
                }}
            >
                <div className="embla__container h-full" onWheel={handleWheel}>
                    {slides.map((slide) => (
                        <div
                            key={slide.id}
                            className="embla__slide h-full relative flex items-center justify-center"
                            style={{
                                flex: '0 0 90%',
                                minWidth: 0,
                                margin: '0 -5%',
                            }}
                        >
                            {previewImages[slide.id] ? (
                                <img
                                    src={previewImages[slide.id]}
                                    alt={slide.name}
                                    className="rounded-lg object-cover max-w-[60%] max-h-[80%] bg-white"
                                />
                            ) : (
                                <div className="w-[60%] h-[80%] rounded-lg bg-gradient-to-t from-gray-800/40 via-gray-500/40 to-gray-400/40 border-gray-500 border-[0.5px]"></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-black/20 backdrop-blur p-2 rounded-lg embla__buttons absolute left-14 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 z-10 items-center">
                <button
                    className="embla__button embla__button--prev"
                    onClick={scrollPrev}
                    disabled={!prevBtnEnabled}
                >
                    <ChevronUpIcon
                        className={`w-7 h-7 transition duration-300 ease-in-out ${prevBtnEnabled ? 'text-white' : 'text-gray-600'}`}
                    />
                </button>
                <div className="flex flex-row space-x-1 text-white items-center justify-center min-w-[50px]">
                    <span className="text-active">{currentIndex + 1}</span>
                    <span className="text-sm text-gray-500"> of </span>
                    <span className="text-active text-active">{slides.length}</span>
                </div>
                <button
                    className="embla__button embla__button--next"
                    onClick={scrollNext}
                    disabled={!nextBtnEnabled}
                >
                    <ChevronDownIcon
                        className={`w-7 h-7 transition duration-300 ease-in-out ${nextBtnEnabled ? 'text-white' : 'text-gray-600'}`}
                    />
                </button>
            </div>
        </div>
    );
};

export default EmblaCarousel;
