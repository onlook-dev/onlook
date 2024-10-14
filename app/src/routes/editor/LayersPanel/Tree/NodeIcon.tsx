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
import H1Icon from '/src/assets/header-level-icons/h1.svg';
import H2Icon from '/src/assets/header-level-icons/h2.svg';
import H3Icon from '/src/assets/header-level-icons/h3.svg';
import H4Icon from '/src/assets/header-level-icons/h4.svg';
import H5Icon from '/src/assets/header-level-icons/h5.svg';
import H6Icon from '/src/assets/header-level-icons/h6.svg';

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
        return <img src={H1Icon} className={iconClass} alt="H1" />;
    } else if (tagName === 'H2') {
        return <img src={H2Icon} className={iconClass} alt="H2" />;
    } else if (tagName === 'H3') {
        return <img src={H3Icon} className={iconClass} alt="H3" />;
    } else if (tagName === 'H4') {
        return <img src={H4Icon} className={iconClass} alt="H4" />;
    } else if (tagName === 'H5') {
        return <img src={H5Icon} className={iconClass} alt="H5" />;
    } else if (tagName === 'H6') {
        return <img src={H6Icon} className={iconClass} alt="H6" />;
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
