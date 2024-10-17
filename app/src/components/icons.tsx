import H1Icon from './Icons/header-level-icons/h1Icon';
import H2Icon from './Icons/header-level-icons/h2Icon';
import H3Icon from './Icons/header-level-icons/h3Icon';
import H4Icon from './Icons/header-level-icons/h4Icon';
import H5Icon from './Icons/header-level-icons/h5Icon';
import H6Icon from './Icons/header-level-icons/h6Icon';

interface IconProps {
  className?: string;
  [key: string]: any;
}

export const Icons = {
  H1: ({ className, ...props }: IconProps) => (
    <H1Icon className={className} letterClassName='fill-foreground opacity-50' levelClassName='fill-foreground' {...props} />
  ),
  H2: ({ className, ...props }: IconProps) => (
    <H2Icon className={className} letterClassName='fill-foreground opacity-50' levelClassName='fill-foreground' {...props} />
  ),
  H3: ({ className, ...props }: IconProps) => (
    <H3Icon className={className} letterClassName='fill-foreground opacity-50' levelClassName='fill-foreground' {...props} />
  ),
  H4: ({ className, ...props }: IconProps) => (
    <H4Icon className={className} letterClassName='fill-foreground opacity-50' levelClassName='stroke-foreground fill-none' {...props} />
  ),
  H5: ({ className, ...props }: IconProps) => (
    <H5Icon className={className} letterClassName='fill-foreground opacity-50' levelClassName='stroke-foreground fill-none' {...props} />
  ),
  H6: ({ className, ...props }: IconProps) => (
    <H6Icon className={className} letterClassName='fill-foreground opacity-50' levelClassName='fill-foreground' {...props} />
  ),
};
