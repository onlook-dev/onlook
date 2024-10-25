import { Icons } from '@/components/icons';
import clsx from 'clsx';
import { EmblaCarouselType, EmblaEventType } from 'embla-carousel';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, Variants } from 'framer-motion';
import debounce from 'lodash/debounce';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPreviewImage } from '../../helpers';
import EditAppButton from './EditAppButton';
import { Project } from '/common/models/project';

interface EmblaCarouselProps {
    slides: Project[];
    onSlideChange: (index: number) => void;
}

const TWEEN_FACTOR_BASE = 0.3;

const numberWithinRange = (number: number, min: number, max: number): number =>
    Math.min(Math.max(number, min), max);

const EmblaCarousel: React.FC<EmblaCarouselProps> = ({ slides, onSlideChange }) => {
    const WHEEL_SENSITIVITY = 10;
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
    const tweenFactor = useRef(0);
    const tweenNodes = useRef<HTMLElement[]>([]);
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

            slidesInSnap.forEach((slideIndex) => {
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
                tweenNode.style.transform = `scale(${scale})`;
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
                40,
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
                            className={clsx(
                                { 'opacity-60': index !== currentIndex },
                                'embla__slide relative flex items-center justify-center select-none max-h-[70vh]',
                            )}
                            style={{
                                flex: '0 0 80%',
                                minWidth: 0,
                                transform: 'translate3d(0, 0, 0)',
                                marginTop: index === 0 ? '6rem' : '-3rem',
                                marginBottom: index === slides.length - 1 ? '6rem' : '-3rem',
                            }}
                        >
                            {previewImages[slide.id] ? (
                                <img
                                    src={previewImages[slide.id]}
                                    alt={slide.name}
                                    className="rounded-lg object-cover max-w-full max-h-[80%] bg-foreground border-[0.5px]"
                                />
                            ) : (
                                <div className="w-full h-full rounded-lg bg-gradient-to-t from-gray-800/40 via-gray-500/40 to-gray-400/40 border-gray-500 border-[0.5px]" />
                            )}
                            <motion.div
                                initial="rest"
                                whileHover="hover"
                                animate="rest"
                                variants={containerVariants}
                                className="rounded-lg absolute flex items-center justify-center w-full h-full z-10 bg-background/30 "
                            >
                                <EditAppButton variants={buttonVariants} project={slide} />
                            </motion.div>
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

export default EmblaCarousel;
