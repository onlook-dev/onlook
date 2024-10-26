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
        return <Icons.Pilcrow className={iconClass} />;
    } else if (['STRONG', 'EM', 'SPAN', 'I'].includes(tagName)) {
        return <Icons.Text className={iconClass} />;
    } else if (tagName === 'A') {
        return <Icons.Link className={iconClass} />;
    } else if (['IMG', 'SVG'].includes(tagName)) {
        return <Icons.Image className={iconClass} />;
    } else if (tagName === 'VIDEO') {
        return <Icons.Video className={iconClass} />;
    } else if (tagName === 'IFRAME') {
        return <Icons.Frame className={iconClass} />;
    } else if (tagName === 'BUTTON') {
        return <Icons.Button className={iconClass} />;
    } else if (tagName === 'INPUT') {
        return <Icons.Input className={iconClass} />;
    } else if (['UL', 'OL'].includes(tagName)) {
        return <Icons.ListBullet className={iconClass} />;
    } else if (tagName === 'SECTION') {
        return <Icons.Section className={iconClass} />;
    } else if (tagName === 'DIV') {
        return <Icons.Box className={iconClass} />;
    } else if (['TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD'].includes(tagName)) {
        return <Icons.ViewGrid className={iconClass} />;
    } else if (tagName === 'FORM') {
        return <Icons.ViewHorizontal className={iconClass} />;
    } else if (['SELECT', 'OPTION'].includes(tagName)) {
        return <Icons.DropdownMenu className={iconClass} />;
    } else if (tagName === 'TEXTAREA') {
        return <Icons.ViewVertical className={iconClass} />;
    } else if (tagName === 'CANVAS') {
        return <Icons.PencilPaper className={iconClass} />;
    } else {
        return <Icons.Frame className={iconClass} />;
    }
};

export default NodeIcon;
