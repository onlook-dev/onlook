import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MotionCard } from '@onlook/ui/motion-card';
import { Button } from '@onlook/ui/button';
import { StepHeader, StepContent, StepFooter } from './steps';

const meta = {
  component: StepContent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <MotionCard>
          <Story />
        </MotionCard>
      </div>
    ),
  ],
} satisfies Meta<typeof StepContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <>
      <StepHeader>
        <h2 className="text-lg font-semibold">Step Title</h2>
        <p className="text-sm text-foreground-secondary">Step description goes here</p>
      </StepHeader>
      <StepContent>
        <div className="text-center py-4">
          <p>Step content goes here</p>
        </div>
      </StepContent>
      <StepFooter>
        <Button variant="outline">Back</Button>
        <Button>Continue</Button>
      </StepFooter>
    </>
  ),
};

export const HeaderOnly: Story = {
  render: () => (
    <StepHeader>
      <h2 className="text-lg font-semibold">Import Project</h2>
      <p className="text-sm text-foreground-secondary">Choose how you want to import your project</p>
    </StepHeader>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <StepContent>
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
          <span className="text-2xl">1</span>
        </div>
        <p className="text-foreground-secondary">Select your project folder</p>
      </div>
    </StepContent>
  ),
};

export const FooterOnly: Story = {
  render: () => (
    <StepFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Next Step</Button>
    </StepFooter>
  ),
};

export const ImportFromGitHub: Story = {
  render: () => (
    <>
      <StepHeader>
        <h2 className="text-lg font-semibold">Connect to GitHub</h2>
        <p className="text-sm text-foreground-secondary">Sign in to your GitHub account to import repositories</p>
      </StepHeader>
      <StepContent>
        <div className="flex flex-col items-center gap-4 py-4">
          <Button variant="outline" className="w-full max-w-xs">
            Connect GitHub Account
          </Button>
        </div>
      </StepContent>
      <StepFooter>
        <Button variant="outline">Cancel</Button>
        <Button disabled>Continue</Button>
      </StepFooter>
    </>
  ),
};

export const SelectFolder: Story = {
  render: () => (
    <>
      <StepHeader>
        <h2 className="text-lg font-semibold">Select Project Folder</h2>
        <p className="text-sm text-foreground-secondary">Choose the folder containing your project</p>
      </StepHeader>
      <StepContent>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 w-full text-center">
            <p className="text-foreground-secondary">Drop folder here or click to browse</p>
          </div>
        </div>
      </StepContent>
      <StepFooter>
        <Button variant="outline">Back</Button>
        <Button>Select Folder</Button>
      </StepFooter>
    </>
  ),
};

export const Finalizing: Story = {
  render: () => (
    <>
      <StepHeader>
        <h2 className="text-lg font-semibold">Setting Up Project</h2>
        <p className="text-sm text-foreground-secondary">Please wait while we configure your project</p>
      </StepHeader>
      <StepContent>
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
          <p className="text-foreground-secondary">Installing dependencies...</p>
        </div>
      </StepContent>
      <StepFooter>
        <div />
        <Button disabled>Please wait...</Button>
      </StepFooter>
    </>
  ),
};

export const AllSteps: Story = {
  decorators: [
    (Story) => (
      <div className="w-[600px]">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="flex flex-col gap-8">
      <MotionCard>
        <StepHeader>
          <h2 className="text-lg font-semibold">Step 1: Connect</h2>
        </StepHeader>
        <StepContent>
          <p className="text-center py-4">Connect your account</p>
        </StepContent>
        <StepFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Connect</Button>
        </StepFooter>
      </MotionCard>

      <MotionCard>
        <StepHeader>
          <h2 className="text-lg font-semibold">Step 2: Select</h2>
        </StepHeader>
        <StepContent>
          <p className="text-center py-4">Select your project</p>
        </StepContent>
        <StepFooter>
          <Button variant="outline">Back</Button>
          <Button>Continue</Button>
        </StepFooter>
      </MotionCard>

      <MotionCard>
        <StepHeader>
          <h2 className="text-lg font-semibold">Step 3: Finalize</h2>
        </StepHeader>
        <StepContent>
          <p className="text-center py-4">Finalizing setup</p>
        </StepContent>
        <StepFooter>
          <Button variant="outline">Back</Button>
          <Button>Finish</Button>
        </StepFooter>
      </MotionCard>
    </div>
  ),
};
