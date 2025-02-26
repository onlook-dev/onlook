import { Button } from '@onlook/ui/button';
import { CardTitle } from '@onlook/ui/card';
import { Icons } from '@onlook/ui/icons';
import type { StepComponent } from '../withStepProps';

const LoadWarning: StepComponent = ({ props, variant }) => {
    const { prevStep, nextStep } = props;

    const renderHeader = () => (
        <div className="flex flex-row items-center gap-2">
            <Icons.ExclamationTriangle className="w-5 h-5" />
            <CardTitle>{'Warning: Save your progress'}</CardTitle>
        </div>
    );

    const renderContent = () => (
        <p>
            Onlook will make code changes to your project.
            <br />
            Please save your progress before importing.
        </p>
    );

    const renderFooter = () => (
        <>
            <Button type="button" onClick={prevStep} variant="ghost">
                Back
            </Button>
            <Button type="button" onClick={nextStep} variant="outline">
                I understand
            </Button>
        </>
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
