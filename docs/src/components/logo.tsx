import Image from 'next/image'

export default function Logo(props: { width?: number; height?: number }) {
    return (
        <Image
            src="/logo.png"
            width={props.width || 100}
            height={props.height || 100}
            alt="Onlook logo"
        />
    )
}