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
        return <Icons.PilcrowIcon className={iconClass} />;
    } else if (['STRONG', 'EM', 'SPAN', 'I'].includes(tagName)) {
        return <Icons.TextIcon className={iconClass} />;
    } else if (tagName === 'A') {
        return <Icons.Link2Icon className={iconClass} />;
    } else if (['IMG', 'SVG'].includes(tagName)) {
        return <Icons.ImageIcon className={iconClass} />;
    } else if (tagName === 'VIDEO') {
        return <Icons.VideoIcon className={iconClass} />;
    } else if (tagName === 'IFRAME') {
        return <Icons.FrameIcon className={iconClass} />;
    } else if (tagName === 'BUTTON') {
        return <Icons.ButtonIcon className={iconClass} />;
    } else if (tagName === 'INPUT') {
        return <Icons.InputIcon className={iconClass} />;
    } else if (['UL', 'OL'].includes(tagName)) {
        return <Icons.ListBulletIcon className={iconClass} />;
    } else if (tagName === 'SECTION') {
        return <Icons.SectionIcon className={iconClass} />;
    } else if (tagName === 'DIV') {
        return <Icons.BoxIcon className={iconClass} />;
    } else if (['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD'].includes(tagName)) {
        return <Icons.ViewGridIcon className={iconClass} />;
    } else if (tagName === 'FORM') {
        return <Icons.ViewHorizontalIcon className={iconClass} />;
    } else if (['SELECT', 'OPTION'].includes(tagName)) {
        return <Icons.DropdownMenuIcon className={iconClass} />;
    } else if (tagName === 'TEXTAREA') {
        return <Icons.ViewVerticalIcon className={iconClass} />;
    } else if (tagName === 'CANVAS') {
        return <Icons.Pencil2Icon className={iconClass} />;
    } else {
        return <Icons.FrameIcon className={iconClass} />;
    }
};

export default NodeIcon;
