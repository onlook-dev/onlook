import { Button } from '@/components/ui/button';
import { Label } from "@/components/ui/label";

const EditorTopBar = () => {
    return (
        <div className='flex flex-row w-full h-full justify-center px-1'>
            <div className='flex-grow basis-0'>
                <Button variant='ghost' size="sm" className=''>Actions</Button>
            </div>
            <Label className='my-auto font-normal'>Your Project</Label>
            <div className='flex space-x-2 flex-grow basis-0 justify-end'>
                <Button variant='ghost' size="sm" className=''>Share</Button>
                <Button variant='outline' size="sm" className=''>Publish</Button>
            </div>
        </div>
    );
};
export default EditorTopBar;
