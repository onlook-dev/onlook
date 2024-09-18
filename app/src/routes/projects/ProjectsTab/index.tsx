import { Button } from '@/components/ui/button';
import { DotsVerticalIcon, Pencil2Icon } from '@radix-ui/react-icons';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import EmblaCarousel from './Carousel';

export function ProjectsTab() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [direction, setDirection] = useState(0);

    const slides = [
        { id: 0, imgSrc: 'https://picsum.photos/id/237/200/300', title: 'Airbnb.com' },
        { id: 1, imgSrc: 'https://picsum.photos/id/238/300/200', title: 'Netflix Clone' },
        { id: 2, imgSrc: 'https://picsum.photos/id/239/500/500', title: 'Personal Portfolio' },
    ];

    const handleSlideChange = (index: number) => {
        if (currentSlide === index) {
            return;
        }
        setDirection(index > currentSlide ? 1 : -1);
        setCurrentSlide(index);
    };

    const variants = {
        enter: (direction: number) => ({
            y: direction > 0 ? 20 : -20,
            opacity: 0,
        }),
        center: {
            y: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            y: direction < 0 ? 20 : -20,
            opacity: 0,
        }),
    };

    return (
        <div className="flex h-[calc(100vh-5.5rem)] w-full">
            <div className="w-3/5">
                <EmblaCarousel slides={slides} onSlideChange={handleSlideChange} />
            </div>
            <div className="w-2/5 flex flex-col justify-center items-start p-4 gap-6">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.p
                        key={currentSlide}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.3 }}
                        className="inline-block text-text-active text-title1"
                    >
                        {slides[currentSlide].title}
                    </motion.p>
                </AnimatePresence>
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
                    <Button size="default" variant={'ghost'} className="gap-2 w-full lg:w-auto">
                        <DotsVerticalIcon />
                        <p> Project settings</p>
                    </Button>
                </div>
            </div>
        </div>
    );
}
