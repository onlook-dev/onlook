import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from '@storybook/test';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@onlook/ui/select';
import { Apple, Banana, Cherry, Grape } from 'lucide-react';

const meta = {
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    onValueChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[320px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2">Option 2</SelectItem>
        <SelectItem value="option3">Option 3</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithGroups: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Fruits</SelectLabel>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
          <SelectItem value="cherry">Cherry</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Vegetables</SelectLabel>
          <SelectItem value="carrot">Carrot</SelectItem>
          <SelectItem value="broccoli">Broccoli</SelectItem>
          <SelectItem value="spinach">Spinach</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const WithDefaultValue: Story = {
  render: () => (
    <Select defaultValue="option2">
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2">Option 2</SelectItem>
        <SelectItem value="option3">Option 3</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Select disabled>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2">Option 2</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithDisabledItem: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2" disabled>Option 2 (Disabled)</SelectItem>
        <SelectItem value="option3">Option 3</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const SmallSize: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-full" size="sm">
        <SelectValue placeholder="Small select" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option1">Option 1</SelectItem>
        <SelectItem value="option2">Option 2</SelectItem>
        <SelectItem value="option3">Option 3</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const ManyOptions: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a country" />
      </SelectTrigger>
      <SelectContent>
        {[
          'United States',
          'Canada',
          'United Kingdom',
          'Germany',
          'France',
          'Japan',
          'Australia',
          'Brazil',
          'India',
          'China',
          'Mexico',
          'Spain',
          'Italy',
          'Netherlands',
          'Sweden',
        ].map((country) => (
          <SelectItem key={country} value={country.toLowerCase().replace(' ', '-')}>
            {country}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  ),
};
