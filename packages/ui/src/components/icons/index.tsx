import {
    AlignBottomIcon,
    AlignCenterHorizontallyIcon,
    AlignCenterVerticallyIcon,
    AlignLeftIcon,
    AlignRightIcon,
    AlignTopIcon,
    ArrowDownIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ArrowUpIcon,
    BookmarkFilledIcon,
    BookmarkIcon,
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
    CircleIcon,
    ClipboardCopyIcon,
    ClipboardIcon,
    CodeIcon,
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
    DotsHorizontalIcon,
    DotsVerticalIcon,
    DownloadIcon,
    DragHandleDots2Icon,
    DropdownMenuIcon,
    EnvelopeClosedIcon,
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
    GlobeIcon,
    GroupIcon,
    HandIcon,
    ImageIcon,
    InfoCircledIcon,
    InputIcon,
    KeyboardIcon,
    LaptopIcon,
    Link2Icon,
    LinkNone1Icon,
    ListBulletIcon,
    LockClosedIcon,
    LockOpen1Icon,
    MagicWandIcon,
    MagnifyingGlassIcon,
    MinusCircledIcon,
    MinusIcon,
    MixerHorizontalIcon,
    MobileIcon,
    MoonIcon,
    Pencil1Icon,
    Pencil2Icon,
    PersonIcon,
    PilcrowIcon,
    PinLeftIcon,
    PinRightIcon,
    PlusCircledIcon,
    PlusIcon,
    QuestionMarkCircledIcon,
    ReloadIcon,
    ResetIcon,
    RowSpacingIcon,
    ScissorsIcon,
    SectionIcon,
    ShadowIcon,
    Share2Icon,
    SizeIcon,
    SketchLogoIcon,
    SpaceBetweenHorizontallyIcon,
    SpaceBetweenVerticallyIcon,
    SquareIcon,
    SunIcon,
    TextAlignCenterIcon,
    TextAlignLeftIcon,
    TextAlignRightIcon,
    TextIcon,
    TokensIcon,
    TrashIcon,
    UploadIcon,
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
    OnlookIcon: ({ className, ...props }: IconProps) => (
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
                        className={className}
                        style={{ fillOpacity: 1 }}
                    />
                </g>
                <mask id="path-4-inside-1_2707_69355" fill="white">
                    <path d="M22.0078 11C22.0078 17.0751 17.0829 22 11.0078 22C4.93268 22 0.0078125 17.0751 0.0078125 11C0.0078125 4.92487 4.93268 0 11.0078 0C17.0829 0 22.0078 4.92487 22.0078 11Z" />
                </mask>
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
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-2.86 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
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
                        d="M10.6368 15.397C10.873 15.489 11.1307 15.4831 11.3692 15.3684L14.4574 13.8824C14.7819 13.7262 14.9883 13.3978 14.9883 13.0375V2.96141C14.9883 2.60109 14.7819 2.27267 14.4574 2.11652L11.3692 0.630468C11.0562 0.479886 10.69 0.516769 10.4153 0.716446C10.3761 0.744972 10.3387 0.77682 10.3036 0.811917L4.39154 6.20562L1.81636 4.25085C1.57664 4.06887 1.24133 4.0838 1.01868 4.28631L0.192736 5.03763C-0.0796016 5.28537 -0.0799137 5.71382 0.192061 5.96195L2.42534 7.99941L0.192061 10.0369C-0.0799137 10.285 -0.0796016 10.7135 0.192736 10.9612L1.01868 11.7125C1.24133 11.915 1.57664 11.93 1.81636 11.748L4.39154 9.7932L10.3036 15.1869C10.3972 15.2805 10.507 15.351 10.6251 15.397ZM11.2406 4.59425L6.75464 7.99941L11.2406 11.4046V4.59425Z"
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
    WindsurfLogo: ({ className, ...props }: IconProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={15}
            height={15}
            viewBox="0 0 69 119"
            fill="none"
            className={className}
            {...props}
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0.627393 4.31968C-0.174635 2.2935 1.2378 0.0970819 3.41639 0.0482939C13.1956 -0.170706 36.8123 0.062288 49.4998 6.70279C70.4998 17.694 68.4998 52.1957 68.4998 52.1957C68.4998 52.1957 65.4998 38.4218 49.4998 31.2074C35.4998 24.8948 8.49979 24.2078 8.49979 24.2078L0.627393 4.31968ZM10.592 36.0501C10.0299 34.3331 11.1999 32.5724 13.0064 32.5468C20.0859 32.4467 36.6633 33.2471 51.4998 41.6936C71.9998 53.3644 68.6156 85.2391 68.6156 85.2391C68.6156 85.2391 64.4002 70.0333 50.5503 63.1971C38.4317 57.2154 17.7073 57.782 17.7073 57.782L10.592 36.0501ZM21.9398 65.9814C20.4243 66.0447 19.4843 67.5501 19.9955 68.9782L28.0902 91.5882C28.0902 91.5882 42.8182 90.6668 52.9979 95.6914C64.6318 101.434 67.9979 118.691 67.9979 118.691C67.9979 118.691 70.5051 85.1901 54.476 74.0739C42.9474 66.0789 28.1443 65.722 21.9398 65.9814Z"
                fill="currentColor"
            />
        </svg>
    ),
    Component: ({ className, ...props }: IconProps) => (
        <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <path
                d="M5.59712 3.15074L7.05696 1.69087C7.30109 1.44679 7.69677 1.44679 7.9409 1.69087L9.40071 3.15074C9.64484 3.39482 9.64484 3.79054 9.40071 4.03462L7.9409 5.49449C7.69677 5.73857 7.30109 5.73857 7.05696 5.49449L5.59712 4.03462C5.35304 3.79054 5.35304 3.39482 5.59712 3.15074Z"
                stroke="currentColor"
                strokeWidth="0.9375"
                strokeLinejoin="round"
            />
            <path
                d="M5.59712 10.9632L7.05696 9.50341C7.30109 9.25928 7.69677 9.25928 7.9409 9.50341L9.40071 10.9632C9.64484 11.2073 9.64484 11.603 9.40071 11.8472L7.9409 13.307C7.69677 13.5511 7.30109 13.5511 7.05696 13.307L5.59712 11.8472C5.35304 11.603 5.35304 11.2073 5.59712 10.9632Z"
                stroke="currentColor"
                strokeWidth="0.9375"
                strokeLinejoin="round"
            />
            <path
                d="M1.69087 7.05696L3.15074 5.59712C3.39482 5.35304 3.79054 5.35304 4.03462 5.59712L5.49449 7.05696C5.73857 7.30109 5.73857 7.69677 5.49449 7.9409L4.03462 9.40071C3.79054 9.64484 3.39482 9.64484 3.15074 9.40071L1.69087 7.9409C1.44679 7.69677 1.44679 7.30109 1.69087 7.05696Z"
                stroke="currentColor"
                strokeWidth="0.9375"
                strokeLinejoin="round"
            />
            <path
                d="M9.50341 7.05696L10.9632 5.59712C11.2073 5.35304 11.603 5.35304 11.8472 5.59712L13.307 7.05696C13.5511 7.30109 13.5511 7.69677 13.307 7.9409L11.8472 9.40071C11.603 9.64484 11.2073 9.64484 10.9632 9.40071L9.50341 7.9409C9.25928 7.69677 9.25928 7.30109 9.50341 7.05696Z"
                stroke="currentColor"
                strokeWidth="0.9375"
                strokeLinejoin="round"
            />
        </svg>
    ),
    Directory: ({ className, ...props }: IconProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={15}
            height={15}
            viewBox="0 0 15 15"
            fill="none"
            className={className}
            {...props}
        >
            <path
                d="M2 11.5C2 11.7761 2.22386 12 2.5 12H12.5C12.7761 12 13 11.7761 13 11.5V5C13 4.72386 12.7761 4.5 12.5 4.5H9.5H7.83333C7.50878 4.5 7.19298 4.39473 6.93333 4.2L5.33333 3H2.5C2.22386 3 2 3.22386 2 3.5L2 6.5L2 11.5ZM2.5 13C1.67157 13 1 12.3284 1 11.5L1 6.5L1 3.5C1 2.67157 1.67157 2 2.5 2H5.41667C5.57894 2 5.73684 2.05263 5.86667 2.15L7.53333 3.4C7.61988 3.46491 7.72515 3.5 7.83333 3.5H9.5H12.5C13.3284 3.5 14 4.17157 14 5V11.5C14 12.3284 13.3284 13 12.5 13H2.5Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
            />
        </svg>
    ),
    DirectoryOpen: ({ className, ...props }: IconProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={15}
            height={15}
            viewBox="0 0 15 15"
            fill="none"
            className={className}
            {...props}
        >
            <path
                d="M2.13713 11.844C2.22824 11.9401 2.35712 12 2.5 12H11.6916C11.9274 12 12.1311 11.8353 12.1805 11.6048L13.2519 6.60477C13.3186 6.29351 13.0813 6 12.763 6H12.5L3.80842 6C3.57265 6 3.36892 6.1647 3.31951 6.39524L3.1139 7.35476L2.7389 9.10476L2.3639 10.8548L2.1764 11.7298C2.16774 11.7702 2.15442 11.8084 2.13713 11.844ZM2 7.78036L2.1361 7.14524L2.34171 6.18571C2.48991 5.4941 3.10111 5 3.80842 5L12 5C12 4.72386 11.7761 4.5 11.5 4.5H9.5H7.83333C7.50878 4.5 7.19298 4.39473 6.93333 4.2L5.33333 3H2.5C2.22386 3 2 3.22386 2 3.5L2 6.5L2 7.78036ZM13 5.01844V5C13 4.17157 12.3284 3.5 11.5 3.5H9.5H7.83333C7.72515 3.5 7.61988 3.46491 7.53333 3.4L5.86667 2.15C5.73684 2.05263 5.57894 2 5.41667 2H2.5C1.67157 2 1 2.67157 1 3.5L1 6.5L1 11.5C1 12.3284 1.67157 13 2.5 13H11.6916C12.3989 13 13.0101 12.5059 13.1583 11.8143L14.2297 6.81429C14.4129 5.95961 13.832 5.14952 13 5.01844Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
            />
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
    Terminal: ({ className, ...props }: IconProps) => (
        <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <rect
                x="1.47"
                y="1.97"
                width="12.06"
                height="11.06"
                rx="1.03"
                stroke="currentColor"
                strokeWidth="0.94"
            />
            <path
                d="M4 9.5L6 7.5L4 5.5"
                stroke="currentColor"
                strokeWidth="0.84"
                strokeLinecap="round"
            />
            <path
                d="M7.5 9.5L10.9989 9.49303"
                stroke="currentColor"
                strokeWidth="0.9"
                strokeLinecap="round"
            />
        </svg>
    ),
    H1: ({ className, ...props }: IconProps) => (
        <H1Icon
            className={className}
            letterClassName={cn('letter', {
                'fill-foreground/50 dark:fill-foreground/50': !className?.includes(
                    'fill-white dark:fill-primary',
                ),
            })}
            levelClassName={cn('level', {
                'fill-foreground dark:fill-foreground': !className?.includes(
                    'fill-white dark:fill-primary',
                ),
            })}
            {...props}
        />
    ),
    H2: ({ className, ...props }: IconProps) => (
        <H2Icon
            className={className}
            letterClassName={cn('letter', {
                'fill-foreground/50 dark:fill-foreground/50': !className?.includes(
                    'fill-white dark:fill-primary',
                ),
            })}
            levelClassName={cn('level', {
                'fill-foreground dark:fill-foreground': !className?.includes(
                    'fill-white dark:fill-primary',
                ),
            })}
            {...props}
        />
    ),
    H3: ({ className, ...props }: IconProps) => (
        <H3Icon
            className={className}
            letterClassName={cn('letter', {
                'fill-foreground/50 dark:fill-foreground/50': !className?.includes(
                    'fill-white dark:fill-primary',
                ),
            })}
            levelClassName={cn('level', {
                'fill-foreground dark:fill-foreground': !className?.includes(
                    'fill-white dark:fill-primary',
                ),
            })}
            {...props}
        />
    ),
    H4: ({ className, ...props }: IconProps) => (
        <H4Icon
            className={className}
            letterClassName={cn(
                {
                    'fill-foreground/50 dark:fill-foreground/50': !className?.includes(
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
                    'fill-foreground/50 dark:fill-foreground/50': !className?.includes(
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
                    'fill-foreground/50 dark:fill-foreground/50': !className?.includes(
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
    Landscape: ({ className, ...props }: IconProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <rect width="20" height="12" x="2" y="6" rx="2" />
        </svg>
    ),
    Layers: ({ className, ...props }: IconProps) => (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M8.05648 3.36597C8.02029 3.35197 7.9801 3.35197 7.94385 3.36597L2.80306 5.35219C2.66981 5.40368 2.66981 5.59221 2.80306 5.64369L7.94385 7.62993C7.9801 7.64393 8.02029 7.64393 8.05648 7.62993L13.1973 5.64369C13.3305 5.59221 13.3305 5.40368 13.1973 5.35219L8.05648 3.36597ZM7.60597 2.49147C7.85966 2.39347 8.14072 2.39347 8.39435 2.49147L13.5352 4.4777C14.4679 4.83807 14.4679 6.15781 13.5352 6.51819L8.39435 8.50443C8.14072 8.60243 7.85966 8.60243 7.60597 8.50443L2.46519 6.51819C1.53244 6.15781 1.53244 4.83808 2.46519 4.4777L7.60597 2.49147Z"
                fill="currentColor"
            />
            <path
                d="M13.5352 9.02203L8.39435 11.0083C8.14072 11.1063 7.85966 11.1063 7.60597 11.0083L2.46519 9.02203C1.90934 8.80728 1.68473 8.25184 1.79137 7.76172L7.91747 10.1287C7.94091 10.1377 7.96541 10.1428 7.9901 10.144C7.99572 10.1443 8.00141 10.1443 8.00704 10.1441C8.03329 10.1434 8.05947 10.1383 8.08441 10.1287L14.2091 7.76228C14.3155 8.25222 14.0909 8.80734 13.5352 9.02203Z"
                fill="currentColor"
            />
            <path
                d="M13.5352 11.522L8.39436 13.5082C8.14073 13.6062 7.85967 13.6062 7.60598 13.5082L2.46519 11.522C1.90934 11.3072 1.68473 10.7518 1.79137 10.2617L7.91748 12.6286C7.94092 12.6377 7.96542 12.6428 7.99011 12.6439C7.99573 12.6443 8.00142 12.6443 8.00704 12.6441C8.03329 12.6434 8.05948 12.6382 8.08442 12.6286L14.2091 10.2622C14.3155 10.7522 14.0909 11.3073 13.5352 11.522Z"
                fill="currentColor"
            />
        </svg>
    ),
    Play: ({ className, ...props }: IconProps) => (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12.25 3.75C7.55558 3.75 3.75 7.55558 3.75 12.25C3.75 16.9444 7.55558 20.75 12.25 20.75C16.9444 20.75 20.75 16.9444 20.75 12.25C20.75 7.55558 16.9444 3.75 12.25 3.75ZM2.25 12.25C2.25 6.72715 6.72715 2.25 12.25 2.25C17.7728 2.25 22.25 6.72715 22.25 12.25C22.25 17.7728 17.7728 22.25 12.25 22.25C6.72715 22.25 2.25 17.7728 2.25 12.25Z"
                fill="currentColor"
            />
            <path
                d="M10.25 15.054V9.44617C10.25 9.04446 10.6998 8.80676 11.0317 9.03305L15.1441 11.837C15.4352 12.0355 15.4352 12.4647 15.1441 12.6632L11.0317 15.4671C10.6998 15.6934 10.25 15.4557 10.25 15.054Z"
                fill="currentColor"
            />
        </svg>
    ),
    Potrait: ({ className, ...props }: IconProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            <rect width="12" height="20" x="6" y="2" rx="2" />
        </svg>
    ),
    Sparkles: ({ className, ...props }: IconProps) => (
        <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <path
                d="M12.0312 8.125C8.87219 8.39844 7.14844 10.1222 6.875 13.2812C6.59 10.0731 4.87526 8.48256 1.71875 8.125C4.92515 7.75519 6.50519 6.17515 6.875 2.96875C7.23256 6.12526 8.82306 7.84 12.0312 8.125Z"
                stroke="currentColor"
                strokeWidth="0.9375"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M12.3686 0.786775C12.3582 0.694694 12.2804 0.625094 12.1877 0.625C12.095 0.624906 12.017 0.69435 12.0064 0.786406C11.9374 1.38501 11.7584 1.80594 11.4697 2.09466C11.1809 2.38339 10.76 2.56237 10.1614 2.63141C10.0694 2.64203 9.99988 2.72002 10 2.81269C10.0001 2.90536 10.0697 2.98321 10.1618 2.99363C10.7505 3.06032 11.1804 3.23922 11.4759 3.52946C11.7704 3.81861 11.9531 4.23944 12.0059 4.83384C12.0143 4.92797 12.0932 5.00011 12.1877 5C12.2822 4.99989 12.3609 4.92758 12.3691 4.83343C12.4198 4.24881 12.6023 3.81912 12.8982 3.52319C13.1941 3.22726 13.6238 3.04472 14.2084 2.99411C14.3026 2.98596 14.3749 2.90721 14.375 2.81271C14.3751 2.7182 14.303 2.63929 14.2088 2.63093C13.6144 2.57813 13.1936 2.39541 12.9044 2.10094C12.6142 1.80536 12.4353 1.37549 12.3686 0.786775Z"
                fill="currentColor"
            />
        </svg>
    ),
    Stop: ({ className, ...props }: IconProps) => (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <path d="M9.5 9.5H14.5V14.5H9.5V9.5Z" fill="currentColor" />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 3.5C7.30558 3.5 3.5 7.30558 3.5 12C3.5 16.6944 7.30558 20.5 12 20.5C16.6944 20.5 20.5 16.6944 20.5 12C20.5 7.30558 16.6944 3.5 12 3.5ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12Z"
                fill="currentColor"
            />
        </svg>
    ),
    Styles: ({ className, ...props }: IconProps) => (
        <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <path
                d="M4.21875 4.375V5.15625C4.21875 5.84661 4.77839 6.40625 5.46875 6.40625H11.4062C12.0966 6.40625 12.6562 5.84661 12.6562 5.15625V3.59375C12.6562 2.90339 12.0966 2.34375 11.4062 2.34375H5.46875C4.77839 2.34375 4.21875 2.90339 4.21875 3.59375V4.375ZM4.21875 4.375H2.96875C2.62357 4.375 2.34375 4.65482 2.34375 5V7.03125C2.34375 7.72162 2.90339 8.28125 3.59375 8.28125H7.5C7.84519 8.28125 8.125 8.56106 8.125 8.90625V9.6875M9.53125 13.2812V11.4062C9.53125 10.6296 8.90162 10 8.125 10C7.34838 10 6.71875 10.6296 6.71875 11.4062V13.2812"
                stroke="currentColor"
                strokeWidth="0.9375"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    Lightbulb: ({ className, ...props }: IconProps) => (
        <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <path
                d="M5.46661 11.0938V10.6878C5.46661 10.4515 5.33135 10.2385 5.13002 10.1149C4.99455 10.0316 4.8638 9.9415 4.73826 9.84494C3.66103 9.0165 2.9668 7.71456 2.9668 6.25056C2.9668 3.74771 4.99575 1.71875 7.49858 1.71875C10.0015 1.71875 12.0304 3.74771 12.0304 6.25056C12.0304 7.71456 11.3361 9.0165 10.259 9.84494C10.1334 9.9415 10.0026 10.0316 9.8672 10.1149C9.66583 10.2385 9.53058 10.4515 9.53058 10.6878V11.0938M5.46661 11.0938V11.8743C5.46661 12.9965 6.37639 13.9062 7.49858 13.9062C8.62083 13.9062 9.53058 12.9965 9.53058 11.8743V11.0938M5.46661 11.0938H9.53058"
                stroke="currentColor"
                strokeWidth="0.9375"
                strokeLinecap="square"
                strokeLinejoin="round"
            />
        </svg>
    ),
    LightbulbSlash: ({ className, ...props }: IconProps) => (
        <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <path
                d="M5.46661 11.0938V10.6878C5.46661 10.4515 5.33135 10.2385 5.13002 10.1149C4.99455 10.0316 4.8638 9.9415 4.73826 9.84494C3.66103 9.0165 2.9668 7.71456 2.9668 6.25056C2.9668 5.43145 3.18411 4.66309 3.56423 4M5.46661 11.0938V11.8743C5.46661 12.9965 6.37639 13.9062 7.49858 13.9062C8.62083 13.9062 9.53058 12.9965 9.53058 11.8743V11.0938M5.46661 11.0938H7.49859H9.53058M9.53058 11.0938V10.6878C9.54789 10.432 9.85184 10.1149 9.85184 10.1149"
                stroke="currentColor"
                strokeWidth="0.9375"
                strokeLinecap="square"
                strokeLinejoin="round"
            />
            <path
                d="M1.71875 1.71875L12.5 12.5"
                stroke="currentColor"
                strokeWidth="0.9375"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M11.3816 8.58925C11.7938 7.9065 12.0309 7.10621 12.0309 6.25056C12.0309 3.74771 10.002 1.71875 7.4991 1.71875C6.63093 1.71875 5.58622 1.90585 5.22461 2.2983"
                stroke="currentColor"
                strokeWidth="0.9375"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    ArrowDown: ArrowDownIcon,
    ArrowLeft: ArrowLeftIcon,
    ArrowRight: ArrowRightIcon,
    ArrowUp: ArrowUpIcon,
    AlignLeft: AlignLeftIcon,
    AlignCenterHorizontally: AlignCenterHorizontallyIcon,
    AlignRight: AlignRightIcon,
    AlignTop: AlignTopIcon,
    AlignCenterVertically: AlignCenterVerticallyIcon,
    AlignBottom: AlignBottomIcon,

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
    Bookmark: BookmarkIcon,
    BookmarkFilled: BookmarkFilledIcon,

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
    CursorArrow: CursorArrowIcon,
    Circle: CircleIcon,

    Desktop: DesktopIcon,
    DiscordLogo: DiscordLogoIcon,
    DotsVertical: DotsVerticalIcon,
    DotsHorizontal: DotsHorizontalIcon,
    Download: DownloadIcon,
    DropdownMenu: DropdownMenuIcon,
    DragHandleDots: DragHandleDots2Icon,

    ExclamationTriangle: ExclamationTriangleIcon,
    Exit: ExitIcon,
    ExternalLink: ExternalLinkIcon,
    EyeOpen: EyeOpenIcon,
    EyeClosed: EyeClosedIcon,
    EnvelopeClosed: EnvelopeClosedIcon,

    File: FileIcon,
    FilePlus: FilePlusIcon,
    Frame: FrameIcon,

    Gear: GearIcon,
    GitHubLogo: GitHubLogoIcon,
    Globe: GlobeIcon,
    Group: GroupIcon,

    Hand: HandIcon,

    Image: ImageIcon,
    Input: InputIcon,
    InfoCircled: InfoCircledIcon,

    Keyboard: KeyboardIcon,

    Laptop: LaptopIcon,
    Link: Link2Icon,
    LinkNone: LinkNone1Icon,
    ListBullet: ListBulletIcon,
    LockOpen: LockOpen1Icon,
    LockClosed: LockClosedIcon,

    MagnifyingGlass: MagnifyingGlassIcon,
    MagicWand: MagicWandIcon,
    Minus: MinusIcon,
    MinusCircled: MinusCircledIcon,
    Mobile: MobileIcon,
    Moon: MoonIcon,
    MixerHorizontal: MixerHorizontalIcon,

    Pencil: Pencil1Icon,
    PencilPaper: Pencil2Icon,
    Pilcrow: PilcrowIcon,
    PinLeft: PinLeftIcon,
    PinRight: PinRightIcon,
    Plus: PlusIcon,
    PlusCircled: PlusCircledIcon,
    Person: PersonIcon,

    QuestionMarkCircled: QuestionMarkCircledIcon,
    Reload: ReloadIcon,
    Reset: ResetIcon,
    RowSpacing: RowSpacingIcon,

    Scissors: ScissorsIcon,
    Section: SectionIcon,
    Shadow: ShadowIcon,
    Share: Share2Icon,
    Size: SizeIcon,
    Sun: SunIcon,
    SpaceBetweenHorizontally: SpaceBetweenHorizontallyIcon,
    SpaceBetweenVertically: SpaceBetweenVerticallyIcon,
    Square: SquareIcon,
    SketchLogo: SketchLogoIcon,

    Text: TextIcon,
    TextAlignCenter: TextAlignCenterIcon,
    TextAlignLeft: TextAlignLeftIcon,
    TextAlignRight: TextAlignRightIcon,
    Trash: TrashIcon,
    Tokens: TokensIcon,
    Upload: UploadIcon,

    Video: VideoIcon,
    ViewGrid: ViewGridIcon,
    ViewHorizontal: ViewHorizontalIcon,
    ViewVertical: ViewVerticalIcon,
    EmptyState: ({ className, ...props }: IconProps) => (
        <svg
            width="130"
            height="119"
            viewBox="0 0 130 119"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <g filter="url(#filter0_d_4954_166260)">
                <rect
                    x="14.75"
                    y="10.5"
                    width="90"
                    height="90"
                    fill="url(#paint0_linear)"
                    fillOpacity="0.2"
                    shapeRendering="crispEdges"
                />
                <rect
                    x="15"
                    y="10.75"
                    width="89.5"
                    height="89.5"
                    className="stroke-gray-300 dark:stroke-gray-600"
                    strokeWidth="0.5"
                    strokeDasharray="4 4"
                    shapeRendering="crispEdges"
                />
            </g>
            <g filter="url(#filter1_d_4954_166260)">
                <path
                    d="M112.018 81.4171L117.758 78.8025L111.789 65.6879L122.654 65.2087L98.5703 44.3438V76.1775L106.039 68.3025L112.018 81.4171Z"
                    className="fill-gray-200 stroke-gray-400 dark:fill-gray-900 dark:stroke-gray-500"
                    strokeLinejoin="round"
                />
            </g>
            <defs>
                <linearGradient
                    id="paint0_linear"
                    x1="59.75"
                    y1="10.5"
                    x2="59.75"
                    y2="100.5"
                    gradientUnits="userSpaceOnUse"
                >
                    <stop className="[stop-color:theme(colors.gray.50)] dark:[stop-color:theme(colors.gray.700)]" />
                    <stop
                        offset="1"
                        className="[stop-color:theme(colors.gray.200)] dark:[stop-color:theme(colors.gray.900)]"
                    />
                </linearGradient>
                <filter
                    id="filter0_d_4954_166260"
                    x="0.75"
                    y="0.5"
                    width="118"
                    height="118"
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
                    <feOffset dy="4" />
                    <feGaussianBlur stdDeviation="7" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
                    />
                    <feBlend
                        mode="normal"
                        in2="BackgroundImageFix"
                        result="effect1_dropShadow_4954_166260"
                    />
                    <feBlend
                        mode="normal"
                        in="SourceGraphic"
                        in2="effect1_dropShadow_4954_166260"
                        result="shape"
                    />
                </filter>
                <filter
                    id="filter1_d_4954_166260"
                    x="85.25"
                    y="43"
                    width="48"
                    height="48"
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
                    <feOffset dy="4" />
                    <feGaussianBlur stdDeviation="2" />
                    <feComposite in2="hardAlpha" operator="out" />
                    <feColorMatrix
                        type="matrix"
                        values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"
                    />
                    <feBlend
                        mode="normal"
                        in2="BackgroundImageFix"
                        result="effect1_dropShadow_4954_166260"
                    />
                    <feBlend
                        mode="normal"
                        in="SourceGraphic"
                        in2="effect1_dropShadow_4954_166260"
                        result="shape"
                    />
                </filter>
            </defs>
        </svg>
    ),
} satisfies { [key: string]: React.FC<IconProps> };
