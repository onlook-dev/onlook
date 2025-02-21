import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@onlook/ui/alert-dialog';
import { Button } from '@onlook/ui/button';
import { Icons } from '@onlook/ui/icons';
import type { StepComponent } from '../withStepProps';

const LoadWarning: StepComponent = ({ props, variant }) => {
    const { prevStep, nextStep } = props;

    const renderHeader = () => (
        <AlertDialogHeader>
            <div className="flex flex-row items-center gap-2">
                <Icons.ExclamationTriangle className="w-5 h-5 text-yellow-500" />
                <AlertDialogTitle>Important: Save Your Changes First</AlertDialogTitle>
            </div>
        </AlertDialogHeader>
    );

    const renderContent = () => (
        <AlertDialogDescription>
            Onlook will modify your project files during import.
            <br />
            <br />
            To prevent losing any work, please either:
            <ul className="list-disc pl-6 mt-2">
                <li>Commit your changes to git, or</li>
                <li>Create a new branch for the import</li>
            </ul>
        </AlertDialogDescription>
    );

    const renderFooter = () => (
        <AlertDialogFooter>
            <Button type="button" onClick={prevStep} variant="ghost">
                Back
            </Button>
            <Button type="button" onClick={nextStep} variant="outline">
                I have saved my changes
            </Button>
        </AlertDialogFooter>
    );

    switch (variant) {
        case 'header':
            return renderHeader();
        case 'content':
            return renderContent();
        case 'footer':
            return renderFooter();
    }
};

LoadWarning.Header = (props) => <LoadWarning props={props} variant="header" />;
LoadWarning.Content = (props) => <LoadWarning props={props} variant="content" />;
LoadWarning.Footer = (props) => <LoadWarning props={props} variant="footer" />;
LoadWarning.Header.displayName = 'LoadWarning.Header';
LoadWarning.Content.displayName = 'LoadWarning.Content';
LoadWarning.Footer.displayName = 'LoadWarning.Footer';

export { LoadWarning };
