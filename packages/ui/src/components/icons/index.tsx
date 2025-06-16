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
    CornerTopLeftIcon,
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
    MixerVerticalIcon,
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
import { MailXIcon } from 'lucide-react';
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
            viewBox="0 0 22 22"
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
            width="139"
            height="17"
            viewBox="0 0 139 17"
            fill="none"
            className={cn('w-auto h-auto preserve-aspect-ratio dark:invert', className)}
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
    DirectManipulation: ({ className, ...props }: IconProps) => (
        <svg
            width={15}
            height={15}
            viewBox="0 0 15 15"
            fill="none"
            className={className}
            {...props}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M10.5 4V4.83333C10.5 5.20152 10.7985 5.5 11.1667 5.5H12M10.5 4V3.16667C10.5 2.79848 10.7985 2.5 11.1667 2.5H12.8333C13.2015 2.5 13.5 2.79848 13.5 3.16667V4.83333C13.5 5.20152 13.2015 5.5 12.8333 5.5H12M10.5 4H5.5M12 5.5V6.83333M4 5.5V10.5M5.33333 12V11.1667C5.33333 10.7985 5.03485 10.5 4.66667 10.5H3.16667C2.79848 10.5 2.5 10.7985 2.5 11.1667V12.8333C2.5 13.2015 2.79848 13.5 3.16667 13.5H4.66667C5.03485 13.5 5.33333 13.2015 5.33333 12.8333V12ZM5.33333 12H6.83333M3.16667 5.5H4.83333C5.20152 5.5 5.5 5.20152 5.5 4.83333V3.16667C5.5 2.79848 5.20152 2.5 4.83333 2.5H3.16667C2.79848 2.5 2.5 2.79848 2.5 3.16667V4.83333C2.5 5.20152 2.79848 5.5 3.16667 5.5ZM8.61087 8.17453L13.1652 9.4758C13.4697 9.5628 13.5144 9.97573 13.2356 10.1259L11.3075 11.1641C11.2467 11.1968 11.1968 11.2467 11.1641 11.3075L10.1259 13.2356C9.97573 13.5144 9.5628 13.4697 9.4758 13.1652L8.17453 8.61087C8.09847 8.3446 8.3446 8.09847 8.61087 8.17453Z"
                stroke="currentColor"
                fill="stroke:currentColor; stroke-opacity:1;"
                strokeLinecap="round"
                strokeLinejoin="round"
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
    Opacity: ({ className, ...props }: IconProps) => (
        <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <path
                d="M14.625 5.2125V12.7875H15.75V5.2125H14.625ZM12.7875 14.625H5.2125V15.75H12.7875V14.625ZM3.375 12.7875V5.2125H2.25V12.7875H3.375ZM5.2125 3.375H12.7875V2.25H5.2125V3.375ZM5.2125 14.625C4.78318 14.625 4.49502 14.6246 4.27311 14.6064C4.05776 14.5889 3.9548 14.5574 3.88688 14.5229L3.37615 15.5252C3.62909 15.6541 3.89659 15.7044 4.1815 15.7277C4.45985 15.7505 4.80174 15.75 5.2125 15.75V14.625ZM2.25 12.7875C2.25 13.1983 2.24957 13.5401 2.27231 13.8185C2.29559 14.1035 2.34592 14.3709 2.4748 14.6239L3.47718 14.1131C3.44258 14.0452 3.41117 13.9422 3.39357 13.7269C3.37544 13.505 3.375 13.2168 3.375 12.7875H2.25ZM3.88688 14.5229C3.71048 14.4329 3.56706 14.2895 3.47718 14.1131L2.4748 14.6239C2.67254 15.0119 2.98806 15.3275 3.37615 15.5252L3.88688 14.5229ZM14.625 12.7875C14.625 13.2168 14.6246 13.505 14.6064 13.7269C14.5889 13.9422 14.5574 14.0452 14.5229 14.1131L15.5252 14.6239C15.6541 14.3709 15.7044 14.1035 15.7277 13.8185C15.7505 13.5401 15.75 13.1983 15.75 12.7875H14.625ZM12.7875 15.75C13.1983 15.75 13.5401 15.7505 13.8185 15.7277C14.1035 15.7044 14.3709 15.6541 14.6239 15.5252L14.1131 14.5229C14.0452 14.5574 13.9422 14.5889 13.7269 14.6064C13.505 14.6246 13.2168 14.625 12.7875 14.625V15.75ZM14.5229 14.1131C14.4329 14.2895 14.2895 14.4329 14.1131 14.5229L14.6239 15.5252C15.0119 15.3275 15.3275 15.0119 15.5252 14.6239L14.5229 14.1131ZM15.75 5.2125C15.75 4.80174 15.7505 4.45985 15.7277 4.1815C15.7044 3.89659 15.6541 3.62909 15.5252 3.37615L14.5229 3.88688C14.5574 3.9548 14.5889 4.05776 14.6064 4.27311C14.6246 4.49502 14.625 4.78318 14.625 5.2125H15.75ZM12.7875 3.375C13.2168 3.375 13.505 3.37544 13.7269 3.39357C13.9422 3.41117 14.0452 3.44258 14.1131 3.47718L14.6239 2.4748C14.3709 2.34592 14.1035 2.29559 13.8185 2.27231C13.5401 2.24957 13.1983 2.25 12.7875 2.25V3.375ZM15.5252 3.37615C15.3275 2.98806 15.0119 2.67254 14.6239 2.4748L14.1131 3.47718C14.2895 3.56706 14.4329 3.71048 14.5229 3.88688L15.5252 3.37615ZM3.375 5.2125C3.375 4.78318 3.37544 4.49502 3.39357 4.27311C3.41117 4.05776 3.44258 3.9548 3.47718 3.88688L2.4748 3.37615C2.34592 3.62909 2.29559 3.89659 2.27231 4.1815C2.24957 4.45985 2.25 4.80174 2.25 5.2125H3.375ZM5.2125 2.25C4.80174 2.25 4.45985 2.24957 4.1815 2.27231C3.89659 2.29559 3.62909 2.34592 3.37615 2.4748L3.88688 3.47718C3.9548 3.44258 4.05776 3.41117 4.27311 3.39357C4.49502 3.37544 4.78318 3.375 5.2125 3.375V2.25ZM3.47718 3.88688C3.56706 3.71048 3.71048 3.56706 3.88688 3.47718L3.37615 2.4748C2.98806 2.67254 2.67254 2.98806 2.4748 3.37615L3.47718 3.88688Z"
                fill="currentColor"
            />
            <path
                d="M6.6748 12C7.04753 12 7.3495 12.3021 7.34961 12.6748C7.34961 13.0476 7.0476 13.3496 6.6748 13.3496C6.3021 13.3495 6 13.0475 6 12.6748C6.00011 12.3022 6.30217 12.0001 6.6748 12ZM8.6748 12C9.04753 12 9.3495 12.3021 9.34961 12.6748C9.34961 13.0476 9.0476 13.3496 8.6748 13.3496C8.3021 13.3495 8 13.0475 8 12.6748C8.00011 12.3022 8.30217 12.0001 8.6748 12ZM10.6748 12C11.0475 12 11.3495 12.3021 11.3496 12.6748C11.3496 13.0476 11.0476 13.3496 10.6748 13.3496C10.3021 13.3495 10 13.0475 10 12.6748C10.0001 12.3022 10.3022 12.0001 10.6748 12ZM12.6748 12C13.0475 12 13.3495 12.3021 13.3496 12.6748C13.3496 13.0476 13.0476 13.3496 12.6748 13.3496C12.3021 13.3495 12 13.0475 12 12.6748C12.0001 12.3022 12.3022 12.0001 12.6748 12ZM8.6748 10C9.04753 10 9.3495 10.3021 9.34961 10.6748C9.34961 11.0476 9.0476 11.3496 8.6748 11.3496C8.3021 11.3495 8 11.0475 8 10.6748C8.00011 10.3022 8.30217 10.0001 8.6748 10ZM10.6748 10C11.0475 10 11.3495 10.3021 11.3496 10.6748C11.3496 11.0476 11.0476 11.3496 10.6748 11.3496C10.3021 11.3495 10 11.0475 10 10.6748C10.0001 10.3022 10.3022 10.0001 10.6748 10ZM12.6748 10C13.0475 10 13.3495 10.3021 13.3496 10.6748C13.3496 11.0476 13.0476 11.3496 12.6748 11.3496C12.3021 11.3495 12 11.0475 12 10.6748C12.0001 10.3022 12.3022 10.0001 12.6748 10ZM10.6748 8C11.0475 8 11.3495 8.3021 11.3496 8.6748C11.3496 9.0476 11.0476 9.34961 10.6748 9.34961C10.3021 9.3495 10 9.04753 10 8.6748C10.0001 8.30217 10.3022 8.00011 10.6748 8ZM12.6748 8C13.0475 8 13.3495 8.3021 13.3496 8.6748C13.3496 9.0476 13.0476 9.34961 12.6748 9.34961C12.3021 9.3495 12 9.04753 12 8.6748C12.0001 8.30217 12.3022 8.00011 12.6748 8ZM12.6748 6C13.0475 6 13.3495 6.3021 13.3496 6.6748C13.3496 7.0476 13.0476 7.34961 12.6748 7.34961C12.3021 7.3495 12 7.04753 12 6.6748C12.0001 6.30217 12.3022 6.00011 12.6748 6Z"
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
    Portrait: ({ className, ...props }: IconProps) => (
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
    Brand: ({ className, ...props }: IconProps) => (
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
                d="M2.96875 2.1875H6.40625V1.25H2.96875V2.1875ZM7.1875 2.96875V10.3125H8.125V2.96875H7.1875ZM2.1875 10.3125V2.96875H1.25V10.3125H2.1875ZM4.6875 12.8125C3.30679 12.8125 2.1875 11.6932 2.1875 10.3125H1.25C1.25 12.211 2.78902 13.75 4.6875 13.75V12.8125ZM7.1875 10.3125C7.1875 11.6932 6.06821 12.8125 4.6875 12.8125V13.75C6.586 13.75 8.125 12.211 8.125 10.3125H7.1875ZM2.96875 1.25C2.01951 1.25 1.25 2.01951 1.25 2.96875H2.1875C2.1875 2.53727 2.53727 2.1875 2.96875 2.1875V1.25ZM7.26175 2.41667L10.2387 4.13543L10.7074 3.32352L7.7305 1.60478L7.26175 2.41667ZM10.5246 5.20263L6.85275 11.5625L7.66469 12.0312L11.3366 5.67138L10.5246 5.20263ZM10.8648 4.76152L12.5836 7.7385L13.3954 7.26975L11.6767 4.29277L10.8648 4.76152ZM12.2976 8.80569L5.93772 12.4776L6.4065 13.2894L12.7664 9.61756L12.2976 8.80569ZM12.5836 7.7385C12.7993 8.11213 12.6713 8.58994 12.2976 8.80569L12.7664 9.61756C13.5884 9.143 13.8701 8.09181 13.3954 7.26975L12.5836 7.7385ZM7.7305 1.60478C7.49619 1.4695 7.242 1.39533 6.98762 1.37818L6.92456 2.31356C7.03919 2.32128 7.15419 2.35457 7.26175 2.41667L7.7305 1.60478ZM6.40625 2.1875C6.53044 2.1875 6.64656 2.21612 6.74963 2.2667L7.16256 1.42504C6.93381 1.3128 6.67669 1.25 6.40625 1.25V2.1875ZM6.74963 2.2667C7.00994 2.39441 7.1875 2.66128 7.1875 2.96875H8.125C8.125 2.29011 7.73163 1.70423 7.16256 1.42504L6.74963 2.2667ZM11.6767 4.29277C11.5415 4.05854 11.3585 3.86727 11.1469 3.72526L10.6245 4.50372C10.7199 4.56771 10.8027 4.65399 10.8648 4.76152L11.6767 4.29277ZM10.2387 4.13543C10.3462 4.19751 10.4325 4.28036 10.4965 4.37571L11.2749 3.85327C11.1329 3.64168 10.9416 3.45874 10.7074 3.32352L10.2387 4.13543ZM10.4965 4.37571C10.6581 4.61645 10.6784 4.93636 10.5246 5.20263L11.3366 5.67138C11.6759 5.08366 11.6281 4.37957 11.2749 3.85327L10.4965 4.37571ZM5.3125 10.3125C5.3125 10.6577 5.03268 10.9375 4.6875 10.9375V11.875C5.55044 11.875 6.25 11.1754 6.25 10.3125H5.3125ZM4.6875 10.9375C4.34232 10.9375 4.0625 10.6577 4.0625 10.3125H3.125C3.125 11.1754 3.82456 11.875 4.6875 11.875V10.9375ZM4.0625 10.3125C4.0625 9.96731 4.34232 9.6875 4.6875 9.6875V8.75C3.82456 8.75 3.125 9.44956 3.125 10.3125H4.0625ZM4.6875 9.6875C5.03268 9.6875 5.3125 9.96731 5.3125 10.3125H6.25C6.25 9.44956 5.55044 8.75 4.6875 8.75V9.6875Z"
                fill="currentColor"
            />
        </svg>
    ),
    Edit: ({ className, ...props }: IconProps) => (
        <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M7.03125 2.8125C7.29013 2.8125 7.5 2.60263 7.5 2.34375C7.5 2.08487 7.29013 1.875 7.03125 1.875V2.8125ZM13.125 7.96875V7.5H12.1875V7.96875H13.125ZM10.6563 12.1875H4.34375V13.125H10.6563V12.1875ZM2.8125 10.6563V4.34375H1.875V10.6563H2.8125ZM4.34375 2.8125H7.03125V1.875H4.34375V2.8125ZM12.1875 7.96875V10.6563H13.125V7.96875H12.1875ZM4.34375 12.1875C3.98598 12.1875 3.74585 12.1871 3.56093 12.172C3.38147 12.1574 3.29567 12.1312 3.23907 12.1024L2.81346 12.9377C3.02424 13.0451 3.24716 13.087 3.48458 13.1064C3.71654 13.1254 4.00145 13.125 4.34375 13.125V12.1875ZM1.875 10.6563C1.875 10.9986 1.87464 11.2834 1.89359 11.5154C1.91299 11.7529 1.95493 11.9758 2.06233 12.1866L2.89765 11.7609C2.86881 11.7043 2.84264 11.6185 2.82798 11.4391C2.81286 11.2541 2.8125 11.014 2.8125 10.6563H1.875ZM3.23907 12.1024C3.09207 12.0274 2.97255 11.9079 2.89765 11.7609L2.06233 12.1866C2.22711 12.5099 2.49005 12.7729 2.81346 12.9377L3.23907 12.1024ZM10.6563 13.125C10.9986 13.125 11.2834 13.1254 11.5154 13.1064C11.7529 13.087 11.9758 13.0451 12.1866 12.9377L11.7609 12.1024C11.7043 12.1312 11.6185 12.1574 11.4391 12.172C11.2541 12.1871 11.014 12.1875 10.6563 12.1875V13.125ZM12.1875 10.6563C12.1875 11.014 12.1871 11.2541 12.172 11.4391C12.1574 11.6185 12.1312 11.7043 12.1024 11.7609L12.9377 12.1866C13.0451 11.9758 13.087 11.7529 13.1064 11.5154C13.1254 11.2834 13.125 10.9986 13.125 10.6563H12.1875ZM12.1866 12.9377C12.5099 12.7729 12.7729 12.5099 12.9377 12.1866L12.1024 11.7609C12.0274 11.9079 11.9079 12.0274 11.7609 12.1024L12.1866 12.9377ZM2.8125 4.34375C2.8125 3.98598 2.81286 3.74585 2.82798 3.56093C2.84264 3.38147 2.86881 3.29567 2.89765 3.23907L2.06233 2.81346C1.95493 3.02424 1.91299 3.24716 1.89359 3.48458C1.87464 3.71654 1.875 4.00145 1.875 4.34375H2.8125ZM4.34375 1.875C4.00145 1.875 3.71654 1.87464 3.48458 1.89359C3.24716 1.91299 3.02424 1.95493 2.81346 2.06233L3.23907 2.89765C3.29567 2.86881 3.38147 2.84264 3.56093 2.82798C3.74585 2.81286 3.98598 2.8125 4.34375 2.8125V1.875ZM2.89765 3.23907C2.97255 3.09207 3.09207 2.97255 3.23907 2.89765L2.81346 2.06233C2.49005 2.22711 2.22711 2.49005 2.06233 2.81346L2.89765 3.23907Z"
                fill="currentColor"
            />
            <path
                d="M5.46875 9.52908V7.91302C5.46875 7.7472 5.5346 7.58827 5.65181 7.47102L10.9911 2.13174C11.4793 1.64359 12.2707 1.64359 12.7589 2.13174L12.8661 2.23897C13.3543 2.72713 13.3543 3.51859 12.8661 4.00674L7.52681 9.34608C7.40963 9.46327 7.25063 9.52908 7.08488 9.52908H5.46875Z"
                stroke="currentColor"
                strokeWidth="0.9375"
                strokeLinecap="square"
                strokeLinejoin="round"
            />
        </svg>
    ),
    Key: ({ className, ...props }: IconProps) => (
        <svg
            width="21"
            height="22"
            viewBox="0 0 21 22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <path
                d="M13.5625 12.9688C16.3412 12.9688 18.5938 10.7162 18.5938 7.9375C18.5938 5.15881 16.3412 2.90625 13.5625 2.90625C10.7838 2.90625 8.53125 5.15881 8.53125 7.9375C8.53125 8.35917 8.58312 8.76871 8.68083 9.16012L3.53753 14.3034C3.37344 14.4675 3.28125 14.6901 3.28125 14.9222V17.3438C3.28125 17.827 3.673 18.2188 4.15625 18.2188H6.5779C6.80997 18.2188 7.03252 18.1266 7.19662 17.9625L8.09375 17.0654V14.7188H10.4403L12.34 12.8192C12.7313 12.9169 13.1408 12.9688 13.5625 12.9688Z"
                stroke="currentColor"
                strokeWidth="1.3125"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M15.0938 7.9375C15.0938 8.78319 14.4082 9.46875 13.5625 9.46875C12.7168 9.46875 12.0312 8.78319 12.0312 7.9375C12.0312 7.09181 12.7168 6.40625 13.5625 6.40625C14.4082 6.40625 15.0938 7.09181 15.0938 7.9375Z"
                stroke="currentColor"
                strokeWidth="1.3125"
                strokeLinecap="square"
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
    CornerTopLeft: CornerTopLeftIcon,
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
    MixerVertical: MixerVerticalIcon,

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

    MailX: MailXIcon,

    Text: TextIcon,
    TextAlignCenter: TextAlignCenterIcon,
    TextAlignLeft: TextAlignLeftIcon,
    TextAlignRight: TextAlignRightIcon,
    TextAlignJustified: ({ className, ...props }: IconProps) => (
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
                d="M3.75 4.75H20.25M3.75 12H20.25M3.75 19.25H20.25"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
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
                    <stop className="[stop-color:var(--color-gray-50)] dark:[stop-color:var(--color-gray-700)]" />
                    <stop
                        offset="1"
                        className="[stop-color:var(--color-gray-200)] dark:[stop-color:var(--color-gray-900)]"
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
    TextColorSymbol: ({ className, ...props }: IconProps) => (
        <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M7.78056 0.966376C7.63595 0.666883 7.3327 0.476562 7.00012 0.476562C6.66754 0.476562 6.36429 0.666883 6.21968 0.966376L1.00048 11.7751C0.792354 12.2061 0.973047 12.7242 1.40407 12.9324C1.8351 13.1405 2.35324 12.9598 2.56137 12.5288L4.28366 8.96199H9.71658L11.4389 12.5288C11.647 12.9598 12.1651 13.1405 12.5962 12.9324C13.0272 12.7242 13.2079 12.2061 12.9998 11.7751L7.78056 0.966376ZM8.94399 7.36199L7.00012 3.33634L5.05626 7.36199H8.94399Z"
                fill="currentColor"
            />
        </svg>
    ),
    Width: ({ className, ...props }: IconProps) => (
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
                d="M6 12H18M6 12L8 9M6 12L8 15M18 12L16 9M18 12L16 15M21 21V3M3 21V3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    Height: ({ className, ...props }: IconProps) => (
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
                d="M12 18L12 6M12 18L9 16M12 18L15 16M12 6L9 8M12 6L15 8M21 3H3M21 21H3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    Padding: ({ className, ...props }: IconProps) => (
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
                d="M20.25 17.05V6.95C20.25 5.8299 20.25 5.26984 20.032 4.84202C19.8403 4.46569 19.5343 4.15973 19.158 3.96799C18.7302 3.75 18.1701 3.75 17.05 3.75H6.95C5.8299 3.75 5.26984 3.75 4.84202 3.96799C4.46569 4.15973 4.15973 4.46569 3.96799 4.84202C3.75 5.26984 3.75 5.8299 3.75 6.95V17.05C3.75 18.1701 3.75 18.7302 3.96799 19.158C4.15973 19.5343 4.46569 19.8403 4.84202 20.032C5.26984 20.25 5.8299 20.25 6.95 20.25H17.05C18.1701 20.25 18.7302 20.25 19.158 20.032C19.5343 19.8403 19.8403 19.5343 20.032 19.158C20.25 18.7302 20.25 18.1701 20.25 17.05Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M9 6.75H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M9 17.25H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M17.25 9V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M6.75 9V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    ),
    Margin: ({ className, ...props }: IconProps) => (
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
                d="M18 15.6727V8.32727C18 7.51265 18 7.10534 17.8415 6.7942C17.702 6.5205 17.4795 6.29799 17.2058 6.15854C16.8947 6 16.4873 6 15.6727 6H8.32727C7.51265 6 7.10534 6 6.7942 6.15854C6.5205 6.29799 6.29799 6.5205 6.15854 6.7942C6 7.10534 6 7.51265 6 8.32727V15.6727C6 16.4873 6 16.8947 6.15854 17.2058C6.29799 17.4795 6.5205 17.702 6.7942 17.8415C7.10534 18 7.51265 18 8.32727 18H15.6727C16.4873 18 16.8947 18 17.2058 17.8415C17.4795 17.702 17.702 17.4795 17.8415 17.2058C18 16.8947 18 16.4873 18 15.6727Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M7.5 3H16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M7.5 21H16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M21 7.5V16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M3 7.5L3 16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
    ),
    CornerRadius: ({ className, ...props }: IconProps) => (
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
                d="M20.25 3.75H13.35C9.98969 3.75 8.30953 3.75 7.02606 4.40396C5.89708 4.9792 4.9792 5.89708 4.40396 7.02606C3.75 8.30953 3.75 9.98969 3.75 13.35V20.25"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    Layout: ({ className, ...props }: IconProps) => (
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
                d="M12.1875 4.34375V10.6563H13.125V4.34375H12.1875ZM10.6563 12.1875H4.34375V13.125H10.6563V12.1875ZM2.8125 10.6563V4.34375H1.875V10.6563H2.8125ZM4.34375 2.8125H10.6563V1.875H4.34375V2.8125ZM4.34375 12.1875C3.98598 12.1875 3.74585 12.1871 3.56093 12.172C3.38147 12.1574 3.29567 12.1312 3.23907 12.1024L2.81346 12.9377C3.02424 13.0451 3.24716 13.087 3.48458 13.1064C3.71654 13.1254 4.00145 13.125 4.34375 13.125V12.1875ZM1.875 10.6563C1.875 10.9986 1.87464 11.2834 1.89359 11.5154C1.91299 11.7529 1.95493 11.9758 2.06233 12.1866L2.89765 11.7609C2.86881 11.7043 2.84264 11.6185 2.82798 11.4391C2.81286 11.2541 2.8125 11.014 2.8125 10.6563H1.875ZM3.23907 12.1024C3.09207 12.0274 2.97255 11.9079 2.89765 11.7609L2.06233 12.1866C2.22711 12.5099 2.49005 12.7729 2.81346 12.9377L3.23907 12.1024ZM12.1875 10.6563C12.1875 11.014 12.1871 11.2541 12.172 11.4391C12.1574 11.6185 12.1312 11.7043 12.1024 11.7609L12.9377 12.1866C13.0451 11.9758 13.087 11.7529 13.1064 11.5154C13.1254 11.2834 13.125 10.9986 13.125 10.6563H12.1875ZM10.6563 13.125C10.9986 13.125 11.2834 13.1254 11.5154 13.1064C11.7529 13.087 11.9758 13.0451 12.1866 12.9377L11.7609 12.1024C11.7043 12.1312 11.6185 12.1574 11.4391 12.172C11.2541 12.1871 11.014 12.1875 10.6563 12.1875V13.125ZM12.1024 11.7609C12.0274 11.9079 11.9079 12.0274 11.7609 12.1024L12.1866 12.9377C12.5099 12.7729 12.7729 12.5099 12.9377 12.1866L12.1024 11.7609ZM13.125 4.34375C13.125 4.00145 13.1254 3.71654 13.1064 3.48458C13.087 3.24716 13.0451 3.02424 12.9377 2.81346L12.1024 3.23907C12.1312 3.29567 12.1574 3.38147 12.172 3.56093C12.1871 3.74585 12.1875 3.98598 12.1875 4.34375H13.125ZM10.6563 2.8125C11.014 2.8125 11.2541 2.81286 11.4391 2.82798C11.6185 2.84264 11.7043 2.86881 11.7609 2.89765L12.1866 2.06233C11.9758 1.95493 11.7529 1.91299 11.5154 1.89359C11.2834 1.87464 10.9986 1.875 10.6563 1.875V2.8125ZM12.9377 2.81346C12.7729 2.49005 12.5099 2.22711 12.1866 2.06233L11.7609 2.89765C11.9079 2.97255 12.0274 3.09207 12.1024 3.23907L12.9377 2.81346ZM2.8125 4.34375C2.8125 3.98598 2.81286 3.74585 2.82798 3.56093C2.84264 3.38147 2.86881 3.29567 2.89765 3.23907L2.06233 2.81346C1.95493 3.02424 1.91299 3.24716 1.89359 3.48458C1.87464 3.71654 1.875 4.00145 1.875 4.34375H2.8125ZM4.34375 1.875C4.00145 1.875 3.71654 1.87464 3.48458 1.89359C3.24716 1.91299 3.02424 1.95493 2.81346 2.06233L3.23907 2.89765C3.29567 2.86881 3.38147 2.84264 3.56093 2.82798C3.74585 2.81286 3.98598 2.8125 4.34375 2.8125V1.875ZM2.89765 3.23907C2.97255 3.09207 3.09207 2.97255 3.23907 2.89765L2.81346 2.06233C2.49005 2.22711 2.22711 2.49005 2.06233 2.81346L2.89765 3.23907Z"
                fill="currentColor"
            />
            <path d="M12.6562 6.09375H2.34375" stroke="currentColor" strokeLinecap="square" />
            <path
                d="M7.03125 12.6562V13.125H7.96875V12.6562H7.03125ZM7.96875 6.09375V5.625H7.03125V6.09375H7.96875ZM7.96875 12.6562V6.09375H7.03125V12.6562H7.96875Z"
                fill="currentColor"
            />
        </svg>
    ),
    StateCursor: ({ className, ...props }: IconProps) => (
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
                d="M11.875 16.375L15.464 12.786C15.594 12.656 15.544 12.435 15.3709 12.3736L4.24478 8.42557C4.04643 8.35519 3.85518 8.54643 3.92557 8.74478L7.87354 19.8709C7.93499 20.044 8.15599 20.094 8.28593 19.964L11.875 16.375ZM11.875 16.375L16.75 21.25"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="square"
            />
            <path
                d="M20.25 3.75H10.75"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="square"
            />
            <path
                d="M20.25 7.75H15.75"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="square"
            />
        </svg>
    ),
    BorderEdit: ({ className, ...props }: IconProps) => (
        <svg
            width="16"
            height="12"
            viewBox="0 0 16 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            <rect
                x="1"
                y="1"
                width="14"
                height="1"
                fill="currentColor"
                style={{
                    fillOpacity: 1,
                }}
            />
            <rect
                x="1"
                y="4"
                width="14"
                height="1.75"
                fill="currentColor"
                style={{
                    fillOpacity: 1,
                }}
            />
            <rect
                x="1"
                y="7.75"
                width="14"
                height="3.25"
                fill="currentColor"
                style={{
                    fillOpacity: 1,
                }}
            />
        </svg>
    ),

    BackgroundImage: ({ className, ...props }: IconProps) => (
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
                d="M12.5 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21H17C17.93 21 18.395 21 18.7765 20.8978C19.8117 20.6204 20.6204 19.8117 20.8978 18.7765C21 18.395 21 17.93 21 17M19 8V2M16 5H22M10.5 8.5C10.5 9.60457 9.60457 10.5 8.5 10.5C7.39543 10.5 6.5 9.60457 6.5 8.5C6.5 7.39543 7.39543 6.5 8.5 6.5C9.60457 6.5 10.5 7.39543 10.5 8.5ZM14.99 11.9181L6.53115 19.608C6.05536 20.0406 5.81747 20.2568 5.79643 20.4442C5.77819 20.6066 5.84045 20.7676 5.96319 20.8755C6.10478 21 6.42628 21 7.06929 21H16.456C17.8951 21 18.6147 21 19.1799 20.7582C19.8894 20.4547 20.4547 19.8894 20.7582 19.1799C21 18.6147 21 17.8951 21 16.456C21 15.9717 21 15.7296 20.9471 15.5042C20.8805 15.2208 20.753 14.9554 20.5733 14.7264C20.4303 14.5442 20.2412 14.3929 19.8631 14.0905L17.0658 11.8527C16.6874 11.5499 16.4982 11.3985 16.2898 11.3451C16.1061 11.298 15.9129 11.3041 15.7325 11.3627C15.5279 11.4291 15.3486 11.5921 14.99 11.9181Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    LeftSide: ({ className, ...props }: IconProps) => (
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
                d="M7.5 3H7.51M7.5 12H7.51M7.5 21H7.51M16.5 3H16.51M16.5 12H16.51M16.5 21H16.51M12 3H12.01M12 12H12.01M12 21H12.01M12 16.5H12.01M12 7.5H12.01M21 3H21.01M21 12H21.01M21 21H21.01M21 16.5H21.01M21 7.5H21.01M3 21V3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    RightSide: ({ className, ...props }: IconProps) => (
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
                d="M7.5 3H7.51M7.5 12H7.51M7.5 21H7.51M16.5 3H16.51M16.5 12H16.51M16.5 21H16.51M12 3H12.01M12 12H12.01M12 21H12.01M12 16.5H12.01M12 7.5H12.01M3 3H3.01M3 12H3.01M3 21H3.01M3 16.5H3.01M3 7.5H3.01M21 21V3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    TopSide: ({ className, ...props }: IconProps) => (
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
                d="M3 21H3.01M3 12H3.01M3 16.5H3.01M3 7.5H3.01M7.5 21H7.51M7.5 12H7.51M16.5 21H16.51M16.5 12H16.51M12 21H12.01M12 12H12.01M12 16.5H12.01M12 7.5H12.01M21 21H21.01M21 12H21.01M21 16.5H21.01M21 7.5H21.01M21 3H3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    BottomSide: ({ className, ...props }: IconProps) => (
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
                d="M3 3H3.01M3 12H3.01M3 7.5H3.01M3 16.5H3.01M7.5 3H7.51M7.5 12H7.51M16.5 3H16.51M16.5 12H16.51M12 3H12.01M12 12H12.01M12 7.5H12.01M12 16.5H12.01M21 3H21.01M21 12H21.01M21 7.5H21.01M21 16.5H21.01M21 21H3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    CornerTopRight: ({ className, ...props }: IconProps) => (
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
                d="M3.75 3.75H10.65C14.0103 3.75 15.6905 3.75 16.9739 4.40396C18.1029 4.9792 19.0208 5.89708 19.596 7.02606C20.25 8.30953 20.25 9.98969 20.25 13.35V20.25"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    CornerBottomRight: ({ className, ...props }: IconProps) => (
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
                d="M3.75 20.25H10.65C14.0103 20.25 15.6905 20.25 16.9739 19.596C18.1029 19.0208 19.0208 18.1029 19.596 16.9739C20.25 15.6905 20.25 14.0103 20.25 10.65V3.75"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    CornerBottomLeft: ({ className, ...props }: IconProps) => (
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
                d="M20.25 20.25H13.35C9.98969 20.25 8.30953 20.25 7.02606 19.596C5.89708 19.0208 4.9792 18.1029 4.40396 16.9739C3.75 15.6905 3.75 14.0103 3.75 10.65V3.75"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    PaintBucket: ({ className, ...props }: IconProps) => (
        <svg
            width="18"
            height="18"
            viewBox="0 0 21 17"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M16.1248 10.1174L16.6552 10.6477C16.7958 10.507 16.8749 10.3162 16.8748 10.1173C16.8748 9.9183 16.7957 9.72751 16.655 9.58687L16.1248 10.1174ZM7.5372 0.470882C7.24439 0.177904 6.76952 0.177775 6.47656 0.470595C6.18359 0.763414 6.18346 1.2383 6.47627 1.53127L7.5372 0.470882ZM4.44868 9.79755L5.16196 10.0293L5.16196 10.0293L4.44868 9.79755ZM4.44869 10.4415L5.16198 10.2098L5.16195 10.2097L4.44869 10.4415ZM9.72243 15.7155L9.95424 15.0022L9.95416 15.0021L9.72243 15.7155ZM10.3664 15.7155L10.1346 15.0021L10.1346 15.0022L10.3664 15.7155ZM11.7535 15.5495L16.6552 10.6477L15.5945 9.58704L10.6929 14.4888L11.7535 15.5495ZM16.655 9.58687L10.5748 3.51025L9.5145 4.57126L15.5947 10.6479L16.655 9.58687ZM10.5751 3.51056L7.5372 0.470882L6.47627 1.53127L9.51419 4.57095L10.5751 3.51056ZM10.0447 4.04075C9.51433 3.51041 9.51433 3.51042 9.51432 3.51042C9.51432 3.51043 9.51431 3.51044 9.5143 3.51045C9.51428 3.51046 9.51427 3.51048 9.51425 3.51049C9.51424 3.51051 9.51421 3.51053 9.51419 3.51055C9.51417 3.51058 9.51414 3.5106 9.51411 3.51063C9.51408 3.51066 9.51405 3.51069 9.51402 3.51073C9.51398 3.51076 9.51394 3.5108 9.5139 3.51084C9.51386 3.51088 9.51382 3.51093 9.51377 3.51097C9.51373 3.51102 9.51368 3.51107 9.51363 3.51112C9.51358 3.51117 9.51352 3.51123 9.51346 3.51128C9.5134 3.51134 9.51334 3.5114 9.51328 3.51147C9.51322 3.51153 9.51315 3.51159 9.51308 3.51166C9.51301 3.51173 9.51294 3.5118 9.51287 3.51188C9.51279 3.51195 9.51272 3.51203 9.51264 3.51211C9.51255 3.51219 9.51247 3.51227 9.51239 3.51236C9.5123 3.51245 9.51221 3.51253 9.51212 3.51263C9.51203 3.51272 9.51193 3.51281 9.51184 3.51291C9.51174 3.51301 9.51164 3.51311 9.51154 3.51321C9.51144 3.51331 9.51133 3.51342 9.51122 3.51352C9.51111 3.51363 9.511 3.51374 9.51089 3.51386C9.51078 3.51397 9.51066 3.51409 9.51054 3.51421C9.51042 3.51433 9.5103 3.51445 9.51017 3.51457C9.51005 3.5147 9.50992 3.51482 9.50979 3.51495C9.50966 3.51508 9.50953 3.51522 9.50939 3.51535C9.50926 3.51549 9.50912 3.51563 9.50898 3.51577C9.50884 3.51591 9.5087 3.51605 9.50855 3.5162C9.5084 3.51634 9.50825 3.51649 9.5081 3.51665C9.50795 3.5168 9.5078 3.51695 9.50764 3.51711C9.50748 3.51727 9.50732 3.51743 9.50716 3.51759C9.507 3.51775 9.50683 3.51792 9.50666 3.51808C9.50649 3.51825 9.50632 3.51842 9.50615 3.5186C9.50598 3.51877 9.5058 3.51895 9.50562 3.51912C9.50544 3.5193 9.50526 3.51948 9.50508 3.51967C9.5049 3.51985 9.50471 3.52004 9.50452 3.52023C9.50433 3.52042 9.50414 3.52061 9.50394 3.5208C9.50375 3.521 9.50355 3.52119 9.50335 3.52139C9.50315 3.52159 9.50295 3.5218 9.50275 3.522C9.50254 3.52221 9.50233 3.52241 9.50212 3.52262C9.50191 3.52283 9.5017 3.52305 9.50149 3.52326C9.50127 3.52348 9.50105 3.52369 9.50083 3.52392C9.50061 3.52414 9.50039 3.52436 9.50016 3.52458C9.49994 3.52481 9.49971 3.52504 9.49948 3.52527C9.49925 3.5255 9.49901 3.52573 9.49878 3.52597C9.49854 3.52621 9.4983 3.52644 9.49806 3.52669C9.49782 3.52693 9.49758 3.52717 9.49733 3.52742C9.49708 3.52766 9.49683 3.52791 9.49658 3.52816C9.49633 3.52841 9.49608 3.52867 9.49582 3.52892C9.49557 3.52918 9.49531 3.52944 9.49505 3.5297C9.49478 3.52996 9.49452 3.53023 9.49425 3.53049C9.49399 3.53076 9.49372 3.53103 9.49345 3.5313C9.49317 3.53157 9.4929 3.53185 9.49262 3.53212C9.49235 3.5324 9.49207 3.53268 9.49179 3.53296C9.49151 3.53324 9.49122 3.53353 9.49094 3.53381C9.49065 3.5341 9.49036 3.53439 9.49007 3.53468C9.48978 3.53497 9.48948 3.53526 9.48919 3.53556C9.48889 3.53586 9.48859 3.53616 9.48829 3.53646C9.48799 3.53676 9.48769 3.53706 9.48738 3.53737C9.48707 3.53767 9.48676 3.53798 9.48645 3.53829C9.48614 3.53861 9.48583 3.53892 9.48551 3.53923C9.4852 3.53955 9.48488 3.53987 9.48456 3.54019C9.48424 3.54051 9.48391 3.54083 9.48359 3.54116C9.48326 3.54149 9.48293 3.54181 9.4826 3.54214C9.48227 3.54247 9.48194 3.54281 9.4816 3.54314C9.48127 3.54348 9.48093 3.54382 9.48059 3.54416C9.48025 3.5445 9.47991 3.54484 9.47956 3.54518C9.47922 3.54553 9.47887 3.54587 9.47852 3.54622C9.47817 3.54657 9.47782 3.54693 9.47747 3.54728C9.47711 3.54763 9.47676 3.54799 9.4764 3.54835C9.47604 3.54871 9.47568 3.54907 9.47531 3.54943C9.47495 3.5498 9.47458 3.55016 9.47421 3.55053C9.47385 3.5509 9.47348 3.55127 9.4731 3.55165C9.47273 3.55202 9.47235 3.55239 9.47198 3.55277C9.4716 3.55315 9.47122 3.55353 9.47084 3.55391C9.47045 3.55429 9.47007 3.55468 9.46968 3.55507C9.46929 3.55545 9.46891 3.55584 9.46851 3.55623C9.46812 3.55663 9.46773 3.55702 9.46733 3.55742C9.46694 3.55781 9.46654 3.55821 9.46614 3.55861C9.46574 3.55901 9.46533 3.55942 9.46493 3.55982C9.46452 3.56023 9.46411 3.56063 9.4637 3.56104C9.46329 3.56145 9.46288 3.56187 9.46247 3.56228C9.46205 3.56269 9.46164 3.56311 9.46122 3.56353C9.4608 3.56395 9.46038 3.56437 9.45995 3.56479C9.45953 3.56522 9.45911 3.56564 9.45868 3.56607C9.45825 3.5665 9.45782 3.56693 9.45739 3.56736C9.45696 3.56779 9.45652 3.56823 9.45608 3.56866C9.45565 3.5691 9.45521 3.56954 9.45477 3.56998C9.45433 3.57042 9.45388 3.57087 9.45344 3.57131C9.45299 3.57176 9.45254 3.5722 9.45209 3.57265C9.45164 3.5731 9.45119 3.57356 9.45074 3.57401C9.45028 3.57447 9.44983 3.57492 9.44937 3.57538C9.44891 3.57584 9.44845 3.5763 9.44799 3.57676C9.44752 3.57723 9.44706 3.57769 9.44659 3.57816C9.44612 3.57863 9.44565 3.5791 9.44518 3.57957C9.44471 3.58004 9.44424 3.58051 9.44376 3.58099C9.44328 3.58146 9.44281 3.58194 9.44233 3.58242C9.44185 3.5829 9.44136 3.58339 9.44088 3.58387C9.44039 3.58435 9.43991 3.58484 9.43942 3.58533C9.43893 3.58582 9.43844 3.58631 9.43795 3.5868C9.43745 3.58729 9.43696 3.58779 9.43646 3.58829C9.43597 3.58878 9.43547 3.58928 9.43496 3.58978C9.43446 3.59029 9.43396 3.59079 9.43345 3.59129C9.43295 3.5918 9.43244 3.59231 9.43193 3.59282C9.43142 3.59333 9.43091 3.59384 9.4304 3.59435C9.42988 3.59487 9.42937 3.59538 9.42885 3.5959C9.42833 3.59642 9.42781 3.59694 9.42729 3.59746C9.42677 3.59798 9.42624 3.59851 9.42572 3.59903C9.42519 3.59956 9.42466 3.60009 9.42413 3.60062C9.4236 3.60115 9.42307 3.60168 9.42254 3.60221C9.422 3.60275 9.42147 3.60328 9.42093 3.60382C9.42039 3.60436 9.41985 3.6049 9.41931 3.60544C9.41877 3.60598 9.41822 3.60653 9.41767 3.60707C9.41713 3.60762 9.41658 3.60817 9.41603 3.60872C9.41548 3.60927 9.41493 3.60982 9.41437 3.61038C9.41382 3.61093 9.41326 3.61149 9.41271 3.61205C9.41215 3.6126 9.41159 3.61316 9.41102 3.61373C9.41046 3.61429 9.4099 3.61485 9.40933 3.61542C9.40877 3.61598 9.4082 3.61655 9.40763 3.61712C9.40706 3.61769 9.40649 3.61826 9.40591 3.61884C9.40534 3.61941 9.40476 3.61999 9.40419 3.62056C9.40361 3.62114 9.40303 3.62172 9.40245 3.6223C9.40187 3.62288 9.40128 3.62347 9.4007 3.62405C9.40011 3.62464 9.39952 3.62523 9.39894 3.62582C9.39835 3.6264 9.39775 3.627 9.39716 3.62759C9.39657 3.62818 9.39597 3.62878 9.39538 3.62937C9.39478 3.62997 9.39418 3.63057 9.39358 3.63117C9.39298 3.63177 9.39238 3.63237 9.39177 3.63298C9.39117 3.63358 9.39056 3.63419 9.38996 3.6348C9.38935 3.6354 9.38874 3.63601 9.38813 3.63662C9.38751 3.63724 9.3869 3.63785 9.38629 3.63847C9.38567 3.63908 9.38505 3.6397 9.38443 3.64032C9.38381 3.64094 9.38319 3.64156 9.38257 3.64218C9.38195 3.6428 9.38132 3.64343 9.3807 3.64405C9.38007 3.64468 9.37944 3.64531 9.37881 3.64594C9.37818 3.64657 9.37755 3.6472 9.37692 3.64784C9.37628 3.64847 9.37565 3.6491 9.37501 3.64974C9.37437 3.65038 9.37373 3.65102 9.37309 3.65166C9.37245 3.6523 9.37181 3.65294 9.37116 3.65359C9.37052 3.65423 9.36987 3.65488 9.36923 3.65553C9.36858 3.65617 9.36793 3.65682 9.36728 3.65748C9.36662 3.65813 9.36597 3.65878 9.36532 3.65944C9.36466 3.66009 9.364 3.66075 9.36335 3.66141C9.36269 3.66206 9.36203 3.66272 9.36137 3.66339C9.3607 3.66405 9.36004 3.66471 9.35937 3.66538C9.35871 3.66604 9.35804 3.66671 9.35737 3.66738C9.3567 3.66805 9.35603 3.66872 9.35536 3.66939C9.35469 3.67006 9.35401 3.67074 9.35334 3.67141C9.35266 3.67209 9.35198 3.67277 9.35131 3.67345C9.35063 3.67413 9.34994 3.67481 9.34926 3.67549C9.34858 3.67617 9.3479 3.67686 9.34721 3.67754C9.34652 3.67823 9.34584 3.67892 9.34515 3.67961C9.34446 3.6803 9.34377 3.68099 9.34307 3.68168C9.34238 3.68237 9.34169 3.68307 9.34099 3.68376C9.34029 3.68446 9.3396 3.68516 9.3389 3.68586C9.3382 3.68655 9.3375 3.68726 9.33679 3.68796C9.33609 3.68866 9.33539 3.68937 9.33468 3.69007C9.33398 3.69078 9.33327 3.69148 9.33256 3.69219C9.33185 3.6929 9.33114 3.69361 9.33043 3.69433C9.32972 3.69504 9.329 3.69575 9.32829 3.69647C9.32757 3.69718 9.32685 3.6979 9.32613 3.69862C9.32542 3.69934 9.3247 3.70006 9.32397 3.70078C9.32325 3.7015 9.32253 3.70223 9.3218 3.70295C9.32108 3.70368 9.32035 3.7044 9.31962 3.70513C9.31889 3.70586 9.31816 3.70659 9.31743 3.70732C9.3167 3.70805 9.31597 3.70878 9.31523 3.70952C9.3145 3.71025 9.31376 3.71099 9.31303 3.71173C9.31229 3.71247 9.31155 3.7132 9.31081 3.71395C9.31007 3.71469 9.30933 3.71543 9.30858 3.71617C9.30784 3.71692 9.30709 3.71766 9.30635 3.71841C9.3056 3.71915 9.30485 3.7199 9.3041 3.72065C9.30335 3.7214 9.3026 3.72215 9.30185 3.72291C9.30109 3.72366 9.30034 3.72441 9.29958 3.72517C9.29883 3.72593 9.29807 3.72668 9.29731 3.72744C9.29655 3.7282 9.29579 3.72896 9.29503 3.72972C9.29427 3.73049 9.29351 3.73125 9.29274 3.73201C9.29198 3.73278 9.29121 3.73354 9.29044 3.73431C9.28967 3.73508 9.28891 3.73585 9.28813 3.73662C9.28736 3.73739 9.28659 3.73816 9.28582 3.73894C9.28505 3.73971 9.28427 3.74048 9.28349 3.74126C9.28272 3.74204 9.28194 3.74282 9.28116 3.74359C9.28038 3.74437 9.2796 3.74515 9.27882 3.74594C9.27804 3.74672 9.27725 3.7475 9.27647 3.74829C9.27568 3.74907 9.2749 3.74986 9.27411 3.75065C9.27332 3.75143 9.27253 3.75222 9.27174 3.75301C9.27095 3.75381 9.27016 3.7546 9.26936 3.75539C9.26857 3.75618 9.26778 3.75698 9.26698 3.75777C9.26618 3.75857 9.26539 3.75937 9.26459 3.76017C9.26379 3.76097 9.26299 3.76177 9.26219 3.76257C9.26139 3.76337 9.26058 3.76417 9.25978 3.76498C9.25897 3.76578 9.25817 3.76659 9.25736 3.76739C9.25655 3.7682 9.25575 3.76901 9.25494 3.76982C9.25413 3.77063 9.25332 3.77144 9.2525 3.77225C9.25169 3.77307 9.25088 3.77388 9.25006 3.77469C9.24925 3.77551 9.24843 3.77633 9.24761 3.77714C9.2468 3.77796 9.24598 3.77878 9.24516 3.7796C9.24434 3.78042 9.24351 3.78124 9.24269 3.78207C9.24187 3.78289 9.24104 3.78371 9.24022 3.78454C9.23939 3.78536 9.23857 3.78619 9.23774 3.78702C9.23691 3.78785 9.23608 3.78868 9.23525 3.78951C9.23442 3.79034 9.23359 3.79117 9.23275 3.792C9.23192 3.79284 9.23109 3.79367 9.23025 3.79451C9.22942 3.79534 9.22858 3.79618 9.22774 3.79702C9.2269 3.79785 9.22606 3.79869 9.22522 3.79953C9.22438 3.80038 9.22354 3.80122 9.2227 3.80206C9.22185 3.8029 9.22101 3.80375 9.22016 3.80459C9.21932 3.80544 9.21847 3.80629 9.21762 3.80713C9.21678 3.80798 9.21593 3.80883 9.21508 3.80968C9.21423 3.81053 9.21337 3.81138 9.21252 3.81224C9.21167 3.81309 9.21081 3.81394 9.20996 3.8148C9.2091 3.81565 9.20825 3.81651 9.20739 3.81737C9.20653 3.81822 9.20567 3.81908 9.20481 3.81994C9.20395 3.8208 9.20309 3.82166 9.20223 3.82253C9.20137 3.82339 9.20051 3.82425 9.19964 3.82512C9.19878 3.82598 9.19791 3.82685 9.19704 3.82771C9.19618 3.82858 9.19531 3.82945 9.19444 3.83032C9.19357 3.83119 9.1927 3.83206 9.19183 3.83293C9.19096 3.8338 9.19009 3.83467 9.18921 3.83555C9.18834 3.83642 9.18746 3.8373 9.18659 3.83817C9.18571 3.83905 9.18483 3.83992 9.18396 3.8408C9.18308 3.84168 9.1822 3.84256 9.18132 3.84344C9.18044 3.84432 9.17956 3.8452 9.17867 3.84608C9.17779 3.84697 9.17691 3.84785 9.17602 3.84874C9.17514 3.84962 9.17425 3.85051 9.17337 3.85139C9.17248 3.85228 9.17159 3.85317 9.1707 3.85406C9.16981 3.85495 9.16892 3.85584 9.16803 3.85673C9.16714 3.85762 9.16625 3.85851 9.16536 3.8594C9.16446 3.8603 9.16357 3.86119 9.16267 3.86209C9.16178 3.86298 9.16088 3.86388 9.15999 3.86477C9.15909 3.86567 9.15819 3.86657 9.15729 3.86747C9.15639 3.86837 9.15549 3.86927 9.15459 3.87017C9.15369 3.87107 9.15279 3.87197 9.15188 3.87288C9.15098 3.87378 9.15007 3.87469 9.14917 3.87559C9.14826 3.8765 9.14736 3.8774 9.14645 3.87831C9.14554 3.87922 9.14463 3.88013 9.14372 3.88104C9.14282 3.88194 9.1419 3.88286 9.14099 3.88377C9.14008 3.88468 9.13917 3.88559 9.13826 3.8865C9.13734 3.88742 9.13643 3.88833 9.13551 3.88925C9.1346 3.89016 9.13368 3.89108 9.13277 3.89199C9.13185 3.89291 9.13093 3.89383 9.13001 3.89475C9.12909 3.89567 9.12817 3.89659 9.12725 3.89751C9.12633 3.89843 9.12541 3.89935 9.12449 3.90027C9.12356 3.9012 9.12264 3.90212 9.12172 3.90304C9.12079 3.90397 9.11987 3.90489 9.11894 3.90582C9.11801 3.90675 9.11709 3.90767 9.11616 3.9086C9.11523 3.90953 9.1143 3.91046 9.11337 3.91139C9.11244 3.91232 9.11151 3.91325 9.11058 3.91418C9.10965 3.91511 9.10872 3.91605 9.10778 3.91698C9.10685 3.91791 9.10591 3.91885 9.10498 3.91978C9.10404 3.92072 9.10311 3.92165 9.10217 3.92259C9.10123 3.92353 9.1003 3.92446 9.09936 3.9254C9.09842 3.92634 9.09748 3.92728 9.09654 3.92822C9.0956 3.92916 9.09466 3.9301 9.09372 3.93104C9.09278 3.93199 9.09183 3.93293 9.09089 3.93387C9.08995 3.93482 9.089 3.93576 9.08806 3.93671C9.08711 3.93765 9.08616 3.9386 9.08522 3.93954C9.08427 3.94049 9.08332 3.94144 9.08238 3.94239C9.08143 3.94334 9.08048 3.94428 9.07953 3.94523C9.07858 3.94618 9.07763 3.94714 9.07668 3.94809C9.07572 3.94904 9.07477 3.94999 9.07382 3.95094C9.07287 3.9519 9.07191 3.95285 9.07096 3.95381C9.07 3.95476 9.06905 3.95572 9.06809 3.95667C9.06713 3.95763 9.06618 3.95859 9.06522 3.95954C9.06426 3.9605 9.0633 3.96146 9.06235 3.96242C9.06139 3.96338 9.06043 3.96434 9.05947 3.9653C9.05851 3.96626 9.05754 3.96722 9.05658 3.96818C9.05562 3.96914 9.05466 3.97011 9.05369 3.97107C9.05273 3.97203 9.05177 3.973 9.0508 3.97396C9.04984 3.97493 9.04887 3.97589 9.0479 3.97686C9.04694 3.97783 9.04597 3.97879 9.045 3.97976C9.04404 3.98073 9.04307 3.9817 9.0421 3.98267C9.04113 3.98363 9.04016 3.9846 9.03919 3.98557C9.03822 3.98655 9.03725 3.98752 9.03628 3.98849C9.0353 3.98946 9.03433 3.99043 9.03336 3.99141C9.03239 3.99238 9.03141 3.99335 9.03044 3.99433C9.02946 3.9953 9.02849 3.99628 9.02751 3.99725C9.02654 3.99823 9.02556 3.9992 9.02458 4.00018C9.02361 4.00116 9.02263 4.00213 9.02165 4.00311C9.02067 4.00409 9.0197 4.00507 9.01872 4.00605C9.01774 4.00703 9.01676 4.00801 9.01578 4.00899C9.0148 4.00997 9.01381 4.01095 9.01283 4.01193C9.01185 4.01291 9.01087 4.0139 9.00989 4.01488C9.0089 4.01586 9.00792 4.01685 9.00694 4.01783C9.00595 4.01881 9.00497 4.0198 9.00398 4.02078C9.003 4.02177 9.00201 4.02276 9.00102 4.02374C9.00004 4.02473 8.99905 4.02572 8.99806 4.0267C8.99708 4.02769 8.99609 4.02868 8.9951 4.02967C8.99411 4.03066 8.99312 4.03164 8.99213 4.03263C8.99114 4.03362 8.99015 4.03461 8.98916 4.03561C8.98817 4.0366 8.98718 4.03759 8.98619 4.03858C8.9852 4.03957 8.9842 4.04056 8.98321 4.04156C8.98222 4.04255 8.98122 4.04354 8.98023 4.04454C8.97924 4.04553 8.97824 4.04652 8.97725 4.04752C8.97625 4.04851 8.97526 4.04951 8.97426 4.05051C8.97327 4.0515 8.97227 4.0525 8.97127 4.05349C8.97028 4.05449 8.96928 4.05549 8.96828 4.05649C8.96728 4.05748 8.96628 4.05848 8.96529 4.05948C8.96429 4.06048 8.96329 4.06148 8.96229 4.06248C8.96129 4.06348 8.96029 4.06448 8.95929 4.06548C8.95829 4.06648 8.95729 4.06748 8.95629 4.06848C8.95528 4.06948 8.95428 4.07048 8.95328 4.07149C8.95228 4.07249 8.95128 4.07349 8.95027 4.07449C8.94927 4.0755 8.94827 4.0765 8.94726 4.07751C8.94626 4.07851 8.94525 4.07951 8.94425 4.08052C8.94324 4.08152 8.94224 4.08253 8.94123 4.08353C8.94023 4.08454 8.93922 4.08555 8.93822 4.08655C8.93721 4.08756 8.9362 4.08856 8.9352 4.08957C8.93419 4.09058 8.93318 4.09159 8.93217 4.09259C8.93117 4.0936 8.93016 4.09461 8.92915 4.09562C8.92814 4.09663 8.92713 4.09764 8.92612 4.09865C8.92511 4.09965 8.9241 4.10066 8.92309 4.10167C8.92208 4.10268 8.92107 4.10369 8.92006 4.10471C8.91905 4.10572 8.91804 4.10673 8.91703 4.10774C8.91602 4.10875 8.91501 4.10976 8.914 4.11077C8.91298 4.11179 8.91197 4.1128 8.91096 4.11381C8.90995 4.11482 8.90893 4.11584 8.90792 4.11685C8.90691 4.11786 8.90589 4.11888 8.90488 4.11989C8.90387 4.1209 8.90285 4.12192 8.90184 4.12293C8.90082 4.12395 8.89981 4.12496 8.89879 4.12598C8.89778 4.12699 8.89676 4.12801 8.89575 4.12902C8.89473 4.13004 8.89372 4.13105 8.8927 4.13207C8.89168 4.13309 8.89067 4.1341 8.88965 4.13512C8.88864 4.13613 8.88762 4.13715 8.8866 4.13817C8.88558 4.13919 8.88457 4.1402 8.88355 4.14122C8.88253 4.14224 8.88151 4.14326 8.8805 4.14427C8.87948 4.14529 8.87846 4.14631 8.87744 4.14733C8.87642 4.14835 8.8754 4.14937 8.87439 4.15038C8.87337 4.1514 8.87235 4.15242 8.87133 4.15344C8.87031 4.15446 8.86929 4.15548 8.86827 4.1565C8.86725 4.15752 8.86623 4.15854 8.86521 4.15956C8.86419 4.16058 8.86317 4.1616 8.86215 4.16262C8.86113 4.16364 8.86011 4.16466 8.85909 4.16568C8.85807 4.1667 8.85705 4.16772 8.85603 4.16874C8.85501 4.16977 8.85398 4.17079 8.85296 4.17181C8.85194 4.17283 8.85092 4.17385 8.8499 4.17487C8.84888 4.1759 8.84785 4.17692 8.84683 4.17794C8.84581 4.17896 8.84479 4.17998 8.84377 4.18101C8.84274 4.18203 8.84172 4.18305 8.8407 4.18407C8.83968 4.18509 8.83865 4.18612 8.83763 4.18714C8.83661 4.18816 8.83559 4.18919 8.83456 4.19021C8.83354 4.19123 8.83252 4.19225 8.83149 4.19328C8.83047 4.1943 8.82945 4.19532 8.82842 4.19635C8.8274 4.19737 8.82638 4.19839 8.82535 4.19942C8.82433 4.20044 8.82331 4.20146 8.82228 4.20249C8.82126 4.20351 8.82024 4.20454 8.81921 4.20556C8.81819 4.20658 8.81717 4.20761 8.81614 4.20863C8.81512 4.20966 8.81409 4.21068 8.81307 4.2117C8.81205 4.21273 8.81102 4.21375 8.81 4.21478C8.80897 4.2158 8.80795 4.21682 8.80693 4.21785C8.8059 4.21887 8.80488 4.2199 8.80385 4.22092C8.80283 4.22194 8.8018 4.22297 8.80078 4.22399C8.79976 4.22502 8.79873 4.22604 8.79771 4.22706C8.79668 4.22809 8.79566 4.22911 8.79464 4.23014C8.79361 4.23116 8.79259 4.23219 8.79156 4.23321C8.79054 4.23423 8.78951 4.23526 8.78849 4.23628C8.78747 4.23731 8.78644 4.23833 8.78542 4.23936C8.78439 4.24038 8.78337 4.2414 8.78235 4.24243C8.78132 4.24345 8.7803 4.24448 8.77927 4.2455C8.77825 4.24652 8.77723 4.24755 8.7762 4.24857C8.77518 4.24959 8.77416 4.25062 8.77313 4.25164C8.77211 4.25267 8.77108 4.25369 8.77006 4.25471C8.76904 4.25574 8.76801 4.25676 8.76699 4.25778C8.76597 4.25881 8.76494 4.25983 8.76392 4.26085C8.7629 4.26188 8.76187 4.2629 8.76085 4.26392C8.75983 4.26495 8.75881 4.26597 8.75778 4.26699C8.75676 4.26801 8.75574 4.26904 8.75471 4.27006C8.75369 4.27108 8.75267 4.27211 8.75165 4.27313C8.75062 4.27415 8.7496 4.27517 8.74858 4.27619C8.74756 4.27722 8.74654 4.27824 8.74551 4.27926C8.74449 4.28028 8.74347 4.2813 8.74245 4.28233C8.74143 4.28335 8.74041 4.28437 8.73938 4.28539C8.73836 4.28641 8.73734 4.28743 8.73632 4.28845C8.7353 4.28947 8.73428 4.2905 8.73326 4.29152C8.73224 4.29254 8.73122 4.29356 8.7302 4.29458C8.72918 4.2956 8.72816 4.29662 8.72714 4.29764C8.72612 4.29866 8.7251 4.29968 8.72408 4.3007C8.72306 4.30172 8.72204 4.30274 8.72102 4.30375C8.72 4.30477 8.71898 4.30579 8.71796 4.30681C8.71695 4.30783 8.71593 4.30885 8.71491 4.30987C8.71389 4.31089 8.71287 4.3119 8.71186 4.31292C8.71084 4.31394 8.70982 4.31496 8.7088 4.31597C8.70779 4.31699 8.70677 4.31801 8.70575 4.31903C8.70473 4.32004 8.70372 4.32106 8.7027 4.32207C8.70169 4.32309 8.70067 4.32411 8.69965 4.32512C8.69864 4.32614 8.69762 4.32715 8.69661 4.32817C8.69559 4.32918 8.69458 4.3302 8.69356 4.33121C8.69255 4.33223 8.69153 4.33324 8.69052 4.33426C8.6895 4.33527 8.68849 4.33629 8.68748 4.3373C8.68646 4.33831 8.68545 4.33933 8.68444 4.34034C8.68342 4.34135 8.68241 4.34237 8.6814 4.34338C8.68039 4.34439 8.67938 4.3454 8.67836 4.34641C8.67735 4.34743 8.67634 4.34844 8.67533 4.34945C8.67432 4.35046 8.67331 4.35147 8.6723 4.35248C8.67129 4.35349 8.67028 4.3545 8.66927 4.35551C8.66826 4.35652 8.66725 4.35753 8.66624 4.35854C8.66523 4.35955 8.66422 4.36056 8.66321 4.36156C8.66221 4.36257 8.6612 4.36358 8.66019 4.36459C8.65918 4.36559 8.65818 4.3666 8.65717 4.36761C8.65616 4.36862 8.65516 4.36962 8.65415 4.37063C8.65314 4.37163 8.65214 4.37264 8.65113 4.37364C8.65013 4.37465 8.64912 4.37565 8.64812 4.37666C8.64712 4.37766 8.64611 4.37867 8.64511 4.37967C8.6441 4.38067 8.6431 4.38168 8.6421 4.38268C8.6411 4.38368 8.64009 4.38469 8.63909 4.38569C8.63809 4.38669 8.63709 4.38769 8.63609 4.38869C8.63509 4.38969 8.63409 4.39069 8.63309 4.39169C8.63209 4.39269 8.63109 4.39369 8.63009 4.39469C8.62909 4.39569 8.62809 4.39669 8.62709 4.39769C8.62609 4.39869 8.62509 4.39969 8.6241 4.40068C8.6231 4.40168 8.6221 4.40268 8.62111 4.40367C8.62011 4.40467 8.61911 4.40567 8.61812 4.40666C8.61712 4.40766 8.61613 4.40865 8.61513 4.40965C8.61414 4.41064 8.61315 4.41163 8.61215 4.41263C8.61116 4.41362 8.61017 4.41461 8.60917 4.41561C8.60818 4.4166 8.60719 4.41759 8.6062 4.41858C8.60521 4.41957 8.60422 4.42056 8.60323 4.42155C8.60224 4.42255 8.60125 4.42354 8.60026 4.42452C8.59927 4.42551 8.59828 4.4265 8.59729 4.42749C8.5963 4.42848 8.59531 4.42947 8.59433 4.43045C8.59334 4.43144 8.59235 4.43243 8.59137 4.43341C8.59038 4.4344 8.5894 4.43538 8.58841 4.43637C8.58743 4.43735 8.58644 4.43834 8.58546 4.43932C8.58448 4.44031 8.58349 4.44129 8.58251 4.44227C8.58153 4.44325 8.58055 4.44424 8.57956 4.44522C8.57858 4.4462 8.5776 4.44718 8.57662 4.44816C8.57564 4.44914 8.57466 4.45012 8.57368 4.4511C8.57271 4.45208 8.57173 4.45305 8.57075 4.45403C8.56977 4.45501 8.5688 4.45599 8.56782 4.45696C8.56684 4.45794 8.56587 4.45891 8.56489 4.45989C8.56392 4.46087 8.56294 4.46184 8.56197 4.46281C8.56099 4.46379 8.56002 4.46476 8.55905 4.46573C8.55808 4.46671 8.5571 4.46768 8.55613 4.46865C8.55516 4.46962 8.55419 4.47059 8.55322 4.47156C8.55225 4.47253 8.55128 4.4735 8.55032 4.47447C8.54935 4.47544 8.54838 4.4764 8.54741 4.47737C8.54644 4.47834 8.54548 4.4793 8.54451 4.48027C8.54355 4.48124 8.54258 4.4822 8.54162 4.48316C8.54065 4.48413 8.53969 4.48509 8.53873 4.48606C8.53776 4.48702 8.5368 4.48798 8.53584 4.48894C8.53488 4.4899 8.53392 4.49086 8.53296 4.49182C8.532 4.49278 8.53104 4.49374 8.53008 4.4947C8.52912 4.49566 8.52816 4.49662 8.52721 4.49758C8.52625 4.49853 8.52529 4.49949 8.52434 4.50044C8.52338 4.5014 8.52243 4.50235 8.52147 4.50331C8.52052 4.50426 8.51957 4.50522 8.51862 4.50617C8.51766 4.50712 8.51671 4.50807 8.51576 4.50902C8.51481 4.50997 8.51386 4.51092 8.51291 4.51187C8.51196 4.51282 8.51101 4.51377 8.51006 4.51472C8.50912 4.51567 8.50817 4.51661 8.50722 4.51756C8.50628 4.51851 8.50533 4.51945 8.50439 4.5204C8.50344 4.52134 8.5025 4.52228 8.50156 4.52323C8.50061 4.52417 8.49967 4.52511 8.49873 4.52605C8.49779 4.52699 8.49685 4.52794 8.49591 4.52887C8.49497 4.52981 8.49403 4.53075 8.49309 4.53169C8.49216 4.53263 8.49122 4.53357 8.49028 4.5345C8.48935 4.53544 8.48841 4.53637 8.48748 4.53731C8.48654 4.53824 8.48561 4.53918 8.48468 4.54011C8.48374 4.54104 8.48281 4.54197 8.48188 4.5429C8.48095 4.54384 8.48002 4.54477 8.47909 4.54569C8.47816 4.54662 8.47723 4.54755 8.47631 4.54848C8.47538 4.54941 8.47445 4.55033 8.47353 4.55126C8.4726 4.55218 8.47168 4.55311 8.47075 4.55403C8.46983 4.55496 8.46891 4.55588 8.46798 4.5568C8.46706 4.55772 8.46614 4.55864 8.46522 4.55956C8.4643 4.56048 8.46338 4.5614 8.46246 4.56232C8.46155 4.56324 8.46063 4.56416 8.45971 4.56507C8.4588 4.56599 8.45788 4.5669 8.45697 4.56782C8.45605 4.56873 8.45514 4.56965 8.45423 4.57056C8.45331 4.57147 8.4524 4.57238 8.45149 4.57329C8.45058 4.5742 8.44967 4.57511 8.44876 4.57602C8.44786 4.57693 8.44695 4.57784 8.44604 4.57874C8.44513 4.57965 8.44423 4.58056 8.44332 4.58146C8.44242 4.58237 8.44152 4.58327 8.44061 4.58417C8.43971 4.58508 8.43881 4.58598 8.43791 4.58688C8.43701 4.58778 8.43611 4.58868 8.43521 4.58958C8.43431 4.59047 8.43341 4.59137 8.43252 4.59227C8.43162 4.59316 8.43073 4.59406 8.42983 4.59495C8.42894 4.59585 8.42804 4.59674 8.42715 4.59763C8.42626 4.59853 8.42537 4.59942 8.42448 4.60031C8.42359 4.6012 8.4227 4.60209 8.42181 4.60298C8.42092 4.60386 8.42004 4.60475 8.41915 4.60564C8.41826 4.60652 8.41738 4.60741 8.4165 4.60829C8.41561 4.60918 8.41473 4.61006 8.41385 4.61094C8.41297 4.61182 8.41209 4.6127 8.41121 4.61358C8.41033 4.61446 8.40945 4.61534 8.40857 4.61622C8.40769 4.61709 8.40682 4.61797 8.40594 4.61884C8.40507 4.61972 8.40419 4.62059 8.40332 4.62147C8.40245 4.62234 8.40158 4.62321 8.40071 4.62408C8.39984 4.62495 8.39897 4.62582 8.3981 4.62669C8.39723 4.62756 8.39636 4.62842 8.3955 4.62929C8.39463 4.63016 8.39377 4.63102 8.3929 4.63188C8.39204 4.63275 8.39118 4.63361 8.39032 4.63447C8.38946 4.63533 8.3886 4.63619 8.38774 4.63705C8.38688 4.63791 8.38602 4.63877 8.38516 4.63963C8.38431 4.64048 8.38345 4.64134 8.3826 4.64219C8.38174 4.64305 8.38089 4.6439 8.38004 4.64475C8.37919 4.6456 8.37834 4.64645 8.37749 4.6473C8.37664 4.64815 8.37579 4.649 8.37494 4.64985C8.37409 4.65069 8.37325 4.65154 8.3724 4.65238C8.37156 4.65323 8.37072 4.65407 8.36987 4.65491C8.36903 4.65576 8.36819 4.6566 8.36735 4.65744C8.36651 4.65828 8.36567 4.65911 8.36484 4.65995C8.364 4.66079 8.36316 4.66163 8.36233 4.66246C8.3615 4.66329 8.36066 4.66413 8.35983 4.66496C8.359 4.66579 8.35817 4.66662 8.35734 4.66745C8.35651 4.66828 8.35568 4.66911 8.35485 4.66994C8.35403 4.67076 8.3532 4.67159 8.35238 4.67241C8.35155 4.67324 8.35073 4.67406 8.34991 4.67488C8.34908 4.67571 8.34826 4.67653 8.34744 4.67735C8.34663 4.67816 8.34581 4.67898 8.34499 4.6798C8.34417 4.68062 8.34336 4.68143 8.34255 4.68224C8.34173 4.68306 8.34092 4.68387 8.34011 4.68468C8.3393 4.68549 8.33849 4.6863 8.33768 4.68711C8.33687 4.68792 8.33606 4.68873 8.33526 4.68953L9.3959 5.75021C9.3967 5.74941 9.39751 5.7486 9.39832 5.74779C9.39913 5.74698 9.39994 5.74617 9.40075 5.74536C9.40156 5.74455 9.40237 5.74374 9.40319 5.74292C9.404 5.74211 9.40481 5.7413 9.40563 5.74048C9.40645 5.73966 9.40727 5.73884 9.40809 5.73803C9.4089 5.73721 9.40972 5.73639 9.41055 5.73556C9.41137 5.73474 9.41219 5.73392 9.41302 5.73309C9.41384 5.73227 9.41467 5.73144 9.41549 5.73062C9.41632 5.72979 9.41715 5.72896 9.41798 5.72813C9.41881 5.7273 9.41964 5.72647 9.42047 5.72564C9.4213 5.72481 9.42214 5.72397 9.42297 5.72314C9.4238 5.72231 9.42464 5.72147 9.42548 5.72063C9.42631 5.71979 9.42715 5.71896 9.42799 5.71812C9.42883 5.71728 9.42967 5.71644 9.43052 5.71559C9.43136 5.71475 9.4322 5.71391 9.43304 5.71306C9.43389 5.71222 9.43474 5.71137 9.43558 5.71053C9.43643 5.70968 9.43728 5.70883 9.43813 5.70798C9.43898 5.70713 9.43983 5.70628 9.44068 5.70543C9.44153 5.70458 9.44238 5.70373 9.44324 5.70287C9.44409 5.70202 9.44495 5.70116 9.4458 5.70031C9.44666 5.69945 9.44752 5.69859 9.44838 5.69773C9.44924 5.69687 9.4501 5.69601 9.45096 5.69515C9.45182 5.69429 9.45268 5.69343 9.45354 5.69256C9.45441 5.6917 9.45527 5.69084 9.45614 5.68997C9.457 5.6891 9.45787 5.68824 9.45874 5.68737C9.45961 5.6865 9.46048 5.68563 9.46135 5.68476C9.46222 5.68389 9.46309 5.68302 9.46396 5.68215C9.46484 5.68127 9.46571 5.6804 9.46658 5.67952C9.46746 5.67865 9.46833 5.67777 9.46921 5.6769C9.47009 5.67602 9.47097 5.67514 9.47185 5.67426C9.47273 5.67338 9.47361 5.6725 9.47449 5.67162C9.47537 5.67074 9.47625 5.66986 9.47714 5.66897C9.47802 5.66809 9.4789 5.6672 9.47979 5.66632C9.48068 5.66543 9.48156 5.66454 9.48245 5.66366C9.48334 5.66277 9.48423 5.66188 9.48512 5.66099C9.48601 5.6601 9.4869 5.65921 9.48779 5.65831C9.48868 5.65742 9.48958 5.65653 9.49047 5.65563C9.49137 5.65474 9.49226 5.65384 9.49316 5.65295C9.49406 5.65205 9.49495 5.65115 9.49585 5.65026C9.49675 5.64936 9.49765 5.64846 9.49855 5.64756C9.49945 5.64666 9.50035 5.64576 9.50125 5.64485C9.50216 5.64395 9.50306 5.64305 9.50396 5.64214C9.50487 5.64124 9.50578 5.64033 9.50668 5.63942C9.50759 5.63852 9.5085 5.63761 9.5094 5.6367C9.51031 5.63579 9.51122 5.63488 9.51213 5.63397C9.51304 5.63306 9.51395 5.63215 9.51487 5.63124C9.51578 5.63033 9.51669 5.62941 9.51761 5.6285C9.51852 5.62758 9.51944 5.62667 9.52035 5.62575C9.52127 5.62484 9.52219 5.62392 9.5231 5.623C9.52402 5.62208 9.52494 5.62116 9.52586 5.62024C9.52678 5.61932 9.5277 5.6184 9.52862 5.61748C9.52955 5.61656 9.53047 5.61564 9.53139 5.61471C9.53232 5.61379 9.53324 5.61286 9.53417 5.61194C9.53509 5.61101 9.53602 5.61009 9.53695 5.60916C9.53787 5.60823 9.5388 5.6073 9.53973 5.60637C9.54066 5.60545 9.54159 5.60452 9.54252 5.60358C9.54345 5.60265 9.54438 5.60172 9.54532 5.60079C9.54625 5.59986 9.54718 5.59892 9.54812 5.59799C9.54905 5.59705 9.54999 5.59612 9.55092 5.59518C9.55186 5.59425 9.5528 5.59331 9.55373 5.59237C9.55467 5.59143 9.55561 5.59049 9.55655 5.58955C9.55749 5.58862 9.55843 5.58767 9.55937 5.58673C9.56031 5.58579 9.56125 5.58485 9.5622 5.58391C9.56314 5.58296 9.56408 5.58202 9.56503 5.58108C9.56597 5.58013 9.56692 5.57919 9.56786 5.57824C9.56881 5.57729 9.56976 5.57635 9.5707 5.5754C9.57165 5.57445 9.5726 5.5735 9.57355 5.57255C9.5745 5.5716 9.57545 5.57065 9.5764 5.5697C9.57735 5.56875 9.5783 5.5678 9.57926 5.56685C9.58021 5.5659 9.58116 5.56494 9.58211 5.56399C9.58307 5.56303 9.58402 5.56208 9.58498 5.56112C9.58593 5.56017 9.58689 5.55921 9.58785 5.55826C9.5888 5.5573 9.58976 5.55634 9.59072 5.55538C9.59168 5.55442 9.59264 5.55346 9.5936 5.5525C9.59456 5.55154 9.59552 5.55058 9.59648 5.54962C9.59744 5.54866 9.5984 5.5477 9.59937 5.54674C9.60033 5.54577 9.60129 5.54481 9.60226 5.54384C9.60322 5.54288 9.60419 5.54192 9.60515 5.54095C9.60612 5.53998 9.60709 5.53902 9.60805 5.53805C9.60902 5.53708 9.60999 5.53612 9.61096 5.53515C9.61192 5.53418 9.61289 5.53321 9.61386 5.53224C9.61483 5.53127 9.6158 5.5303 9.61677 5.52933C9.61775 5.52836 9.61872 5.52739 9.61969 5.52641C9.62066 5.52544 9.62164 5.52447 9.62261 5.52349C9.62358 5.52252 9.62456 5.52155 9.62553 5.52057C9.62651 5.51959 9.62748 5.51862 9.62846 5.51764C9.62944 5.51667 9.63041 5.51569 9.63139 5.51471C9.63237 5.51373 9.63335 5.51276 9.63432 5.51178C9.6353 5.5108 9.63628 5.50982 9.63726 5.50884C9.63824 5.50786 9.63922 5.50688 9.64021 5.5059C9.64119 5.50492 9.64217 5.50393 9.64315 5.50295C9.64413 5.50197 9.64512 5.50099 9.6461 5.5C9.64708 5.49902 9.64807 5.49803 9.64905 5.49705C9.65004 5.49606 9.65102 5.49508 9.65201 5.49409C9.65299 5.49311 9.65398 5.49212 9.65497 5.49113C9.65595 5.49015 9.65694 5.48916 9.65793 5.48817C9.65892 5.48718 9.65991 5.48619 9.6609 5.4852C9.66189 5.48422 9.66288 5.48323 9.66387 5.48223C9.66486 5.48124 9.66585 5.48025 9.66684 5.47926C9.66783 5.47827 9.66882 5.47728 9.66981 5.47629C9.67081 5.47529 9.6718 5.4743 9.67279 5.47331C9.67379 5.47231 9.67478 5.47132 9.67577 5.47033C9.67677 5.46933 9.67776 5.46834 9.67876 5.46734C9.67975 5.46635 9.68075 5.46535 9.68175 5.46435C9.68274 5.46336 9.68374 5.46236 9.68474 5.46136C9.68573 5.46037 9.68673 5.45937 9.68773 5.45837C9.68873 5.45737 9.68973 5.45637 9.69073 5.45537C9.69173 5.45437 9.69273 5.45337 9.69373 5.45237C9.69473 5.45137 9.69573 5.45037 9.69673 5.44937C9.69773 5.44837 9.69873 5.44737 9.69973 5.44637C9.70073 5.44537 9.70174 5.44436 9.70274 5.44336C9.70374 5.44236 9.70474 5.44135 9.70575 5.44035C9.70675 5.43935 9.70776 5.43834 9.70876 5.43734C9.70976 5.43633 9.71077 5.43533 9.71177 5.43432C9.71278 5.43332 9.71378 5.43231 9.71479 5.43131C9.7158 5.4303 9.7168 5.4293 9.71781 5.42829C9.71882 5.42728 9.71982 5.42627 9.72083 5.42527C9.72184 5.42426 9.72285 5.42325 9.72385 5.42224C9.72486 5.42124 9.72587 5.42023 9.72688 5.41922C9.72789 5.41821 9.7289 5.4172 9.72991 5.41619C9.73092 5.41518 9.73193 5.41417 9.73294 5.41316C9.73395 5.41215 9.73496 5.41114 9.73597 5.41013C9.73698 5.40912 9.73799 5.40811 9.739 5.40709C9.74002 5.40608 9.74103 5.40507 9.74204 5.40406C9.74305 5.40305 9.74407 5.40203 9.74508 5.40102C9.74609 5.40001 9.7471 5.39899 9.74812 5.39798C9.74913 5.39697 9.75015 5.39595 9.75116 5.39494C9.75217 5.39392 9.75319 5.39291 9.7542 5.39189C9.75522 5.39088 9.75623 5.38986 9.75725 5.38885C9.75826 5.38783 9.75928 5.38682 9.76029 5.3858C9.76131 5.38479 9.76233 5.38377 9.76334 5.38275C9.76436 5.38174 9.76537 5.38072 9.76639 5.37971C9.76741 5.37869 9.76843 5.37767 9.76944 5.37665C9.77046 5.37564 9.77148 5.37462 9.7725 5.3736C9.77351 5.37258 9.77453 5.37157 9.77555 5.37055C9.77657 5.36953 9.77759 5.36851 9.7786 5.36749C9.77962 5.36647 9.78064 5.36545 9.78166 5.36443C9.78268 5.36342 9.7837 5.3624 9.78472 5.36138C9.78574 5.36036 9.78676 5.35934 9.78778 5.35832C9.7888 5.3573 9.78982 5.35628 9.79084 5.35526C9.79186 5.35424 9.79288 5.35322 9.7939 5.3522C9.79492 5.35118 9.79594 5.35015 9.79696 5.34913C9.79798 5.34811 9.799 5.34709 9.80003 5.34607C9.80105 5.34505 9.80207 5.34403 9.80309 5.34301C9.80411 5.34198 9.80513 5.34096 9.80615 5.33994C9.80718 5.33892 9.8082 5.3379 9.80922 5.33687C9.81024 5.33585 9.81126 5.33483 9.81229 5.33381C9.81331 5.33279 9.81433 5.33176 9.81535 5.33074C9.81638 5.32972 9.8174 5.32869 9.81842 5.32767C9.81945 5.32665 9.82047 5.32563 9.82149 5.3246C9.82251 5.32358 9.82354 5.32256 9.82456 5.32153C9.82558 5.32051 9.82661 5.31949 9.82763 5.31846C9.82865 5.31744 9.82968 5.31642 9.8307 5.31539C9.83172 5.31437 9.83275 5.31335 9.83377 5.31232C9.8348 5.3113 9.83582 5.31027 9.83684 5.30925C9.83787 5.30823 9.83889 5.3072 9.83991 5.30618C9.84094 5.30516 9.84196 5.30413 9.84299 5.30311C9.84401 5.30208 9.84503 5.30106 9.84606 5.30004C9.84708 5.29901 9.84811 5.29799 9.84913 5.29696C9.85016 5.29594 9.85118 5.29491 9.8522 5.29389C9.85323 5.29287 9.85425 5.29184 9.85528 5.29082C9.8563 5.28979 9.85732 5.28877 9.85835 5.28774C9.85937 5.28672 9.8604 5.2857 9.86142 5.28467C9.86245 5.28365 9.86347 5.28262 9.86449 5.2816C9.86552 5.28058 9.86654 5.27955 9.86757 5.27853C9.86859 5.2775 9.86961 5.27648 9.87064 5.27546C9.87166 5.27443 9.87269 5.27341 9.87371 5.27238C9.87473 5.27136 9.87576 5.27034 9.87678 5.26931C9.87781 5.26829 9.87883 5.26726 9.87985 5.26624C9.88088 5.26522 9.8819 5.26419 9.88292 5.26317C9.88395 5.26214 9.88497 5.26112 9.88599 5.2601C9.88702 5.25907 9.88804 5.25805 9.88906 5.25703C9.89009 5.256 9.89111 5.25498 9.89213 5.25396C9.89316 5.25293 9.89418 5.25191 9.8952 5.25089C9.89623 5.24987 9.89725 5.24884 9.89827 5.24782C9.89929 5.2468 9.90032 5.24577 9.90134 5.24475C9.90236 5.24373 9.90338 5.24271 9.90441 5.24169C9.90543 5.24066 9.90645 5.23964 9.90747 5.23862C9.90849 5.2376 9.90952 5.23658 9.91054 5.23555C9.91156 5.23453 9.91258 5.23351 9.9136 5.23249C9.91462 5.23147 9.91565 5.23045 9.91667 5.22942C9.91769 5.2284 9.91871 5.22738 9.91973 5.22636C9.92075 5.22534 9.92177 5.22432 9.92279 5.2233C9.92381 5.22228 9.92483 5.22126 9.92585 5.22024C9.92687 5.21922 9.92789 5.2182 9.92891 5.21718C9.92993 5.21616 9.93095 5.21514 9.93197 5.21412C9.93299 5.2131 9.93401 5.21208 9.93503 5.21106C9.93605 5.21005 9.93706 5.20903 9.93808 5.20801C9.9391 5.20699 9.94012 5.20597 9.94114 5.20495C9.94215 5.20394 9.94317 5.20292 9.94419 5.2019C9.94521 5.20088 9.94622 5.19987 9.94724 5.19885C9.94826 5.19783 9.94928 5.19681 9.95029 5.1958C9.95131 5.19478 9.95232 5.19377 9.95334 5.19275C9.95436 5.19173 9.95537 5.19072 9.95639 5.1897C9.9574 5.18869 9.95842 5.18767 9.95943 5.18666C9.96045 5.18564 9.96146 5.18463 9.96248 5.18361C9.96349 5.1826 9.96451 5.18158 9.96552 5.18057C9.96653 5.17956 9.96755 5.17854 9.96856 5.17753C9.96957 5.17652 9.97059 5.1755 9.9716 5.17449C9.97261 5.17348 9.97362 5.17247 9.97464 5.17145C9.97565 5.17044 9.97666 5.16943 9.97767 5.16842C9.97868 5.16741 9.97969 5.1664 9.9807 5.16539C9.98171 5.16437 9.98272 5.16336 9.98373 5.16235C9.98474 5.16134 9.98575 5.16033 9.98676 5.15933C9.98777 5.15832 9.98878 5.15731 9.98979 5.1563C9.9908 5.15529 9.99181 5.15428 9.99281 5.15327C9.99382 5.15227 9.99483 5.15126 9.99584 5.15025C9.99684 5.14924 9.99785 5.14824 9.99886 5.14723C9.99986 5.14623 10.0009 5.14522 10.0019 5.14421C10.0029 5.14321 10.0039 5.1422 10.0049 5.1412C10.0059 5.14019 10.0069 5.13919 10.0079 5.13819C10.0089 5.13718 10.0099 5.13618 10.0109 5.13517C10.0119 5.13417 10.0129 5.13317 10.0139 5.13217C10.0149 5.13116 10.0159 5.13016 10.0169 5.12916C10.0179 5.12816 10.0189 5.12716 10.0199 5.12616C10.0209 5.12516 10.0219 5.12416 10.0229 5.12316C10.0239 5.12216 10.0249 5.12116 10.0259 5.12016C10.0269 5.11916 10.0279 5.11816 10.0289 5.11717C10.0299 5.11617 10.0309 5.11517 10.0319 5.11417C10.0329 5.11318 10.0339 5.11218 10.0349 5.11119C10.0359 5.11019 10.0369 5.10919 10.0379 5.1082C10.0389 5.1072 10.0399 5.10621 10.0409 5.10522C10.0419 5.10422 10.0429 5.10323 10.0439 5.10224C10.0448 5.10124 10.0458 5.10025 10.0468 5.09926C10.0478 5.09827 10.0488 5.09728 10.0498 5.09629C10.0508 5.09529 10.0518 5.0943 10.0528 5.09331C10.0538 5.09232 10.0548 5.09134 10.0557 5.09035C10.0567 5.08936 10.0577 5.08837 10.0587 5.08738C10.0597 5.0864 10.0607 5.08541 10.0617 5.08442C10.0627 5.08344 10.0636 5.08245 10.0646 5.08146C10.0656 5.08048 10.0666 5.07949 10.0676 5.07851C10.0686 5.07753 10.0695 5.07654 10.0705 5.07556C10.0715 5.07458 10.0725 5.07359 10.0735 5.07261C10.0745 5.07163 10.0754 5.07065 10.0764 5.06967C10.0774 5.06869 10.0784 5.06771 10.0794 5.06673C10.0803 5.06575 10.0813 5.06477 10.0823 5.06379C10.0833 5.06281 10.0842 5.06184 10.0852 5.06086C10.0862 5.05988 10.0872 5.05891 10.0882 5.05793C10.0891 5.05696 10.0901 5.05598 10.0911 5.05501C10.0921 5.05403 10.093 5.05306 10.094 5.05209C10.095 5.05111 10.0959 5.05014 10.0969 5.04917C10.0979 5.0482 10.0989 5.04723 10.0998 5.04625C10.1008 5.04528 10.1018 5.04431 10.1027 5.04335C10.1037 5.04238 10.1047 5.04141 10.1056 5.04044C10.1066 5.03947 10.1076 5.03851 10.1085 5.03754C10.1095 5.03657 10.1105 5.03561 10.1114 5.03464C10.1124 5.03368 10.1134 5.03271 10.1143 5.03175C10.1153 5.03079 10.1163 5.02982 10.1172 5.02886C10.1182 5.0279 10.1191 5.02694 10.1201 5.02598C10.1211 5.02502 10.122 5.02406 10.123 5.0231C10.1239 5.02214 10.1249 5.02118 10.1259 5.02022C10.1268 5.01927 10.1278 5.01831 10.1287 5.01735C10.1297 5.0164 10.1306 5.01544 10.1316 5.01449C10.1326 5.01353 10.1335 5.01258 10.1345 5.01162C10.1354 5.01067 10.1364 5.00972 10.1373 5.00877C10.1383 5.00782 10.1392 5.00686 10.1402 5.00591C10.1411 5.00496 10.1421 5.00402 10.143 5.00307C10.144 5.00212 10.1449 5.00117 10.1459 5.00022C10.1468 4.99928 10.1478 4.99833 10.1487 4.99739C10.1496 4.99644 10.1506 4.9955 10.1515 4.99455C10.1525 4.99361 10.1534 4.99267 10.1544 4.99172C10.1553 4.99078 10.1562 4.98984 10.1572 4.9889C10.1581 4.98796 10.1591 4.98702 10.16 4.98608C10.1609 4.98514 10.1619 4.98421 10.1628 4.98327C10.1637 4.98233 10.1647 4.9814 10.1656 4.98046C10.1666 4.97953 10.1675 4.97859 10.1684 4.97766C10.1694 4.97673 10.1703 4.97579 10.1712 4.97486C10.1722 4.97393 10.1731 4.973 10.174 4.97207C10.1749 4.97114 10.1759 4.97021 10.1768 4.96928C10.1777 4.96835 10.1787 4.96743 10.1796 4.9665C10.1805 4.96557 10.1814 4.96465 10.1824 4.96372C10.1833 4.9628 10.1842 4.96188 10.1851 4.96095C10.1861 4.96003 10.187 4.95911 10.1879 4.95819C10.1888 4.95727 10.1897 4.95635 10.1907 4.95543C10.1916 4.95451 10.1925 4.95359 10.1934 4.95267C10.1943 4.95176 10.1952 4.95084 10.1962 4.94993C10.1971 4.94901 10.198 4.9481 10.1989 4.94718C10.1998 4.94627 10.2007 4.94536 10.2016 4.94445C10.2025 4.94354 10.2035 4.94262 10.2044 4.94172C10.2053 4.94081 10.2062 4.9399 10.2071 4.93899C10.208 4.93808 10.2089 4.93718 10.2098 4.93627C10.2107 4.93537 10.2116 4.93446 10.2125 4.93356C10.2134 4.93265 10.2143 4.93175 10.2152 4.93085C10.2161 4.92995 10.217 4.92905 10.2179 4.92815C10.2188 4.92725 10.2197 4.92635 10.2206 4.92545C10.2215 4.92456 10.2224 4.92366 10.2233 4.92277C10.2242 4.92187 10.2251 4.92098 10.226 4.92008C10.2269 4.91919 10.2278 4.9183 10.2287 4.91741C10.2296 4.91652 10.2305 4.91563 10.2313 4.91474C10.2322 4.91385 10.2331 4.91296 10.234 4.91207C10.2349 4.91119 10.2358 4.9103 10.2367 4.90942C10.2375 4.90853 10.2384 4.90765 10.2393 4.90676C10.2402 4.90588 10.2411 4.905 10.242 4.90412C10.2428 4.90324 10.2437 4.90236 10.2446 4.90148C10.2455 4.9006 10.2464 4.89973 10.2472 4.89885C10.2481 4.89798 10.249 4.8971 10.2499 4.89623C10.2507 4.89535 10.2516 4.89448 10.2525 4.89361C10.2533 4.89274 10.2542 4.89187 10.2551 4.891C10.2559 4.89013 10.2568 4.88926 10.2577 4.88839C10.2586 4.88753 10.2594 4.88666 10.2603 4.8858C10.2611 4.88493 10.262 4.88407 10.2629 4.88321C10.2637 4.88234 10.2646 4.88148 10.2655 4.88062C10.2663 4.87976 10.2672 4.8789 10.268 4.87805C10.2689 4.87719 10.2697 4.87633 10.2706 4.87548C10.2715 4.87462 10.2723 4.87377 10.2732 4.87292C10.274 4.87206 10.2749 4.87121 10.2757 4.87036C10.2766 4.86951 10.2774 4.86866 10.2783 4.86781C10.2791 4.86697 10.28 4.86612 10.2808 4.86527C10.2817 4.86443 10.2825 4.86358 10.2833 4.86274C10.2842 4.8619 10.285 4.86106 10.2859 4.86021C10.2867 4.85937 10.2875 4.85853 10.2884 4.8577C10.2892 4.85686 10.2901 4.85602 10.2909 4.85519C10.2917 4.85435 10.2926 4.85352 10.2934 4.85268C10.2942 4.85185 10.2951 4.85102 10.2959 4.85019C10.2967 4.84936 10.2976 4.84853 10.2984 4.8477C10.2992 4.84687 10.3 4.84604 10.3009 4.84522C10.3017 4.84439 10.3025 4.84357 10.3033 4.84275C10.3042 4.84192 10.305 4.8411 10.3058 4.84028C10.3066 4.83946 10.3074 4.83864 10.3083 4.83782C10.3091 4.83701 10.3099 4.83619 10.3107 4.83537C10.3115 4.83456 10.3123 4.83375 10.3131 4.83293C10.314 4.83212 10.3148 4.83131 10.3156 4.8305C10.3164 4.82969 10.3172 4.82888 10.318 4.82807C10.3188 4.82727 10.3196 4.82646 10.3204 4.82566C10.3212 4.82485 10.322 4.82405 10.3228 4.82325C10.3236 4.82245 10.3244 4.82165 10.3252 4.82085C10.326 4.82005 10.3268 4.81925 10.3276 4.81845C10.3284 4.81766 10.3292 4.81686 10.33 4.81607C10.3308 4.81528 10.3316 4.81449 10.3324 4.81369C10.3332 4.8129 10.334 4.81211 10.3347 4.81133C10.3355 4.81054 10.3363 4.80975 10.3371 4.80897C10.3379 4.80818 10.3387 4.8074 10.3395 4.80662C10.3402 4.80583 10.341 4.80505 10.3418 4.80427C10.3426 4.8035 10.3434 4.80272 10.3441 4.80194C10.3449 4.80116 10.3457 4.80039 10.3465 4.79962C10.3472 4.79884 10.348 4.79807 10.3488 4.7973C10.3495 4.79653 10.3503 4.79576 10.3511 4.79499C10.3519 4.79422 10.3526 4.79346 10.3534 4.79269C10.3541 4.79193 10.3549 4.79117 10.3557 4.7904C10.3564 4.78964 10.3572 4.78888 10.358 4.78812C10.3587 4.78736 10.3595 4.78661 10.3602 4.78585C10.361 4.78509 10.3617 4.78434 10.3625 4.78359C10.3632 4.78283 10.364 4.78208 10.3647 4.78133C10.3655 4.78058 10.3662 4.77983 10.367 4.77909C10.3677 4.77834 10.3685 4.7776 10.3692 4.77685C10.37 4.77611 10.3707 4.77537 10.3714 4.77463C10.3722 4.77388 10.3729 4.77315 10.3737 4.77241C10.3744 4.77167 10.3751 4.77093 10.3759 4.7702C10.3766 4.76946 10.3773 4.76873 10.3781 4.768C10.3788 4.76727 10.3795 4.76654 10.3803 4.76581C10.381 4.76508 10.3817 4.76436 10.3824 4.76363C10.3832 4.76291 10.3839 4.76218 10.3846 4.76146C10.3853 4.76074 10.3861 4.76002 10.3868 4.7593C10.3875 4.75858 10.3882 4.75786 10.3889 4.75715C10.3896 4.75643 10.3904 4.75572 10.3911 4.75501C10.3918 4.75429 10.3925 4.75358 10.3932 4.75287C10.3939 4.75216 10.3946 4.75146 10.3953 4.75075C10.396 4.75005 10.3967 4.74934 10.3974 4.74864C10.3981 4.74794 10.3988 4.74723 10.3995 4.74654C10.4002 4.74584 10.4009 4.74514 10.4016 4.74444C10.4023 4.74375 10.403 4.74305 10.4037 4.74236C10.4044 4.74167 10.4051 4.74098 10.4058 4.74029C10.4065 4.7396 10.4072 4.73891 10.4078 4.73822C10.4085 4.73754 10.4092 4.73685 10.4099 4.73617C10.4106 4.73549 10.4113 4.73481 10.4119 4.73413C10.4126 4.73345 10.4133 4.73277 10.414 4.73209C10.4147 4.73142 10.4153 4.73074 10.416 4.73007C10.4167 4.7294 10.4173 4.72873 10.418 4.72806C10.4187 4.72739 10.4193 4.72672 10.42 4.72606C10.4207 4.72539 10.4213 4.72473 10.422 4.72407C10.4227 4.7234 10.4233 4.72274 10.424 4.72209C10.4246 4.72143 10.4253 4.72077 10.426 4.72012C10.4266 4.71946 10.4273 4.71881 10.4279 4.71816C10.4286 4.7175 10.4292 4.71685 10.4299 4.71621C10.4305 4.71556 10.4312 4.71491 10.4318 4.71427C10.4324 4.71362 10.4331 4.71298 10.4337 4.71234C10.4344 4.7117 10.435 4.71106 10.4357 4.71042C10.4363 4.70978 10.4369 4.70915 10.4376 4.70852C10.4382 4.70788 10.4388 4.70725 10.4395 4.70662C10.4401 4.70599 10.4407 4.70536 10.4413 4.70473C10.442 4.70411 10.4426 4.70348 10.4432 4.70286C10.4438 4.70224 10.4445 4.70162 10.4451 4.701C10.4457 4.70038 10.4463 4.69976 10.4469 4.69915C10.4475 4.69853 10.4482 4.69792 10.4488 4.6973C10.4494 4.69669 10.45 4.69608 10.4506 4.69548C10.4512 4.69487 10.4518 4.69426 10.4524 4.69366C10.453 4.69305 10.4536 4.69245 10.4542 4.69185C10.4548 4.69125 10.4554 4.69065 10.456 4.69005C10.4566 4.68946 10.4572 4.68886 10.4578 4.68827C10.4584 4.68768 10.459 4.68708 10.4596 4.6865C10.4602 4.68591 10.4608 4.68532 10.4613 4.68473C10.4619 4.68415 10.4625 4.68356 10.4631 4.68298C10.4637 4.6824 10.4642 4.68182 10.4648 4.68124C10.4654 4.68067 10.466 4.68009 10.4666 4.67952C10.4671 4.67894 10.4677 4.67837 10.4683 4.6778C10.4688 4.67723 10.4694 4.67666 10.47 4.6761C10.4705 4.67553 10.4711 4.67497 10.4717 4.67441C10.4722 4.67384 10.4728 4.67328 10.4733 4.67273C10.4739 4.67217 10.4745 4.67161 10.475 4.67106C10.4756 4.6705 10.4761 4.66995 10.4767 4.6694C10.4772 4.66885 10.4778 4.6683 10.4783 4.66775C10.4789 4.66721 10.4794 4.66666 10.4799 4.66612C10.4805 4.66558 10.481 4.66504 10.4816 4.6645C10.4821 4.66396 10.4826 4.66343 10.4832 4.66289C10.4837 4.66236 10.4842 4.66183 10.4848 4.6613C10.4853 4.66077 10.4858 4.66024 10.4864 4.65971C10.4869 4.65919 10.4874 4.65866 10.4879 4.65814C10.4885 4.65762 10.489 4.6571 10.4895 4.65658C10.49 4.65606 10.4905 4.65555 10.491 4.65503C10.4916 4.65452 10.4921 4.65401 10.4926 4.6535C10.4931 4.65299 10.4936 4.65248 10.4941 4.65197C10.4946 4.65147 10.4951 4.65097 10.4956 4.65046C10.4961 4.64996 10.4966 4.64946 10.4971 4.64897C10.4976 4.64847 10.4981 4.64797 10.4986 4.64748C10.4991 4.64699 10.4996 4.6465 10.5001 4.64601C10.5005 4.64552 10.501 4.64503 10.5015 4.64455C10.502 4.64407 10.5025 4.64358 10.503 4.6431C10.5034 4.64262 10.5039 4.64214 10.5044 4.64167C10.5049 4.64119 10.5054 4.64072 10.5058 4.64025C10.5063 4.63978 10.5068 4.63931 10.5072 4.63884C10.5077 4.63837 10.5082 4.63791 10.5086 4.63744C10.5091 4.63698 10.5095 4.63652 10.51 4.63606C10.5105 4.6356 10.5109 4.63515 10.5114 4.63469C10.5118 4.63424 10.5123 4.63378 10.5127 4.63333C10.5132 4.63288 10.5136 4.63244 10.5141 4.63199C10.5145 4.63155 10.515 4.6311 10.5154 4.63066C10.5158 4.63022 10.5163 4.62978 10.5167 4.62934C10.5172 4.62891 10.5176 4.62847 10.518 4.62804C10.5185 4.62761 10.5189 4.62718 10.5193 4.62675C10.5197 4.62632 10.5202 4.6259 10.5206 4.62547C10.521 4.62505 10.5214 4.62463 10.5219 4.62421C10.5223 4.62379 10.5227 4.62337 10.5231 4.62296C10.5235 4.62255 10.5239 4.62213 10.5243 4.62172C10.5248 4.62131 10.5252 4.62091 10.5256 4.6205C10.526 4.6201 10.5264 4.61969 10.5268 4.61929C10.5272 4.61889 10.5276 4.61849 10.528 4.6181C10.5284 4.6177 10.5288 4.61731 10.5292 4.61691C10.5295 4.61652 10.5299 4.61613 10.5303 4.61575C10.5307 4.61536 10.5311 4.61497 10.5315 4.61459C10.5319 4.61421 10.5322 4.61383 10.5326 4.61345C10.533 4.61307 10.5334 4.6127 10.5337 4.61233C10.5341 4.61195 10.5345 4.61158 10.5349 4.61121C10.5352 4.61084 10.5356 4.61048 10.536 4.61011C10.5363 4.60975 10.5367 4.60939 10.537 4.60903C10.5374 4.60867 10.5378 4.60831 10.5381 4.60796C10.5385 4.60761 10.5388 4.60725 10.5392 4.6069C10.5395 4.60655 10.5399 4.60621 10.5402 4.60586C10.5405 4.60552 10.5409 4.60518 10.5412 4.60484C10.5416 4.6045 10.5419 4.60416 10.5422 4.60382C10.5426 4.60349 10.5429 4.60315 10.5432 4.60282C10.5436 4.60249 10.5439 4.60217 10.5442 4.60184C10.5446 4.60151 10.5449 4.60119 10.5452 4.60087C10.5455 4.60055 10.5458 4.60023 10.5462 4.59991C10.5465 4.5996 10.5468 4.59929 10.5471 4.59897C10.5474 4.59866 10.5477 4.59835 10.548 4.59805C10.5483 4.59774 10.5486 4.59744 10.5489 4.59714C10.5492 4.59684 10.5495 4.59654 10.5498 4.59624C10.5501 4.59594 10.5504 4.59565 10.5507 4.59536C10.551 4.59507 10.5513 4.59478 10.5516 4.59449C10.5519 4.59421 10.5521 4.59392 10.5524 4.59364C10.5527 4.59336 10.553 4.59308 10.5533 4.5928C10.5535 4.59253 10.5538 4.59225 10.5541 4.59198C10.5544 4.59171 10.5546 4.59144 10.5549 4.59117C10.5552 4.59091 10.5554 4.59064 10.5557 4.59038C10.5559 4.59012 10.5562 4.58986 10.5565 4.5896C10.5567 4.58935 10.557 4.58909 10.5572 4.58884C10.5575 4.58859 10.5577 4.58834 10.558 4.5881C10.5582 4.58785 10.5585 4.58761 10.5587 4.58737C10.5589 4.58712 10.5592 4.58689 10.5594 4.58665C10.5597 4.58641 10.5599 4.58618 10.5601 4.58595C10.5603 4.58572 10.5606 4.58549 10.5608 4.58526C10.561 4.58504 10.5613 4.58482 10.5615 4.5846C10.5617 4.58437 10.5619 4.58416 10.5621 4.58394C10.5623 4.58373 10.5626 4.58351 10.5628 4.5833C10.563 4.58309 10.5632 4.58289 10.5634 4.58268C10.5636 4.58248 10.5638 4.58227 10.564 4.58207C10.5642 4.58187 10.5644 4.58168 10.5646 4.58148C10.5648 4.58129 10.565 4.5811 10.5652 4.58091C10.5653 4.58072 10.5655 4.58053 10.5657 4.58035C10.5659 4.58016 10.5661 4.57998 10.5663 4.5798C10.5664 4.57963 10.5666 4.57945 10.5668 4.57928C10.567 4.5791 10.5671 4.57893 10.5673 4.57876C10.5675 4.5786 10.5676 4.57843 10.5678 4.57827C10.568 4.57811 10.5681 4.57795 10.5683 4.57779C10.5684 4.57763 10.5686 4.57748 10.5687 4.57733C10.5689 4.57717 10.569 4.57702 10.5692 4.57688C10.5693 4.57673 10.5695 4.57659 10.5696 4.57645C10.5698 4.57631 10.5699 4.57617 10.57 4.57603C10.5702 4.5759 10.5703 4.57576 10.5704 4.57563C10.5706 4.5755 10.5707 4.57538 10.5708 4.57525C10.5709 4.57513 10.5711 4.57501 10.5712 4.57489C10.5713 4.57477 10.5714 4.57465 10.5715 4.57454C10.5716 4.57442 10.5718 4.57431 10.5719 4.5742C10.572 4.5741 10.5721 4.57399 10.5722 4.57389C10.5723 4.57379 10.5724 4.57369 10.5725 4.57359C10.5726 4.57349 10.5727 4.5734 10.5728 4.57331C10.5729 4.57321 10.5729 4.57313 10.573 4.57304C10.5731 4.57295 10.5732 4.57287 10.5733 4.57279C10.5734 4.57271 10.5734 4.57263 10.5735 4.57256C10.5736 4.57248 10.5737 4.57241 10.5737 4.57234C10.5738 4.57227 10.5739 4.57221 10.5739 4.57215C10.574 4.57208 10.574 4.57202 10.5741 4.57196C10.5742 4.57191 10.5742 4.57185 10.5743 4.5718C10.5743 4.57175 10.5744 4.5717 10.5744 4.57165C10.5745 4.57161 10.5745 4.57156 10.5745 4.57152C10.5746 4.57148 10.5746 4.57144 10.5747 4.57141C10.5747 4.57137 10.5747 4.57134 10.5748 4.57131C10.5748 4.57128 10.5748 4.57126 10.5748 4.57123C10.5749 4.57121 10.5749 4.57119 10.5749 4.57117C10.5749 4.57116 10.5749 4.57114 10.5749 4.57113C10.5749 4.57112 10.575 4.57111 10.575 4.5711C10.575 4.5711 10.575 4.57109 10.0447 4.04075ZM8.33526 4.68953L4.6146 8.41033L5.67524 9.47101L9.3959 5.75021L8.33526 4.68953ZM4.6146 8.41033C4.41704 8.60789 4.23656 8.78756 4.09931 8.94924C3.95638 9.11761 3.81682 9.31516 3.73539 9.5658L5.16196 10.0293C5.15783 10.042 5.16008 10.0175 5.24279 9.92003C5.33119 9.8159 5.46018 9.68608 5.67524 9.47101L4.6146 8.41033ZM3.7354 9.56579C3.61848 9.92565 3.61844 10.3134 3.73544 10.6734L5.16195 10.2097C5.14292 10.1511 5.1429 10.088 5.16196 10.0293L3.7354 9.56579ZM3.73541 10.6733C3.81683 10.9239 3.95638 11.1214 4.09931 11.2898C4.23656 11.4515 4.41704 11.6312 4.6146 11.8287L5.67524 10.7681C5.46018 10.553 5.33119 10.4232 5.2428 10.319C5.1601 10.2216 5.15784 10.197 5.16198 10.2098L3.73541 10.6733ZM4.6146 11.8287L8.33526 15.5495L9.3959 14.4888L5.67524 10.7681L4.6146 11.8287ZM8.33526 15.5495C8.53282 15.7471 8.71248 15.9276 8.87415 16.0648C9.04252 16.2078 9.24007 16.3473 9.49071 16.4288L9.95416 15.0021C9.96689 15.0063 9.94233 15.004 9.8449 14.9213C9.74078 14.8329 9.61096 14.7039 9.3959 14.4888L8.33526 15.5495ZM9.49062 16.4287C9.85052 16.5457 10.2383 16.5457 10.5982 16.4287L10.1346 15.0022C10.076 15.0212 10.0128 15.0212 9.95424 15.0022L9.49062 16.4287ZM10.5981 16.4288C10.8487 16.3473 11.0463 16.2078 11.2146 16.0648C11.3763 15.9276 11.556 15.7471 11.7535 15.5495L10.6929 14.4888C10.4778 14.7039 10.348 14.8329 10.2439 14.9213C10.1465 15.004 10.1219 15.0063 10.1346 15.0021L10.5981 16.4288Z"
                fill="currentColor"
            />
            <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M16.9781 13.2075C17.4062 12.5139 18.4713 11.4453 18.5244 11.4453C18.5774 11.4453 19.6425 12.5139 20.0707 13.2075C20.4194 13.7723 20.6074 14.2099 20.6074 14.8347C20.6074 16.0359 19.6697 17.0001 18.5244 17.0001C17.379 17.0001 16.4414 16.0359 16.4414 14.8347C16.4414 14.2099 16.6294 13.7723 16.9781 13.2075Z"
                fill="currentColor"
            />
            <path
                d="M4.17969 9.92188H16.2602L10.2199 15.9623L4.17969 9.92188Z"
                fill="currentColor"
            />
        </svg>
    ),
    TextUnderline: ({ className, ...props }: IconProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="16"
            viewBox="0 0 17 16"
            fill="none"
            className={cn(className)}
            {...props}
        >
            <path
                d="M12.1263 2.66406V7.33073C12.1263 9.53987 10.3354 11.3307 8.1263 11.3307C5.91716 11.3307 4.1263 9.53987 4.1263 7.33073V2.66406M2.79297 13.9974H13.4596"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),

    TextOverline: ({ className, ...props }: IconProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="16"
            viewBox="0 0 17 16"
            fill="none"
            className={cn(className)}
            {...props}
        >
            <path
                d="M12.375 4.66406V9.33073C12.375 11.5399 10.5841 13.3307 8.375 13.3307C6.16586 13.3307 4.375 11.5399 4.375 9.33073V4.66406"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M3.72656 2.25H12.7266"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
        </svg>
    ),

    TextStrikeThrough: ({ className, ...props }: IconProps) => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="17"
            height="16"
            viewBox="0 0 17 16"
            fill="none"
            className={cn(className)}
            {...props}
        >
            <path
                d="M4.625 10.6641C4.625 12.1368 5.81891 13.3307 7.29167 13.3307H9.95833C11.4311 13.3307 12.625 12.1368 12.625 10.6641C12.625 9.1913 11.4311 7.9974 9.95833 7.9974M12.625 5.33073C12.625 3.85797 11.4311 2.66406 9.95833 2.66406H7.29167C5.81891 2.66406 4.625 3.85797 4.625 5.33073M2.625 7.9974H14.625"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    AdvancedTypography: ({ className, ...props }: IconProps) => (
        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(className)}
            {...props}
        >
            <path
                d="M5.3505 3C5.59778 3.00012 5.82039 3.15139 5.91007 3.38184L9.41007 12.3818L9.4423 12.499C9.48931 12.774 9.33831 13.0539 9.06827 13.1592C8.79823 13.2642 8.49794 13.16 8.34659 12.9258L8.29093 12.8174L7.14835 9.87793H3.55265L2.41007 12.8174C2.28995 13.126 1.94146 13.2791 1.63273 13.1592C1.32398 13.039 1.17085 12.6906 1.29093 12.3818L4.79093 3.38184L4.83097 3.2998C4.93693 3.11618 5.13395 3 5.3505 3ZM12.9501 7.34668C13.9445 7.34673 14.7509 8.15211 14.7509 9.14648C14.7509 10.1409 13.9445 10.9462 12.9501 10.9463C12.1296 10.9461 11.4393 10.3971 11.2226 9.64648H9.75089C9.47475 9.64648 9.25089 9.42263 9.25089 9.14648C9.25089 8.87034 9.47475 8.64648 9.75089 8.64648H11.2226C11.4393 7.89585 12.1296 7.34683 12.9501 7.34668ZM12.9501 8.34668C12.5082 8.34686 12.1503 8.70449 12.1503 9.14648C12.1503 9.58848 12.5082 9.94611 12.9501 9.94629C13.3922 9.94624 13.7509 9.58856 13.7509 9.14648C13.7509 8.70441 13.3922 8.34673 12.9501 8.34668ZM3.90324 8.97754H6.79777L5.3505 5.25586L3.90324 8.97754ZM10.0497 3.49805C10.8699 3.49811 11.5602 4.04677 11.7773 4.79688L14.2499 4.79492L14.3505 4.80469C14.5783 4.85098 14.7504 5.05246 14.7509 5.29395C14.7512 5.57006 14.527 5.79458 14.2509 5.79492L11.7773 5.79688C11.5609 6.54809 10.8707 7.09759 10.0497 7.09766C9.22899 7.09766 8.5389 6.54862 8.32218 5.79785H8.04191C7.76577 5.79785 7.54191 5.57399 7.54191 5.29785C7.54201 5.0218 7.76583 4.79785 8.04191 4.79785H8.32218C8.53902 4.04727 9.22913 3.49805 10.0497 3.49805ZM10.0497 4.49805C9.60768 4.49805 9.25002 4.85584 9.24992 5.29785C9.24992 5.73995 9.60762 6.09766 10.0497 6.09766C10.4918 6.09758 10.8495 5.7399 10.8495 5.29785C10.8494 4.85589 10.4917 4.49812 10.0497 4.49805Z"
                fill="currentColor"
            />
        </svg>
    ),
    PencilIcon: ({ className, ...props }: IconProps) => (
        <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(className)}
            {...props}
        >
            <path
                d="M8.16667 12.2485H12.25M12.0084 2.96523L11.0333 1.99015C10.5777 1.53453 9.83897 1.53453 9.38338 1.99015L2.09171 9.28184C1.87291 9.50059 1.75 9.79733 1.75 10.1068V12.2485H3.89175C4.20117 12.2485 4.49791 12.1256 4.71671 11.9068L12.0084 4.61515C12.464 4.15953 12.464 3.42084 12.0084 2.96523Z"
                stroke="currentColor"
                strokeWidth="1.16667"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    CollapseSidebar: ({ className, ...props }: IconProps) => (
        <svg
            width="14"
            height="14"
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(className)}
            {...props}
        >
            <path
                d="M49.984,56l-35.989,0c-3.309,0 -5.995,-2.686 -5.995,-5.995l0,-36.011c0,-3.308 2.686,-5.995 5.995,-5.995l35.989,0c3.309,0 5.995,2.687 5.995,5.995l0,36.011c0,3.309 -2.686,5.995 -5.995,5.995Zm-25.984,-4.001l0,-39.999l-9.012,0c-1.65,0 -2.989,1.339 -2.989,2.989l0,34.021c0,1.65 1.339,2.989 2.989,2.989l9.012,0Zm24.991,-39.999l-20.991,0l0,39.999l20.991,0c1.65,0 2.989,-1.339 2.989,-2.989l0,-34.021c0,-1.65 -1.339,-2.989 -2.989,-2.989Z"
                fill="currentColor"
            />
            <path
                d="M19.999,38.774l-6.828,-6.828l6.828,-6.829l2.829,2.829l-4,4l4,4l-2.829,2.828Z"
                fill="currentColor"
            />
        </svg>
    ),

    SidebarLeftCollapse: ({ className, ...props }: IconProps) => (
        <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(className)}
            {...props}
        >
            <path
                d="M11.4375 7.3125L9.75 9L11.4375 10.6875"
                stroke="currentColor"
                strokeWidth="1.125"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M2.8125 4.3125C2.8125 3.48407 3.48407 2.8125 4.3125 2.8125H13.6875C14.5159 2.8125 15.1875 3.48407 15.1875 4.3125V13.6875C15.1875 14.5159 14.5159 15.1875 13.6875 15.1875H4.3125C3.48407 15.1875 2.8125 14.5159 2.8125 13.6875V4.3125Z"
                stroke="currentColor"
                strokeWidth="1.125"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M6.1875 2.8125V15.1875" stroke="currentColor" strokeWidth="1.125" />
        </svg>
    ),

    SidebarLeftExpand: ({ className, ...props }: IconProps) => (
        <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn(className)}
            {...props}
        >
            <path
                d="M9.75 7.3125L11.4375 9L9.75 10.6875"
                stroke="currentColor"
                strokeWidth="1.125"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M2.8125 4.3125C2.8125 3.48407 3.48407 2.8125 4.3125 2.8125H13.6875C14.5159 2.8125 15.1875 3.48407 15.1875 4.3125V13.6875C15.1875 14.5159 14.5159 15.1875 13.6875 15.1875H4.3125C3.48407 15.1875 2.8125 14.5159 2.8125 13.6875V4.3125Z"
                stroke="currentColor"
                strokeWidth="1.125"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M6.1875 2.8125V15.1875" stroke="currentColor" strokeWidth="1.125" />
        </svg>
    ),

    Save: ({ className, ...props }: IconProps) => (
        <svg
            width="15"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M5.8125 2.8125V5.4375C5.8125 5.85171 6.14829 6.1875 6.5625 6.1875H11.4375C11.8517 6.1875 12.1875 5.85171 12.1875 5.4375V2.8125M15.1875 5.68382V13.6875C15.1875 14.5159 14.5159 15.1875 13.6875 15.1875H4.3125C3.48407 15.1875 2.8125 14.5159 2.8125 13.6875V4.3125C2.8125 3.48407 3.48407 2.8125 4.3125 2.8125H12.3162C12.714 2.8125 13.0955 2.97053 13.3769 3.25184L14.7481 4.62316C15.0295 4.90447 15.1875 5.28599 15.1875 5.68382ZM5.8125 10.3125V14.4375C5.8125 14.8517 6.14829 15.1875 6.5625 15.1875H11.4375C11.8517 15.1875 12.1875 14.8517 12.1875 14.4375V10.3125C12.1875 9.89828 11.8517 9.5625 11.4375 9.5625H6.5625C6.14829 9.5625 5.8125 9.89828 5.8125 10.3125Z"
                stroke="currentColor"
                strokeWidth="1.125"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    DirectoryPlus: ({ className, ...props }: IconProps) => (
        <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            className={cn(className)}
            {...props}
        >
            <path
                d="M8.0625 14.4375H14.4375C15.2659 14.4375 15.9375 13.7659 15.9375 12.9375V6.5625C15.9375 5.73407 15.2659 5.0625 14.4375 5.0625H9.8028C9.30128 5.0625 8.8329 4.81185 8.55472 4.39455L7.94528 3.48045C7.6671 3.06315 7.19876 2.8125 6.69722 2.8125H3.5625C2.73407 2.8125 2.0625 3.48407 2.0625 4.3125V8.4375M3.5625 10.6875V12.9375M3.5625 12.9375V15.1875M3.5625 12.9375H1.3125M3.5625 12.9375H5.8125"
                stroke="currentColor"
                strokeWidth="1.125"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    ),
    FilePlus: ({ className, ...props }: IconProps) => (
        <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.3"
            className={cn(className)}
            {...props}
        >
            <path d="M10.2486 2.375V5.375C10.2486 6.20343 10.9201 6.875 11.7486 6.875H14.7486M4.24609 7.4375L4.24859 3.5C4.24859 2.67157 4.92017 2 5.74859 2H9.62729C10.0251 2 10.4066 2.15803 10.6879 2.43934L14.6842 6.43566C14.9656 6.71697 15.1236 7.09849 15.1236 7.4963V14.375C15.1236 15.2034 14.452 15.875 13.6236 15.875H10.6548H8.7475M4.25 10.625V12.875M4.25 12.875V15.125M4.25 12.875H2M4.25 12.875H6.5" />
        </svg>
    ),
} satisfies { [key: string]: React.FC<IconProps> };
