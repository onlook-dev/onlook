import { Button } from '@onlook/ui/button';
import { Card, CardContent, CardHeader } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import { Input } from '@onlook/ui/input';
import { useState } from 'react';

export const PromptCreation = () => {
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = (value: string) => {
        console.log(value);
    };

    return (
        <div className="flex items-center justify-center p-4">
            {/* Background placeholder */}
            <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-foreground-tertiary to-background"></div>
            {/* Logo */}
            <div className="absolute top-16 left-16 w-full">
                <Icons.OnlookTextLogo />
            </div>
            {/* Content */}
            <Card className="w-full max-w-2xl  mb-32">
                <CardHeader>
                    <h2 className="text-2xl">What kind of website do you want to make?</h2>
                    <p className="text-sm text-foreground-secondary">
                        Paste a link, imagery, or more as inspiration for your next site
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-3">
                        <Input
                            className="w-full"
                            placeholder="Paste a link, imagery, or more as inspiration"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSubmit(inputValue);
                                }
                            }}
                        />
                        <div className="flex justify-end gap-2 w-full">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-500 hover:text-gray-400 hover:bg-gray-800/70"
                            >
                                <Icons.Image className="h-5 w-5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-gray-500 hover:text-gray-400 hover:bg-gray-800/70 mr-auto"
                            >
                                <Icons.Link className="h-5 w-5" />
                            </Button>
                            <Button
                                className="bg-white/10 hover:bg-white/20 text-white"
                                onClick={() => handleSubmit(inputValue)}
                            >
                                <Icons.ArrowRight className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PromptCreation;
