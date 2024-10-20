import {
    BoxIcon,
    ButtonIcon,
    DropdownMenuIcon,
    FrameIcon,
    ImageIcon,
    InputIcon,
    Link2Icon,
    ListBulletIcon,
    Pencil2Icon,
    PilcrowIcon,
    SectionIcon,
    TextIcon,
    VideoIcon,
    ViewGridIcon,
    ViewHorizontalIcon,
    ViewVerticalIcon,
} from '@radix-ui/react-icons';
import { LayerNode } from '/common/models/element/layers';
import { Icons } from '@/components/icons';

interface NodeIconProps {
    iconClass: string;
    node: LayerNode;
}

const NodeIcon = ({ iconClass, node }: NodeIconProps) => {
    if (!node) {
        return null;
    }

    const tagName = node.tagName.toUpperCase();
    if (tagName === 'H1') {
        return <Icons.H1 className={iconClass} />;
    } else if (tagName === 'H2') {
        return <Icons.H2 className={iconClass} />;
    } else if (tagName === 'H3') {
        return <Icons.H3 className={iconClass} />;
    } else if (tagName === 'H4') {
        return <Icons.H4 className={iconClass} />;
    } else if (tagName === 'H5') {
        return <Icons.H5 className={iconClass} />;
    } else if (tagName === 'H6') {
        return <Icons.H6 className={iconClass} />;
    } else if (tagName === 'P') {
        return <PilcrowIcon className={iconClass} />;
    } else if (['STRONG', 'EM', 'SPAN', 'I'].includes(tagName)) {
        return <TextIcon className={iconClass} />;
    } else if (tagName === 'A') {
        return <Link2Icon className={iconClass} />;
    } else if (['IMG', 'SVG'].includes(tagName)) {
        return <ImageIcon className={iconClass} />;
    } else if (tagName === 'VIDEO') {
        return <VideoIcon className={iconClass} />;
    } else if (tagName === 'IFRAME') {
        return <FrameIcon className={iconClass} />;
    } else if (tagName === 'BUTTON') {
        return <ButtonIcon className={iconClass} />;
    } else if (tagName === 'INPUT') {
        return <InputIcon className={iconClass} />;
    } else if (['UL', 'OL'].includes(tagName)) {
        return <ListBulletIcon className={iconClass} />;
    } else if (tagName === 'SECTION') {
        return <SectionIcon className={iconClass} />;
    } else if (tagName === 'DIV') {
        return <BoxIcon className={iconClass} />;
    } else if (['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD'].includes(tagName)) {
        return <ViewGridIcon className={iconClass} />;
    } else if (tagName === 'FORM') {
        return <ViewHorizontalIcon className={iconClass} />;
    } else if (['SELECT', 'OPTION'].includes(tagName)) {
        return <DropdownMenuIcon className={iconClass} />;
    } else if (tagName === 'TEXTAREA') {
        return <ViewVerticalIcon className={iconClass} />;
    } else if (tagName === 'CANVAS') {
        return <Pencil2Icon className={iconClass} />;
    } else {
        return <FrameIcon className={iconClass} />;
    }
};

export default NodeIcon;
