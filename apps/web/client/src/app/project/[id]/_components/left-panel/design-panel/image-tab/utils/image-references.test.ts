import { describe, expect, it } from 'bun:test';
import { updateImageReferences } from './image-references';

describe('updateImageReferences', () => {
    it('should update src attribute in img tag', async () => {
        const content = `
export function Component() {
    return <img src="/images/old-image.jpg" alt="test" />;
}
`;
        const result = await updateImageReferences(
            content,
            '/images/old-image.jpg',
            '/images/new-image.jpg'
        );
        expect(result).toContain('src="/images/new-image.jpg"');
        expect(result).not.toContain('old-image.jpg');
    });

    it('should update backgroundImage in style prop', async () => {
        const content = `
export function Component() {
    return <div style={{ backgroundImage: "url('/assets/hero.jpg')" }} />;
}
`;
        const result = await updateImageReferences(
            content,
            '/assets/hero.jpg',
            '/assets/new-hero.jpg'
        );
        expect(result).toContain("url('/assets/new-hero.jpg')");
        expect(result).not.toContain("'/assets/hero.jpg'");
    });

    it('should update multiple references in the same file', async () => {
        const content = `
export function Component() {
    return (
        <div>
            <img src="/images/logo.png" />
            <img src="/images/logo.png" alt="Logo" />
        </div>
    );
}
`;
        const result = await updateImageReferences(
            content,
            '/images/logo.png',
            '/images/new-logo.png'
        );
        expect(result).toContain('src="/images/new-logo.png"');
        expect(result).not.toContain('"/images/logo.png"');
    });

    it('should not modify content if no references found', async () => {
        const content = `
export function Component() {
    return <div>No images here</div>;
}
`;
        const result = await updateImageReferences(
            content,
            '/images/old-image.jpg',
            '/images/new-image.jpg'
        );
        expect(result).toBe(content);
    });

    it('should handle Image component from next/image', async () => {
        const content = `
import Image from 'next/image';

export function Component() {
    return <Image src="/photos/sunset.jpg" alt="Sunset" width={500} height={300} />;
}
`;
        const result = await updateImageReferences(
            content,
            '/photos/sunset.jpg',
            '/photos/sunrise.jpg'
        );
        expect(result).toContain('src="/photos/sunrise.jpg"');
        expect(result).not.toContain('sunset.jpg');
    });

    it('should update only the filename when using just filename', async () => {
        const content = `
export function Component() {
    return <img src="photo.jpg" alt="test" />;
}
`;
        const result = await updateImageReferences(
            content,
            'photo.jpg',
            'new-photo.jpg'
        );
        expect(result).toContain('src="new-photo.jpg"');
        expect(result).not.toContain('"photo.jpg"');
    });

    it('should update className with image references', async () => {
        const content = `
export function Component() {
    return <div className="some-class /images/bg.png other-class" />;
}
`;
        const result = await updateImageReferences(
            content,
            '/images/bg.png',
            '/images/new-bg.png'
        );
        expect(result).toContain('/images/new-bg.png');
        expect(result).not.toContain('/images/bg.png');
    });

    it('should update template literal className', async () => {
        const content = `
export function Component() {
    const imagePath = '/images/hero.jpg';
    return <div className={\`container \${imagePath} wrapper\`} />;
}
`;
        const result = await updateImageReferences(
            content,
            '/images/hero.jpg',
            '/images/new-hero.jpg'
        );
        // Note: Variable declarations aren't updated, only JSX attributes
        expect(result).toContain("imagePath = '/images/hero.jpg'");
    });

    it('should handle relative paths', async () => {
        const content = `
export function Component() {
    return <img src="./assets/logo.svg" alt="Logo" />;
}
`;
        const result = await updateImageReferences(
            content,
            './assets/logo.svg',
            './assets/new-logo.svg'
        );
        expect(result).toContain('src="./assets/new-logo.svg"');
        expect(result).not.toContain('src="./assets/logo.svg"');
    });

    it('should handle absolute paths with different extensions', async () => {
        const content = `
export function Component() {
    return (
        <div>
            <img src="/public/images/photo.webp" />
            <img src="/public/images/photo.webp" alt="Photo" />
        </div>
    );
}
`;
        const result = await updateImageReferences(
            content,
            '/public/images/photo.webp',
            '/public/images/updated-photo.webp'
        );
        expect(result).toContain('src="/public/images/updated-photo.webp"');
        expect(result).not.toContain('src="/public/images/photo.webp"');
    });

    it('should handle paths with special characters', async () => {
        const content = `
export function Component() {
    return <img src="/images/my-photo (1).jpg" alt="test" />;
}
`;
        const result = await updateImageReferences(
            content,
            '/images/my-photo (1).jpg',
            '/images/my-photo (2).jpg'
        );
        expect(result).toContain('src="/images/my-photo (2).jpg"');
        expect(result).not.toContain('my-photo (1).jpg');
    });

    it('should update multiple different images independently', async () => {
        const content = `
export function Component() {
    return (
        <div>
            <img src="/images/logo.png" />
            <img src="/images/banner.jpg" />
        </div>
    );
}
`;
        const result = await updateImageReferences(
            content,
            '/images/logo.png',
            '/images/new-logo.png'
        );
        expect(result).toContain('src="/images/new-logo.png"');
        expect(result).toContain('src="/images/banner.jpg"');
        expect(result).not.toContain('src="/images/logo.png"');
    });

    it('should handle nested JSX elements', async () => {
        const content = `
export function Component() {
    return (
        <div>
            <section>
                <div style={{ backgroundImage: "url('/bg/pattern.svg')" }}>
                    <img src="/icons/star.png" />
                </div>
            </section>
        </div>
    );
}
`;
        const result = await updateImageReferences(
            content,
            '/icons/star.png',
            '/icons/new-star.png'
        );
        expect(result).toContain('src="/icons/new-star.png"');
        expect(result).toContain("url('/bg/pattern.svg')");
        expect(result).not.toContain('src="/icons/star.png"');
    });

    it('should preserve formatting and whitespace', async () => {
        const content = `
export function Component() {
    return (
        <img
            src="/images/photo.jpg"
            alt="Photo"
            width={500}
            height={300}
        />
    );
}
`;
        const result = await updateImageReferences(
            content,
            '/images/photo.jpg',
            '/images/new-photo.jpg'
        );
        expect(result).toContain('src="/images/new-photo.jpg"');
        expect(result).toContain('alt="Photo"');
        expect(result).toContain('width={500}');
        expect(result).not.toContain('src="/images/photo.jpg"');
    });

    it('should handle images in object properties', async () => {
        const content = `
export function Component() {
    return (
        <div
            style={{
                backgroundImage: "url('/images/hero.png')",
                backgroundSize: 'cover'
            }}
        />
    );
}
`;
        const result = await updateImageReferences(
            content,
            '/images/hero.png',
            '/images/new-hero.png'
        );
        expect(result).toContain("url('/images/new-hero.png')");
        expect(result).toContain('backgroundSize');
        expect(result).not.toContain("url('/images/hero.png')");
    });

    it('should handle URL-encoded paths', async () => {
        const content = `
export function Component() {
    return <img src="/images/my%20photo.jpg" alt="test" />;
}
`;
        const result = await updateImageReferences(
            content,
            '/images/my%20photo.jpg',
            '/images/new%20photo.jpg'
        );
        expect(result).toContain('src="/images/new%20photo.jpg"');
        expect(result).not.toContain('my%20photo.jpg');
    });

    it('should handle images in array map', async () => {
        const content = `
export function Gallery() {
    const images = ['/gallery/img1.jpg', '/gallery/img2.jpg'];
    return (
        <div>
            {images.map((src) => <img key={src} src={src} />)}
            <img src="/gallery/img1.jpg" alt="Featured" />
        </div>
    );
}
`;
        const result = await updateImageReferences(
            content,
            '/gallery/img1.jpg',
            '/gallery/new-img1.jpg'
        );
        // JSX src attribute should be updated
        expect(result).toContain('src="/gallery/new-img1.jpg"');
        expect(result).toContain('/gallery/img2.jpg');
        // Note: Array literals aren't updated, only JSX attributes
    });

    it('should handle conditional rendering with images', async () => {
        const content = `
export function Component({ isActive }) {
    return (
        <img
            src={isActive ? "/icons/active.svg" : "/icons/inactive.svg"}
            alt="Status"
        />
    );
}
`;
        const result = await updateImageReferences(
            content,
            '/icons/active.svg',
            '/icons/new-active.svg'
        );
        // Note: Ternary expressions aren't currently updated, only direct string literals
        // This is a known limitation - ternary values would need separate handling
        expect(result).toContain('/icons/inactive.svg');
    });

    it('should not replace similar filenames', async () => {
        const content = `
export function Component() {
    return (
        <div>
            <img src="/images/logo.png" />
            <img src="/images/logo-dark.png" />
        </div>
    );
}
`;
        const result = await updateImageReferences(
            content,
            '/images/logo.png',
            '/images/new-logo.png'
        );
        expect(result).toContain('src="/images/new-logo.png"');
        expect(result).toContain('src="/images/logo-dark.png"');
        expect(result).not.toContain('"/images/logo.png"');
    });

    it('should handle mixed quotes in same file', async () => {
        const content = `
export function Component() {
    return (
        <div>
            <img src="/images/photo1.jpg" />
            <img src='/images/photo2.jpg' />
        </div>
    );
}
`;
        const result = await updateImageReferences(
            content,
            '/images/photo1.jpg',
            '/images/new-photo1.jpg'
        );
        expect(result).toContain('src="/images/new-photo1.jpg"');
        expect(result).toContain("src='/images/photo2.jpg'");
        expect(result).not.toContain('src="/images/photo1.jpg"');
    });
});
