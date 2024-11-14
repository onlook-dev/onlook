import {
    ArrowDownIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    BorderAllIcon,
    BorderBottomIcon,
    BorderDashedIcon,
    BorderDottedIcon,
    BorderLeftIcon,
    BorderRightIcon,
    BorderSolidIcon,
    BorderTopIcon,
    BoxIcon,
    ButtonIcon,
    ChatBubbleIcon,
    CheckCircledIcon,
    CheckIcon,
    CheckboxIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ChevronUpIcon,
    CircleBackslashIcon,
    ClipboardCopyIcon,
    ClipboardIcon,
    CodeIcon,
    Component1Icon,
    ComponentInstanceIcon,
    CopyIcon,
    CornerBottomLeftIcon,
    CornerBottomRightIcon,
    CornerTopLeftIcon,
    CornerTopRightIcon,
    CornersIcon,
    CounterClockwiseClockIcon,
    Cross1Icon,
    Cross2Icon,
    CrossCircledIcon,
    CubeIcon,
    CursorArrowIcon,
    DesktopIcon,
    DiscordLogoIcon,
    DotsVerticalIcon,
    DownloadIcon,
    DragHandleDots2Icon,
    DropdownMenuIcon,
    ExclamationTriangleIcon,
    ExitIcon,
    ExternalLinkIcon,
    EyeClosedIcon,
    EyeOpenIcon,
    FileIcon,
    FilePlusIcon,
    FrameIcon,
    GearIcon,
    GitHubLogoIcon,
    GroupIcon,
    HandIcon,
    ImageIcon,
    InputIcon,
    LaptopIcon,
    LayersIcon,
    Link2Icon,
    LinkNone1Icon,
    ListBulletIcon,
    LockClosedIcon,
    LockOpen1Icon,
    MagicWandIcon,
    MinusCircledIcon,
    MinusIcon,
    MobileIcon,
    MoonIcon,
    Pencil1Icon,
    Pencil2Icon,
    PilcrowIcon,
    PinLeftIcon,
    PinRightIcon,
    PlayIcon,
    PlusCircledIcon,
    PlusIcon,
    QuestionMarkCircledIcon,
    ReloadIcon,
    ResetIcon,
    ScissorsIcon,
    SectionIcon,
    ShadowIcon,
    SizeIcon,
    SquareIcon,
    StopIcon,
    SunIcon,
    TextAlignCenterIcon,
    TextAlignLeftIcon,
    TextAlignRightIcon,
    TextIcon,
    TrashIcon,
    VideoIcon,
    ViewGridIcon,
    ViewHorizontalIcon,
    ViewVerticalIcon,
} from '@radix-ui/react-icons';
import { cn } from '../../utils';
import H1Icon from './header-level-icons/h1Icon';
import H2Icon from './header-level-icons/h2Icon';
import H3Icon from './header-level-icons/h3Icon';
import H4Icon from './header-level-icons/h4Icon';
import H5Icon from './header-level-icons/h5Icon';
import H6Icon from './header-level-icons/h6Icon';

export interface IconProps {
    className?: string;
    [key: string]: any;
}

