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
    SectionIcon,
    TextIcon,
    VideoIcon,
    ViewGridIcon,
    ViewHorizontalIcon,
    ViewVerticalIcon,
} from '@radix-ui/react-icons';
import { LayerNode } from '/common/models/element/layers';

interface NodeIconProps {
    iconClass: string;
    node: LayerNode;
}

const NodeIcon = ({ iconClass, node }: NodeIconProps) => {
    if (!node) {
        return null;
    }

    const { style, type, tagName } = node;
    if (
        type === Node.TEXT_NODE ||
        ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'STRONG', 'EM', 'SPAN', 'I'].includes(tagName)
    ) {
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
        if (style?.display === 'grid') {
            return <ViewGridIcon className={iconClass} />;
        } else if (style?.display === 'flex') {
            if (style?.flexDirection === 'column') {
                return <ViewVerticalIcon className={iconClass} />;
            } else if (style?.flexDirection === 'row') {
                return <ViewHorizontalIcon className={iconClass} />;
            } else {
                return <BoxIcon className={iconClass} />;
            }
        } else {
            return <BoxIcon className={iconClass} />;
        }
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
