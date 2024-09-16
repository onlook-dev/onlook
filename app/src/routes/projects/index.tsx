import { Button } from '@/components/ui/button';
import { DotsVerticalIcon, Pencil2Icon } from '@radix-ui/react-icons';

export default function Projects() {
    return (
        <div className="flex h-[calc(100vh-2.5rem)] w-full relative">
            <div className="absolute top-0 w-full h-8 flex justify-center items-center px-32">
                <div className="bg-bg h-full w-48"> </div>
                <div className="bg-bg mx-auto h-full w-48"> </div>
                <div className="bg-bg h-full w-48"> </div>
            </div>
            <div className="w-3/5 h-full"> </div>
            <div className="w-2/5 h-full flex flex-col justify-center items-start p-20 gap-4 font-light">
                <p className="text-text-active text-4xl ">Airbnb.com</p>
                <div className="text-text flex gap-7 text-sm">
                    <p>Last edited 3 days ago </p>
                    <p className="w-36"> localhost: 3000 </p>
                </div>
                <div className="flex gap-4">
                    <Button
                        size="default"
                        variant={'outline'}
                        className="gap-4 bg-bg-active border border-border-active"
                    >
                        <Pencil2Icon />
                        <p> Edit App </p>
                    </Button>
                    <Button size="default" variant={'ghost'} className="gap-4">
                        <DotsVerticalIcon />
                        <p> Project settings</p>
                    </Button>
                </div>
            </div>
        </div>
    );
}
