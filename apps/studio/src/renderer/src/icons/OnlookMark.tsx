import { useId, type SVGProps } from 'react';

// SVG clip IDs are document-global, including separate copies of this mark (ONL-2563).
export function OnlookMark(props: SVGProps<SVGSVGElement>): React.JSX.Element {
  const clipId = useId();
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <clipPath id={clipId}>
        <circle cx="90" cy="90" r="90" />
      </clipPath>
      <path
        clipPath={`url(#${clipId})`}
        fillRule="evenodd"
        clipRule="evenodd"
        d="M136.871 166.847C162.737 151.037 180 122.534 180 90C180 40.2944 139.706 0 90 0C40.2944 0 0 40.2944 0 90C0 111.296 7.39648 130.864 19.7606 146.276L52.6117 120.052V83.5641V67.1531L32.5355 47.0762H52.6117H128.129C135.286 47.0762 141.089 52.8786 141.089 60.0362V83.2146C134.327 78.5336 129.459 74.7685 129.459 74.7685L106.612 88.6146L145.728 121.845L136.871 166.847ZM92.5088 57.1567H119.847C119.847 57.1567 120.873 68.5379 105.92 68.5379C92.5083 57.1559 92.5088 57.1567 92.5088 57.1567Z"
        fill="currentColor"
      />
    </svg>
  );
}
