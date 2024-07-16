import supabase from '@/lib/backend';
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
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group';
import { useToast } from '../ui/use-toast';

function FeedbackDialog() {
    const [mood, setMood] = useState('');
    const [comment, setComment] = useState('');
    const [error, setError] = useState('');
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    function clearContent() {
        setMood('');
        setComment('');
        setError('');
    }

    async function handleSubmit() {
        try {
            if (!supabase) {
                throw new Error('No backend connected');
            }
            const { data, error } = await supabase.from('feedback').insert([
                {
                    mood,
                    comment,
                },
            ]);
            if (error) {
                throw error.message;
            }
            setOpen(false);
            clearContent();
            toast({
                title: 'Feedback submitted 🎉',
                description: 'Thank you for helping us improve the product!',
            });
        } catch (error: any) {
            console.error('Error submitting feedback:', error);
            setError('Error submitting feedback: ' + error.message || error);
        }
    }
    return (
        <AlertDialog open={open}>
            <AlertDialogTrigger asChild>
                <div className="flex ml-1 mr-2 rounded-sm bg-gradient-to-r p-[1px] from-[#6EE7B7] via-[#3B82F6] to-[#9333EA]">
                    <Button
                        size={'sm'}
                        variant={'ghost'}
                        className="h-6 relative bg-black text-white rounded-sm"
                        onClick={() => setOpen(true)}
                    >
                        Feedback
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
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                ></Textarea>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <AlertDialogFooter>
                    <AlertDialogCancel
                        onClick={() => {
                            setOpen(false);
                            setError('');
                        }}
                    >
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction disabled={!mood && !comment} onClick={handleSubmit}>
                        Submit
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default FeedbackDialog;
