import React from 'react';

interface H3IconProps {
  className?: string;
  letterClassName?: string;
  levelClassName?: string;
  [key: string]: any;
}

const H3Icon: React.FC<H3IconProps> = ({ className, letterClassName, levelClassName, ...props }) => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 15 15"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <path
      className={letterClassName}
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8.30469 2.50078C8.30469 2.25225 8.50616 2.05078 8.75469 2.05078H12.2547C12.5032 2.05078 12.7047 2.25225 12.7047 2.50078C12.7047 2.74931 12.5032 2.95078 12.2547 2.95078H11.0503V4.00039C11.0336 4.00013 11.0168 4 11 4C10.6368 4 10.2848 4.06052 9.95034 4.17393V2.95078H8.75469C8.50616 2.95078 8.30469 2.74931 8.30469 2.50078ZM7.31541 7.05062H5.05034V2.95078H6.25469C6.50322 2.95078 6.70469 2.74931 6.70469 2.50078C6.70469 2.25225 6.50322 2.05078 6.25469 2.05078H2.75469C2.50616 2.05078 2.30469 2.25225 2.30469 2.50078C2.30469 2.74931 2.50616 2.95078 2.75469 2.95078H3.95034V12.0508H2.75469C2.50616 12.0508 2.30469 12.2523 2.30469 12.5008C2.30469 12.7493 2.50616 12.9508 2.75469 12.9508H6.25469C6.50322 12.9508 6.70469 12.7493 6.70469 12.5008C6.70469 12.2523 6.50322 12.0508 6.25469 12.0508H5.05034V7.95062H7.08824C7.14151 7.63886 7.21802 7.33787 7.31541 7.05062Z"
    />
    <path
      className={levelClassName}
      d="M12.5769 5.43111C12.9281 5.81094 13.125 6.33894 13.125 6.99809C13.125 7.73234 12.7391 8.31179 12.2365 8.69182C11.7397 9.06747 11.1011 9.27356 10.5 9.27356C10.2377 9.27356 10.025 9.06089 10.025 8.79856C10.025 8.53622 10.2377 8.32356 10.5 8.32356C10.8989 8.32356 11.3353 8.18224 11.6635 7.93406C11.9859 7.69028 12.175 7.36949 12.175 6.99809C12.175 6.53404 12.0407 6.2505 11.8794 6.07605C11.7138 5.89694 11.4778 5.78779 11.2013 5.75186C10.9226 5.71565 10.6266 5.75801 10.3808 5.85713C10.1276 5.95923 9.98082 6.09832 9.92478 6.21029C9.80738 6.44489 9.52203 6.5399 9.28743 6.4225C9.05283 6.30511 8.95782 6.01976 9.07522 5.78515C9.26918 5.39755 9.64112 5.13109 10.0255 4.97608C10.4172 4.8181 10.8774 4.75181 11.3237 4.80978C11.7722 4.86804 12.23 5.05593 12.5769 5.43111Z"
    />
    <path
      className={levelClassName}
      d="M10.9515 13.2395C12.0965 13.2361 13.4 12.482 13.4 10.9978C13.4 10.3712 13.2697 9.86427 13.0352 9.46235C12.7996 9.05845 12.4766 8.79126 12.1414 8.61835C11.5175 8.29648 10.8379 8.29785 10.5687 8.2984C10.5584 8.29842 10.5486 8.29844 10.5395 8.29844C10.2633 8.29844 10.0395 8.5223 10.0395 8.79844C10.0395 9.07458 10.2633 9.29844 10.5395 9.29844C10.8066 9.29844 11.2789 9.29859 11.6829 9.50705C11.8738 9.60551 12.0447 9.74892 12.1715 9.96625C12.2994 10.1856 12.4 10.5105 12.4 10.9978C12.4 11.7413 11.7535 12.2371 10.9485 12.2395C10.5624 12.2407 10.2007 12.1183 9.9422 11.8877C9.69346 11.6658 9.5 11.3087 9.5 10.7495C9.5 10.4733 9.27614 10.2495 9 10.2495C8.72386 10.2495 8.5 10.4733 8.5 10.7495C8.5 11.5642 8.79404 12.2036 9.27655 12.634C9.74927 13.0556 10.3626 13.2413 10.9515 13.2395Z"
    />
  </svg>
);

export default H3Icon;
