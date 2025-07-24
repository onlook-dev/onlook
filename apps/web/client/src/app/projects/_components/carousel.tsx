import { getFileUrlFromStorage } from '@/utils/supabase/client';
import { STORAGE_BUCKETS } from '@onlook/constants';
import type { Project } from '@onlook/models';
import { Icons } from '@onlook/ui/icons';
import type { EmblaCarouselType, EmblaEventType } from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, type Variants } from 'motion/react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EditAppButton } from './edit-app';

interface CarouselProps {
    slides: Project[];
    onSlideChange: (index: number) => void;
}

const numberWithinRange = (number: number, min: number, max: number): number =>
    Math.min(Math.max(number, min), max);

export const Carousel: React.FC<CarouselProps> = ({ slides, onSlideChange }) => {
    const WHEEL_SENSITIVITY = 13;
    const SCROLL_COOLDOWN = 50;
    const TWEEN_FACTOR_BASE = 0.3;

    const tweenFactor = useRef(0);
    const tweenNodes = useRef<HTMLElement[]>([]);
    const scrollTimeout = useRef<Timer | null>(null);

    const [isScrolling, setIsScrolling] = useState(false);
    const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
    const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [previewImages, setPreviewImages] = useState<{ [key: string]: string }>({});

    const containerVariants: Variants = {
        rest: { opacity: 0, transition: { ease: 'easeIn', duration: 0.2 } },
        hover: {
            opacity: 1,
            transition: {
                duration: 0.3,
                ease: 'easeOut',
            },
        },
    };

    const buttonVariants: Variants = {
        rest: { opacity: 0, y: -5, transition: { ease: 'easeIn', duration: 0.2 } },
        hover: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.3,
                type: 'tween',
                ease: 'easeOut',
            },
        },
    };

    const [emblaRef, emblaApi] = useEmblaCarousel({
        axis: 'y',
        loop: false,
        align: 'center',
        containScroll: 'trimSnaps',
        skipSnaps: false,
        dragFree: false,
    });

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
                if (slide.metadata.previewImg) {
                    const img = await getFileUrlFromStorage(STORAGE_BUCKETS.PREVIEW_IMAGES, slide.metadata.previewImg.storagePath?.path ?? '');
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

    const setTweenNodes = useCallback((emblaApi: EmblaCarouselType): void => {
        tweenNodes.current = emblaApi.slideNodes().map((slideNode) => {
            return slideNode as HTMLElement;
        });
    }, []);

    const setTweenFactor = useCallback((emblaApi: EmblaCarouselType) => {
        tweenFactor.current = TWEEN_FACTOR_BASE * emblaApi.scrollSnapList().length;
    }, []);

    const tweenScale = useCallback((emblaApi: EmblaCarouselType, eventName?: EmblaEventType) => {
        const engine = emblaApi.internalEngine();
        const scrollProgress = emblaApi.scrollProgress();
        const slidesInView = emblaApi.slidesInView();
        const isScrollEvent = eventName === 'scroll';

        emblaApi.scrollSnapList().forEach((scrollSnap, snapIndex) => {
            let diffToTarget = scrollSnap - scrollProgress;
            const slidesInSnap = engine.slideRegistry[snapIndex];

            slidesInSnap?.forEach((slideIndex) => {
                if (isScrollEvent && !slidesInView.includes(slideIndex)) {
                    return;
                }

                if (engine.options.loop) {
                    engine.slideLooper.loopPoints.forEach((loopItem) => {
                        const target = loopItem.target();

                        if (slideIndex === loopItem.index && target !== 0) {
                            const sign = Math.sign(target);

                            if (sign === -1) {
                                diffToTarget = scrollSnap - (1 + scrollProgress);
                            }
                            if (sign === 1) {
                                diffToTarget = scrollSnap + (1 - scrollProgress);
                            }
                        }
                    });
                }

                const tweenValue = 1 - Math.abs(diffToTarget * tweenFactor.current);
                const scale = numberWithinRange(tweenValue, 0, 1).toString();
                const tweenNode = tweenNodes.current[slideIndex];
                if (tweenNode) {
                    tweenNode.style.transform = `scale(${scale})`;
                }
            });
        });
    }, []);

    useEffect(() => {
        if (!emblaApi) {
            return;
        }

        setTweenNodes(emblaApi);
        setTweenFactor(emblaApi);
        tweenScale(emblaApi);

        emblaApi
            .on('reInit', setTweenNodes)
            .on('reInit', setTweenFactor)
            .on('reInit', tweenScale)
            .on('scroll', tweenScale)
            .on('slideFocus', tweenScale);
    }, [emblaApi, tweenScale]);

    const debouncedScroll = useCallback(
        (deltaY: number) => {
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }
            scrollTimeout.current = setTimeout(() => {
                setIsScrolling(false);
            }, SCROLL_COOLDOWN);

            if (isScrolling) {
                return;
            }
            setIsScrolling(true);

            if (deltaY > 0) {
                scrollNext();
            } else {
                scrollPrev();
            }
        },
        [isScrolling, scrollNext, scrollPrev],
    );

    const handleWheel = useCallback(
        (e: React.WheelEvent) => {
            if (Math.abs(e.deltaY) > WHEEL_SENSITIVITY) {
                debouncedScroll(e.deltaY);
            }
        },
        [debouncedScroll],
    );

    useEffect(() => {
        return () => {
            if (scrollTimeout.current) {
                clearTimeout(scrollTimeout.current);
            }
        };
    }, []);

    return (
        <div className="embla relative h-full overflow-hidden" style={{ zIndex: 0 }}>
            <div
                className="embla__viewport h-full absolute inset-0 overflow-hidden pl-[7.5rem]"
                ref={emblaRef}
                style={{
                    transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
                    zIndex: -1,
                }}
            >
                <div
                    className="embla__container flex flex-col h-full items-center px-16"
                    style={{ marginTop: '0' }}
                    onWheel={handleWheel}
                >
                    {slides.map((slide, index) => (
                        <div
                            key={slide.id}
                            className="embla__slide flex items-center justify-center select-none max-h-[70vh]"
                            style={{
                                flex: '0 0 80%',
                                minWidth: 0,
                                transform: 'translate3d(0, 0, 0)',
                                marginTop: index === 0 ? '6rem' : '-3rem',
                                marginBottom: index === slides.length - 1 ? '6rem' : '-3rem',
                                opacity: index === currentIndex ? 1 : 0.6,
                                zIndex: index === currentIndex ? 2 : 1,
                            }}
                        >
                            <div className="relative bg-background">
                                {previewImages[slide.id] ? (
                                    <img
                                        src={previewImages[slide.id] ?? ''}
                                        alt={slide.name}
                                        className="rounded-lg object-cover max-w-full max-h-[80vh] bg-foreground border-[0.5px]"
                                    />
                                ) : (
                                    <div className="w-[30rem] h-[40rem] rounded-lg bg-gradient-to-t from-gray-800/40 via-gray-500/40 to-gray-400/40 border-gray-500 border-[0.5px]" />
                                )}
                                <motion.div
                                    initial="rest"
                                    whileHover="hover"
                                    animate="rest"
                                    variants={containerVariants}
                                    className="rounded-lg absolute inset-0 flex items-center justify-center z-10 bg-background/30"
                                >
                                    <EditAppButton variants={buttonVariants} project={slide} />
                                </motion.div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-secondary/20 backdrop-blur p-2 rounded-lg embla__buttons absolute left-14 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 z-10 items-center">
                <button
                    className="embla__button embla__button--prev"
                    onClick={scrollPrev}
                    disabled={!prevBtnEnabled}
                >
                    <Icons.ChevronUp
                        className={`w-7 h-7 transition duration-300 ease-in-out ${prevBtnEnabled ? 'text-foreground' : 'text-muted'}`}
                    />
                </button>
                <div className="flex flex-row space-x-1 text-foreground items-center justify-center min-w-[50px]">
                    <span className="text-active">{currentIndex + 1}</span>
                    <span className="text-sm text-gray-500"> of </span>
                    <span className="text-active">{slides.length}</span>
                </div>
                <button
                    className="embla__button embla__button--next"
                    onClick={scrollNext}
                    disabled={!nextBtnEnabled}
                >
                    <Icons.ChevronDown
                        className={`w-7 h-7 transition duration-300 ease-in-out ${nextBtnEnabled ? 'text-foreground' : 'text-muted'}`}
                    />
                </button>
            </div>
        </div>
    );
};