export const Icons = {
    OnlookLogo: ({ className, ...props }: IconProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={22}
            height={22}
            fill="none"
            className={className}
            {...props}
        >
            <g clipPath="url(#clip0_2707_69355)">
                <mask
                    id="mask0_2707_69355"
                    style={{ maskType: 'alpha' }}
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="23"
                    height="22"
                >
                    <circle
                        cx="11.0078"
                        cy="11"
                        r="11"
                        fill="black"
                        style={{ fill: 'black', fillOpacity: 1 }}
                    />
                </mask>
                <g mask="url(#mask0_2707_69355)">
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M16.737 20.3969C19.9024 18.4654 22.0156 14.9795 22.0156 11C22.0156 4.92487 17.0908 0 11.0156 0C4.94049 0 0.015625 4.92487 0.015625 11C0.015625 13.6014 0.918657 15.9919 2.42835 17.8751L6.43945 14.6732V10.2135V8.20775L3.9857 5.75391H6.43945H15.6693C16.5441 5.75391 17.2533 6.46309 17.2533 7.33791V10.1708C16.4269 9.5987 15.8319 9.13852 15.8319 9.13852L13.0395 10.8308L17.8203 14.8924L16.737 20.3969ZM11.3203 6.98584H14.6616C14.6616 6.98584 14.7871 8.37687 12.9594 8.37687C11.3203 6.98574 11.3203 6.98584 11.3203 6.98584Z"
                        fill="#F7F7F7"
                        style={{ fill: '#F7F7F7', fillOpacity: 1 }}
                    />
                </g>
                <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M2.42188 17.8751L6.43297 14.6732V10.2135V8.20775L3.97922 5.75391H6.43297H15.6628C16.5376 5.75391 17.2468 6.46309 17.2468 7.33791V10.1708C16.4204 9.5987 15.8254 9.13852 15.8254 9.13852L13.0331 10.8308L17.8138 14.8924L16.7305 20.3969C15.0635 21.414 13.1048 22 11.0091 22C7.53543 22 4.43779 20.3898 2.42188 17.8751ZM11.3138 6.98584H14.6552C14.6552 6.98584 14.7806 8.37687 12.9529 8.37687C11.3138 6.98574 11.3138 6.98584 11.3138 6.98584Z"
                    fill="#202123"
                    style={{ fill: '#202123', fillOpacity: 1 }}
                />
                <mask id="path-4-inside-1_2707_69355" fill="white">
                    <path d="M22.0078 11C22.0078 17.0751 17.0829 22 11.0078 22C4.93268 22 0.0078125 17.0751 0.0078125 11C0.0078125 4.92487 4.93268 0 11.0078 0C17.0829 0 22.0078 4.92487 22.0078 11Z" />
                </mask>
                <path
                    d="M21.1484 11C21.1484 16.6005 16.6083 21.1406 11.0078 21.1406V22.8594C17.5576 22.8594 22.8672 17.5498 22.8672 11H21.1484ZM11.0078 21.1406C5.4073 21.1406 0.867188 16.6005 0.867188 11H-0.851562C-0.851562 17.5498 4.45806 22.8594 11.0078 22.8594V21.1406ZM0.867188 11C0.867188 5.39949 5.4073 0.859375 11.0078 0.859375V-0.859375C4.45806 -0.859375 -0.851562 4.45025 -0.851562 11H0.867188ZM11.0078 0.859375C16.6083 0.859375 21.1484 5.39949 21.1484 11H22.8672C22.8672 4.45025 17.5576 -0.859375 11.0078 -0.859375V0.859375Z"
                    fill="#F7F7F7"
                    style={{ fill: '#F7F7F7', fillOpacity: 1 }}
                    mask="url(#path-4-inside-1_2707_69355)"
                />
            </g>
            <defs>
                <clipPath id="clip0_2707_69355">
                    <rect
                        width="22"
                        height="22"
                        fill="white"
                        style={{ fill: 'white', fillOpacity: 1 }}
                    />
                </clipPath>
            </defs>
        </svg>
    ),
    OnlookTextLogo: ({ className, ...props }: IconProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={139}
            height={17}
            fill="none"
            className={cn('w-1/4 dark:invert', className)}
            {...props}
        >
            <path
                d="M26.7578 16.502V4.40195H28.7485L43.3051 15.4019H44.7981V3.30195"
                stroke="black"
                style={{ stroke: 'black', strokeOpacity: 1 }}
                strokeWidth="2.73715"
            />
            <path
                d="M50.7734 3.30237V15.4023L67.0719 15.4023"
                stroke="black"
                style={{ stroke: 'black', strokeOpacity: 1 }}
                strokeWidth="2.73715"
            />
            <rect
                x="2"
                y="4.62305"
                width="19.4089"
                height="10.56"
                rx="5.27999"
                stroke="black"
                style={{ stroke: 'black', strokeOpacity: 1 }}
                strokeWidth="2.73715"
            />
            <rect
                x="69.6797"
                y="4.62305"
                width="19.4089"
                height="10.56"
                rx="5.27999"
                stroke="black"
                style={{ stroke: 'black', strokeOpacity: 1 }}
                strokeWidth="2.73715"
            />
            <rect
                x="94.0703"
                y="4.62305"
                width="19.4089"
                height="10.56"
                rx="5.27999"
                stroke="black"
                style={{ stroke: 'black', strokeOpacity: 1 }}
                strokeWidth="2.73715"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M120.823 10.3906V16.502H118.086V9.022V3.30204H120.823V7.65343H128.075L133.781 3.30213H138.295L130.657 9.126L138.583 16.502H134.565L127.999 10.3906H120.823ZM137.735 0.442137L137.66 0.34375L137.531 0.442137H137.735Z"
                fill="black"
                style={{ fill: 'black', fillOpacity: 1 }}
            />
        </svg>
    ),
    GoogleLogo: ({ className, ...props }: IconProps) => (
        <svg
            width="24"
            height="24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
            <path d="M1 1h22v22H1z" fill="none" />
        </svg>
    ),
    ZedLogo: ({ className, ...props }: IconProps) => (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <defs>
                <linearGradient
                    gradientUnits="userSpaceOnUse"
                    x1="7.977"
                    y1="7.927"
                    x2="7.977"
                    y2="9.45"
                    id="gradient-0"
                    spreadMethod="pad"
                    gradientTransform="matrix(1.251512, 0.003243, -0.002837, 1.096434, -1.931147, 0.733313)"
                >
                    <stop offset="0" style={{ stopColor: 'rgb(42, 43, 43)' }}></stop>
                    <stop offset="0.611" style={{ stopColor: 'rgb(154, 155, 154)' }}></stop>
                    <stop offset="1" style={{ stopColor: 'rgb(154, 155, 154)' }}></stop>
                </linearGradient>
                <linearGradient
                    gradientUnits="userSpaceOnUse"
                    x1="6.765"
                    y1="5"
                    x2="6.765"
                    y2="10.438"
                    id="gradient-1"
                    gradientTransform="matrix(1.250362, 0, 0, 1.250362, -0.625671, 0.869228)"
                >
                    <stop offset="0" style={{ stopColor: 'rgb(47, 46, 47)' }}></stop>
                    <stop offset="0.848" style={{ stopColor: 'rgb(154, 155, 154)' }}></stop>
                    <stop offset="1" style={{ stopColor: 'rgb(154, 155, 154)' }}></stop>
                </linearGradient>
                <linearGradient
                    gradientUnits="userSpaceOnUse"
                    x1="6.914"
                    y1="3.106"
                    x2="6.914"
                    y2="12.481"
                    id="gradient-2"
                    gradientTransform="matrix(1.249201, 0, 0, 1.24825, -0.615701, 0.901788)"
                >
                    <stop offset="0" style={{ stopColor: 'rgb(46, 47, 47)' }}></stop>
                    <stop offset="0.914" style={{ stopColor: 'rgb(154, 155, 154)' }}></stop>
                    <stop offset="1" style={{ stopColor: 'rgb(154, 155, 154)' }}></stop>
                </linearGradient>
            </defs>
            <path
                d="M 1.425 2.419 C 1.167 2.419 0.957 2.629 0.957 2.888 L 0.957 13.2 L 0.019 13.2 L 0.019 2.888 C 0.019 2.111 0.649 1.481 1.425 1.481 L 13.985 1.481 C 14.611 1.481 14.925 2.239 14.482 2.682 L 6.747 10.417 L 5.809 11.354 L 4.198 12.966 L 3.26 13.903 L 1.62 15.544 L 1.054 16.481 C 0.427 16.481 0.114 15.724 0.557 15.281 L 8.263 7.575 L 6.113 7.575 L 6.113 8.513 L 5.175 8.513 L 5.175 7.341 C 5.175 6.952 5.49 6.638 5.879 6.638 L 9.2 6.638 L 10.841 4.997 L 3.535 4.997 L 3.535 10.856 L 2.597 10.856 L 2.597 4.997 C 2.597 4.479 3.017 4.06 3.535 4.06 L 11.778 4.06 L 13.419 2.419 L 1.425 2.419 Z"
                style={{ fillOpacity: 1, fill: 'rgb(155, 154, 154)' }}
            ></path>
            <path
                d="M 5.78 11.381 L 6.719 10.442 L 8.9 10.442 L 8.9 9.475 L 9.839 9.475 L 9.839 10.678 C 9.839 11.067 9.524 11.381 9.136 11.381 L 5.78 11.381 Z"
                style={{ fill: 'url(#gradient-0)', fillOpacity: 1 }}
            ></path>
            <path
                d="M 3.242 13.92 L 4.18 12.983 L 11.488 12.983 L 11.488 7.121 L 12.426 7.121 L 12.426 12.983 C 12.426 13.5 12.006 13.92 11.488 13.92 L 3.242 13.92 Z"
                style={{ fillOpacity: 1, fill: 'url(#gradient-1)' }}
            ></path>
            <path
                d="M 1.043 16.481 C 1.611 15.56 1.611 15.548 1.611 15.548 L 13.594 15.548 C 13.853 15.548 14.062 15.336 14.062 15.079 L 14.062 4.78 L 15 4.78 L 15 15.079 C 15 15.854 14.372 16.481 13.594 16.481 L 1.043 16.481 Z"
                style={{ fillOpacity: 1, fill: 'url(#gradient-2)' }}
            ></path>
        </svg>
    ),
    VSCodeLogo: ({ className, ...props }: IconProps) => (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <g clipPath="url(#clip0_3223_92782)">
                <mask
                    id="mask0_3223_92782"
                    style={{ maskType: 'alpha' }}
                    maskUnits="userSpaceOnUse"
                    x="0"
                    y="0"
                    width="15"
                    height="16"
                >
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M10.6368 15.397C10.873 15.489 11.1424 15.4831 11.3809 15.3684L14.4691 13.8824C14.7936 13.7262 15 13.3978 15 13.0375V2.9614C15 2.6011 14.7936 2.27267 14.4691 2.11652L11.3809 0.630468C11.0679 0.479885 10.7017 0.516769 10.427 0.716447C10.3878 0.744971 10.3504 0.776819 10.3153 0.811916L4.40327 6.20563L1.82808 4.25084C1.58835 4.06888 1.25304 4.08379 1.0304 4.28632L0.204455 5.03764C-0.0678827 5.28537 -0.0681949 5.71381 0.20378 5.96196L2.43707 7.99942L0.20378 10.0369C-0.0681949 10.285 -0.0678827 10.7135 0.204455 10.9612L1.0304 11.7125C1.25304 11.915 1.58835 11.93 1.82808 11.748L4.40327 9.79321L10.3153 15.1869C10.4089 15.2805 10.5187 15.351 10.6368 15.397ZM11.2523 4.59424L6.76637 7.99942L11.2523 11.4046V4.59424Z"
                        fill="white"
                        style={{ fill: 'white', fillOpacity: 1 }}
                    />
                </mask>
                <g mask="url(#mask0_3223_92782)">
                    <path
                        d="M14.4666 2.11871L11.3759 0.630613C11.0182 0.458365 10.5907 0.531023 10.3099 0.811781L0.192185 10.0368C-0.0799555 10.2849 -0.0796426 10.7133 0.19286 10.9611L1.01931 11.7124C1.24209 11.9149 1.5776 11.9298 1.81747 11.7479L14.0015 2.50477C14.4103 2.19467 14.9974 2.48621 14.9974 2.99929V2.96341C14.9974 2.60326 14.7911 2.27495 14.4666 2.11871Z"
                        fill="#787878"
                        style={{ fill: 'color(display-p3 0.4706 0.4706 0.4706)', fillOpacity: 1 }}
                    />
                    <g filter="url(#filter0_d_3223_92782)">
                        <path
                            d="M14.4666 13.8802L11.3759 15.3683C11.0182 15.5406 10.5907 15.4679 10.3099 15.1872L0.192185 5.9622C-0.0799555 5.71407 -0.0796426 5.28561 0.19286 5.03789L1.01931 4.28657C1.24209 4.08404 1.5776 4.06913 1.81747 4.25109L14.0015 13.4942C14.4103 13.8043 14.9974 13.5127 14.9974 12.9997V13.0356C14.9974 13.3957 14.7911 13.724 14.4666 13.8802Z"
                            fill="#929292"
                            style={{
                                fill: 'color(display-p3 0.5725 0.5725 0.5725)',
                                fillOpacity: 1,
                            }}
                        />
                    </g>
                    <g filter="url(#filter1_d_3223_92782)">
                        <path
                            d="M11.3787 15.3684C11.0208 15.5405 10.5933 15.4677 10.3125 15.1869C10.6585 15.5329 11.25 15.2878 11.25 14.7986V1.20024C11.25 0.710982 10.6585 0.465957 10.3125 0.811917C10.5933 0.531134 11.0208 0.458373 11.3787 0.630468L14.4688 2.11653C14.7935 2.27268 15 2.6011 15 2.9614V13.0375C15 13.3978 14.7935 13.7262 14.4688 13.8824L11.3787 15.3684Z"
                            fill="#C7C7C7"
                            style={{
                                fill: 'color(display-p3 0.7804 0.7804 0.7804)',
                                fillOpacity: 1,
                            }}
                        />
                    </g>
                    <g style={{ mixBlendMode: 'overlay' }} opacity="0.25">
                        <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M10.6251 15.397C10.8613 15.489 11.1307 15.4831 11.3692 15.3684L14.4574 13.8824C14.7819 13.7262 14.9883 13.3978 14.9883 13.0375V2.96141C14.9883 2.60109 14.7819 2.27267 14.4574 2.11652L11.3692 0.630468C11.0562 0.479886 10.69 0.516769 10.4153 0.716446C10.3761 0.744972 10.3387 0.77682 10.3036 0.811917L4.39154 6.20562L1.81636 4.25085C1.57664 4.06887 1.24133 4.0838 1.01868 4.28631L0.192736 5.03763C-0.0796016 5.28537 -0.0799137 5.71382 0.192061 5.96195L2.42534 7.99941L0.192061 10.0369C-0.0799137 10.285 -0.0796016 10.7135 0.192736 10.9612L1.01868 11.7125C1.24133 11.915 1.57664 11.93 1.81636 11.748L4.39154 9.7932L10.3036 15.1869C10.3972 15.2805 10.507 15.351 10.6251 15.397ZM11.2406 4.59425L6.75464 7.99941L11.2406 11.4046V4.59425Z"
                            fill="url(#paint0_linear_3223_92782)"
                        />
                    </g>
                </g>
            </g>
            <defs>
                <filter
                    id="filter0_d_3223_92782"
                    x="-1.26172"
                    y="2.87402"
                    width="17.5078"
                    height="13.8369"
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB"
                >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                    />
                    <feOffset />
                    <feGaussianBlur stdDeviation="0.625" />
                    <feColorMatrix
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
                    />
                    <feBlend
                        mode="overlay"
                        in2="BackgroundImageFix"
                        result="effect1_dropShadow_3223_92782"
                    />
                    <feBlend
                        mode="normal"
                        in="SourceGraphic"
                        in2="effect1_dropShadow_3223_92782"
                        result="shape"
                    />
                </filter>
                <filter
                    id="filter1_d_3223_92782"
                    x="9.0625"
                    y="-0.711915"
                    width="7.1875"
                    height="17.4229"
                    filterUnits="userSpaceOnUse"
                    colorInterpolationFilters="sRGB"
                >
                    <feFlood floodOpacity="0" result="BackgroundImageFix" />
                    <feColorMatrix
                        in="SourceAlpha"
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                        result="hardAlpha"
                    />
                    <feOffset />
                    <feGaussianBlur stdDeviation="0.625" />
                    <feColorMatrix
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
                    />
                    <feBlend
                        mode="overlay"
                        in2="BackgroundImageFix"
                        result="effect1_dropShadow_3223_92782"
                    />
                    <feBlend
                        mode="normal"
                        in="SourceGraphic"
                        in2="effect1_dropShadow_3223_92782"
                        result="shape"
                    />
                </filter>
                <linearGradient
                    id="paint0_linear_3223_92782"
                    x1="7.48828"
                    y1="0.538086"
                    x2="7.48828"
                    y2="15.4608"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="white" style={{ stopColor: 'white', stopOpacity: 1 }} />
                    <stop
                        offset="1"
                        stopColor="white"
                        stopOpacity="0"
                        style={{ stopColor: 'none', stopOpacity: 0 }}
                    />
                </linearGradient>
                <clipPath id="clip0_3223_92782">
                    <rect
                        width="15"
                        height="15"
                        fill="white"
                        style={{ fill: 'white', fillOpacity: 1 }}
                        transform="translate(0 0.5)"
                    />
                </clipPath>
            </defs>
        </svg>
    ),
    CursorLogo: ({ className, ...props }: IconProps) => (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <path d="M0 4.5375L7.56101 0.199219V4.5375H0Z" fill="url(#paint0_linear_3223_92799)" />
            <path
                d="M0 13.3378L7.49903 8.9375V13.3378V17.738L0 13.3378Z"
                fill="url(#paint1_linear_3223_92799)"
            />
            <path
                d="M15 13.3378L7.50097 8.9375V13.3378V17.738L15 13.3378Z"
                fill="url(#paint2_linear_3223_92799)"
            />
            <path
                d="M7.5 8.93737L14.999 4.53711V8.93737V13.3376L7.5 8.93737Z"
                fill="url(#paint3_linear_3223_92799)"
            />
            <path
                d="M7.5 8.93737L0.000967979 4.53711V8.93737V13.3376L7.5 8.93737Z"
                fill="url(#paint4_linear_3223_92799)"
            />
            <path
                d="M15 4.5375L7.56294 0.199219V4.5375H15Z"
                fill="url(#paint5_linear_3223_92799)"
            />
            <path d="M0 4.53724L7.49903 8.9375L14.9981 4.53724H0Z" fill="white" />
            <path d="M7.5 8.93829V17.8008L14.999 4.53803L7.5 8.93829Z" fill="#E4E4E4" />
            <defs>
                <linearGradient
                    id="paint0_linear_3223_92799"
                    x1="5.82828"
                    y1="3.40578"
                    x2="7.81095"
                    y2="4.54116"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#9B9B9B" />
                    <stop offset="1" stopColor="#3C3C3C" />
                </linearGradient>
                <linearGradient
                    id="paint1_linear_3223_92799"
                    x1="7.49903"
                    y1="10.5857"
                    x2="7.49903"
                    y2="17.2094"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#6F6F6F" />
                    <stop offset="0.362601" stopColor="#878787" />
                    <stop offset="0.425081" stopColor="#989898" />
                    <stop offset="1" stopColor="#AEAEAE" />
                </linearGradient>
                <linearGradient
                    id="paint2_linear_3223_92799"
                    x1="7.50097"
                    y1="10.5857"
                    x2="7.50096"
                    y2="17.2094"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#6F6F6F" />
                    <stop offset="0.362601" stopColor="#B0B0B0" />
                    <stop offset="0.425081" stopColor="#CCCCCC" />
                    <stop offset="1" stopColor="#D9D9D9" />
                </linearGradient>
                <linearGradient
                    id="paint3_linear_3223_92799"
                    x1="14.999"
                    y1="6.18526"
                    x2="14.999"
                    y2="12.809"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#3C3C3C" />
                    <stop offset="1" stopColor="#232323" />
                    <stop offset="1" stopColor="#AEAEAE" />
                </linearGradient>
                <linearGradient
                    id="paint4_linear_3223_92799"
                    x1="0.000968457"
                    y1="9.0934"
                    x2="6.8823"
                    y2="8.88955"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#4D4D4D" />
                    <stop offset="1" stopColor="#383838" />
                </linearGradient>
                <linearGradient
                    id="paint5_linear_3223_92799"
                    x1="9.26727"
                    y1="3.40578"
                    x2="7.30131"
                    y2="4.51313"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop stopColor="#414141" />
                    <stop offset="1" stopColor="#0A0A0A" />
                </linearGradient>
            </defs>
        </svg>
    ),
    EyeDropper: ({ className, ...props }: IconProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={15}
            height={15}
            fill="none"
            className={className}
            {...props}
        >
            <path
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M9.65098 3.01801C10.3799 2.26432 11.585 2.25428 12.3263 2.99571C13.0677 3.73715 13.0577 4.94231 12.304 5.67128L10.1041 7.79928C10.0222 7.8785 9.97552 7.98729 9.97457 8.10124C9.97362 8.21519 10.0185 8.32474 10.099 8.40531L10.6259 8.93224C10.7694 9.0757 10.7877 9.26188 10.7148 9.39002C10.5901 9.60936 10.452 9.80888 10.3287 9.92046C10.3126 9.93507 10.2989 9.94616 10.2876 9.95455C9.49985 9.34257 8.75216 8.59581 7.7444 7.58796C6.74234 6.58582 6.09783 5.92672 5.3679 5.03152C5.37539 5.02186 5.38474 5.01062 5.39637 4.9978C5.50841 4.87426 5.70999 4.73496 5.93151 4.60884C6.06074 4.53526 6.24789 4.55385 6.39152 4.6975L6.91718 5.2232C6.99774 5.30377 7.10729 5.34862 7.22122 5.34767C7.33516 5.34672 7.44394 5.30005 7.52316 5.21815L9.65098 3.01801ZM12.9273 2.39465C11.8501 1.31734 10.0992 1.33193 9.04003 2.42704L7.21263 4.31655L6.99254 4.09643C6.61768 3.72155 6.019 3.5809 5.511 3.87012C5.27335 4.00543 4.97343 4.19889 4.76679 4.42673C4.66384 4.54024 4.55311 4.69549 4.51041 4.88697C4.46226 5.10293 4.51054 5.32376 4.6602 5.50846C5.12817 6.086 5.55941 6.56637 6.05118 7.07991L2.04643 11.0827C1.4409 11.6879 1.44076 12.6695 2.04611 13.2749C2.65134 13.8802 3.6326 13.8802 4.23782 13.2749L8.23887 9.27353C8.78734 9.80411 9.29355 10.2634 9.82262 10.6694C10.01 10.8132 10.2294 10.8558 10.4415 10.8069C10.6311 10.7631 10.7853 10.6537 10.8991 10.5507C11.1269 10.3445 11.3192 10.0466 11.4536 9.81026C11.7424 9.30248 11.6007 8.70501 11.2269 8.33118L11.0056 8.10983L12.895 6.28228C13.99 5.22307 14.0046 3.47196 12.9273 2.39465ZM2.64727 11.6839C2.37384 11.9572 2.37378 12.4005 2.64713 12.6738C2.92042 12.9472 3.36352 12.9472 3.63681 12.6738L7.63192 8.6784L6.64339 7.68979L2.64727 11.6839Z"
            />
        </svg>
    ),
    Return: ({ className, ...props }: IconProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={15}
            height={15}
            fill="none"
            className={className}
            {...props}
        >
            <path
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.3312 11.3579C5.52669 11.1628 5.52705 10.8462 5.33201 10.6508L4.08798 9.40391H8.38281H12.4828C13.5322 9.40391 14.3828 8.55325 14.3828 7.50391V5.50391C14.3828 4.39934 13.4874 3.50391 12.3828 3.50391H8.88281C8.60667 3.50391 8.38281 3.72776 8.38281 4.00391C8.38281 4.28005 8.60667 4.50391 8.88281 4.50391H12.3828C12.9351 4.50391 13.3828 4.95162 13.3828 5.50391V7.50391C13.3828 8.00096 12.9799 8.40391 12.4828 8.40391H8.38281H4.08798L5.33201 7.15706C5.52705 6.96157 5.52669 6.64499 5.3312 6.44995C5.13572 6.25491 4.81914 6.25527 4.6241 6.45075L2.52886 8.55075C2.33413 8.74592 2.33413 9.06189 2.52886 9.25706L4.6241 11.3571C4.81914 11.5525 5.13572 11.5529 5.3312 11.3579Z"
            />
        </svg>
    ),
    Tablet: ({ className, ...props }: IconProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={15}
            height={15}
            fill="none"
            className={className}
            {...props}
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M2.89885 1.78968C2.89885 1.57167 3.07558 1.39494 3.29359 1.39494H11.7146C11.9326 1.39494 12.1094 1.57167 12.1094 1.78968V13.2107C12.1094 13.4287 11.9326 13.6055 11.7146 13.6055H3.29359C3.07558 13.6055 2.89885 13.4287 2.89885 13.2107V1.78968ZM3.29359 0.605469C2.63956 0.605469 2.10938 1.13566 2.10938 1.78968V13.2107C2.10938 13.8648 2.63956 14.3949 3.29359 14.3949H11.7146C12.3687 14.3949 12.8988 13.8648 12.8988 13.2107V1.78968C12.8988 1.13566 12.3687 0.605469 11.7146 0.605469H3.29359ZM6.00041 12.2241C5.84781 12.2241 5.7241 12.3478 5.7241 12.5004C5.7241 12.653 5.84781 12.7767 6.00041 12.7767H9.00041C9.15302 12.7767 9.27673 12.653 9.27673 12.5004C9.27673 12.3478 9.15302 12.2241 9.00041 12.2241H6.00041Z"
                fill="black"
                style={{ fill: 'black', fillOpacity: 1 }}
            />
        </svg>
    ),
    H1: ({ className, ...props }: IconProps) => (
        <H1Icon
            className={className}
            letterClassName={cn(
                {
                    'fill-black/50 dark:fill-white/50': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            levelClassName={cn(
                {
                    'fill-[#313131] dark:fill-[#CECECE]': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            {...props}
        />
    ),
    H2: ({ className, ...props }: IconProps) => (
        <H2Icon
            className={className}
            letterClassName={cn(
                {
                    'fill-black/50 dark:fill-white/50': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            levelClassName={cn(
                {
                    'fill-[#313131] dark:fill-[#CECECE]': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            {...props}
        />
    ),
    H3: ({ className, ...props }: IconProps) => (
        <H3Icon
            className={className}
            letterClassName={cn(
                {
                    'fill-black/50 dark:fill-white/50': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            levelClassName={cn(
                {
                    'fill-[#313131] dark:fill-[#CECECE]': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            {...props}
        />
    ),
    H4: ({ className, ...props }: IconProps) => (
        <H4Icon
            className={className}
            letterClassName={cn(
                {
                    'fill-black/50 dark:fill-white/50': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            levelClassName={cn(
                {
                    'stroke-[#313131] dark:stroke-[#CECECE] fill-none': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                {
                    'stroke-white dark:stroke-primary fill-none': className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
            )}
            {...props}
        />
    ),
    H5: ({ className, ...props }: IconProps) => (
        <H5Icon
            className={className}
            letterClassName={cn(
                {
                    'fill-black/50 dark:fill-white/50': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            levelClassName={cn(
                {
                    'stroke-[#313131] dark:stroke-[#CECECE] fill-none': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                {
                    'stroke-white dark:stroke-primary fill-none': className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
            )}
            {...props}
        />
    ),
    H6: ({ className, ...props }: IconProps) => (
        <H6Icon
            className={className}
            letterClassName={cn(
                {
                    'fill-black/50 dark:fill-white/50': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            levelClassName={cn(
                {
                    'fill-[#313131] dark:fill-[#CECECE]': !className?.includes(
                        'fill-white dark:fill-primary',
                    ),
                },
                className,
            )}
            {...props}
        />
    ),
    ArrowDown: ArrowDownIcon,
    ArrowLeft: ArrowLeftIcon,
    ArrowRight: ArrowRightIcon,
    BorderAll: BorderAllIcon,
    BorderBottom: BorderBottomIcon,
    BorderDashed: BorderDashedIcon,
    BorderDotted: BorderDottedIcon,
    BorderLeft: BorderLeftIcon,
    BorderRight: BorderRightIcon,
    BorderSolid: BorderSolidIcon,
    BorderTop: BorderTopIcon,
    Box: BoxIcon,
    Button: ButtonIcon,
    ChatBubble: ChatBubbleIcon,
    Check: CheckIcon,
    CheckCircled: CheckCircledIcon,
    Checkbox: CheckboxIcon,
    ChevronDown: ChevronDownIcon,
    ChevronRight: ChevronRightIcon,
    ChevronUp: ChevronUpIcon,
    CircleBackslash: CircleBackslashIcon,
    Clipboard: ClipboardIcon,
    ClipboardCopy: ClipboardCopyIcon,
    Code: CodeIcon,
    Component: Component1Icon,
    ComponentInstance: ComponentInstanceIcon,
    Copy: CopyIcon,
    CornerBottomLeft: CornerBottomLeftIcon,
    CornerBottomRight: CornerBottomRightIcon,
    CornerTopLeft: CornerTopLeftIcon,
    CornerTopRight: CornerTopRightIcon,
    Corners: CornersIcon,
    CounterClockwiseClock: CounterClockwiseClockIcon,
    CrossL: Cross1Icon,
    CrossS: Cross2Icon,
    CrossCircled: CrossCircledIcon,
    Cube: CubeIcon,
    Desktop: DesktopIcon,
    DiscordLogo: DiscordLogoIcon,
    DotsVertical: DotsVerticalIcon,
    Download: DownloadIcon,
    DropdownMenu: DropdownMenuIcon,
    ExclamationTriangle: ExclamationTriangleIcon,
    Exit: ExitIcon,
    ExternalLink: ExternalLinkIcon,
    EyeOpen: EyeOpenIcon,
    EyeClosed: EyeClosedIcon,
    File: FileIcon,
    FilePlus: FilePlusIcon,
    Frame: FrameIcon,
    Gear: GearIcon,
    GitHubLogo: GitHubLogoIcon,
    Group: GroupIcon,
    Image: ImageIcon,
    Input: InputIcon,
    Laptop: LaptopIcon,
    Layers: LayersIcon,
    Link: Link2Icon,
    LinkNone: LinkNone1Icon,
    ListBullet: ListBulletIcon,
    MagicWand: MagicWandIcon,
    Minus: MinusIcon,
    MinusCircled: MinusCircledIcon,
    Mobile: MobileIcon,
    Moon: MoonIcon,
    Pencil: Pencil1Icon,
    PencilPaper: Pencil2Icon,
    Pilcrow: PilcrowIcon,
    PinLeft: PinLeftIcon,
    PinRight: PinRightIcon,
    Play: PlayIcon,
    Plus: PlusIcon,
    PlusCircled: PlusCircledIcon,
    QuestionMarkCircled: QuestionMarkCircledIcon,
    Reload: ReloadIcon,
    Reset: ResetIcon,
    Scissors: ScissorsIcon,
    Section: SectionIcon,
    Shadow: ShadowIcon,
    Size: SizeIcon,
    Sun: SunIcon,
    Stop: StopIcon,
    Text: TextIcon,
    TextAlignCenter: TextAlignCenterIcon,
    TextAlignLeft: TextAlignLeftIcon,
    TextAlignRight: TextAlignRightIcon,
    Trash: TrashIcon,
    Video: VideoIcon,
    ViewGrid: ViewGridIcon,
    ViewHorizontal: ViewHorizontalIcon,
    ViewVertical: ViewVerticalIcon,
    CursorArrow: CursorArrowIcon,
    Hand: HandIcon,
    Square: SquareIcon,
    LockOpen: LockOpen1Icon,
    LockClosed: LockClosedIcon,
    DragHandleDots: DragHandleDots2Icon,
} satisfies { [key: string]: React.FC<IconProps> };
