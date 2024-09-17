import TopBar from './TopBar';
import EmblaCarousel from './Carousel';
import { Button } from '@/components/ui/button';
import { DotsVerticalIcon, Pencil2Icon } from '@radix-ui/react-icons';

export default function Projects() {
    const slides = [
        { id: 0, imgSrc: 'https://picsum.photos/id/237/200/300', title: '0' },
        { id: 1, imgSrc: 'https://picsum.photos/id/238/300/200', title: '1' },
        { id: 2, imgSrc: 'https://picsum.photos/id/239/500/500', title: '2' },
    ];

    return (
        <div className="relative h-screen w-full">
            <TopBar />
            <div className="h-full w-full">
                <div className="flex h-full w-full">
                    <div className="w-3/5 h-full flex items-center">
                        <div className="w-full h-4/5">
                            {' '}
                            {/* Reduced height to 80% */}
                            <EmblaCarousel slides={slides} />
                        </div>
                    </div>
                    <div className="w-2/5 h-full flex flex-col justify-center items-start p-4 gap-6">
                        <p className="text-text-active text-title1 ">Airbnb.com</p>
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
