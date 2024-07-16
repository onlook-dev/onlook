import { FaceIcon } from '@radix-ui/react-icons';
import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

function FeedbackDialog() {
    const [mood, setMood] = useState('');
    const [feedback, setFeedback] = useState('');

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <div className="flex mx-2 rounded-sm bg-gradient-to-r p-[1px] from-[#6EE7B7] via-[#3B82F6] to-[#9333EA]">
                    <Button
                        size={'sm'}
                        variant={'ghost'}
                        className="h-6 relative bg-black text-white rounded-sm"
                    >
                        <FaceIcon className="w-3 h-3 mr-2" />
                        Give Feedback
                    </Button>
                </div>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader className="flex flex-col items">
                    <AlertDialogTitle className="text-center">
                        Tell us what you think
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        Thank you for helping us improve the product!
                        <br />
                        We read every feedback carefully.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <ToggleGroup
                    size="sm"
                    type="single"
                    className="flex flex-col"
                    variant={'outline'}
                    value={mood}
                    onValueChange={(value) => setMood(value)}
                >
                    <ToggleGroupItem className="pl-[30%] justify-start" value="like">
                        😀 <p className="ml-4">I like something</p>
                    </ToggleGroupItem>
                    <ToggleGroupItem className="pl-[30%] justify-start" value="dislike">
                        😠 <p className="ml-4">{"I don't like something"}</p>
                    </ToggleGroupItem>
                    <ToggleGroupItem className="pl-[30%] justify-start" value="suggestion">
                        💡 <p className="ml-4">I have a suggestion</p>
                    </ToggleGroupItem>
                </ToggleGroup>
                <Textarea
                    placeholder="Write your feedback here"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                ></Textarea>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        disabled={!mood && !feedback}
                        onClick={() => {
                            console.log({ mood, feedback });
                        }}
                    >
                        Submit
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default FeedbackDialog;
