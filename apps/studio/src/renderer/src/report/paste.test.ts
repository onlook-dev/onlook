import { expect, test } from 'bun:test';
import { pasteReportImage } from './paste.js';

function item(type: string, file: File | null, kind = 'file'): DataTransferItem {
  return { type, kind, getAsFile: () => file } as DataTransferItem;
}

function paste(items: DataTransferItem[] | null) {
  const images: File[] = [];
  let prevented = false;
  pasteReportImage({
    clipboardData: items === null ? null : { items } as unknown as DataTransfer,
    preventDefault: () => { prevented = true; },
  }, (file) => { images.push(file); });
  return { images, prevented };
}

test.each(['image/png', 'image/jpeg'])('pasted %s files use the image attachment path', (type) => {
  const image = new File(['image bytes'], 'clipboard', { type });
  expect(paste([item(type, image)])).toEqual({ images: [image], prevented: true });
});

test('plain text, non-image files and empty clipboards keep native paste', () => {
  for (const items of [null, [], [item('text/plain', null, 'string')], [item('application/pdf', new File(['pdf'], 'document.pdf'))]]) {
    expect(paste(items)).toEqual({ images: [], prevented: false });
  }
});

test('an image wins over accompanying text without pasting that text into the message', () => {
  const image = new File(['image bytes'], 'clipboard.png', { type: 'image/png' });
  expect(paste([item('text/plain', null, 'string'), item('image/png', image)]))
    .toEqual({ images: [image], prevented: true });
});

test('only the first retrievable image is attached', () => {
  const first = new File(['first'], 'first.png', { type: 'image/png' });
  const second = new File(['second'], 'second.jpg', { type: 'image/jpeg' });
  expect(paste([item('image/png', null), item('image/png', first), item('image/jpeg', second)]))
    .toEqual({ images: [first], prevented: true });
});

test('an unavailable image file leaves native paste alone', () => {
  expect(paste([item('image/png', null)])).toEqual({ images: [], prevented: false });
});

test('unsupported image formats reach the existing validation instead of pasting accompanying text', () => {
  const image = new File(['gif bytes'], 'clipboard.gif', { type: 'image/gif' });
  expect(paste([item('image/gif', image)])).toEqual({ images: [image], prevented: true });
});

test('an image MIME string without a file is not treated as an attachment', () => {
  expect(paste([item('image/png', null, 'string')])).toEqual({ images: [], prevented: false });
});
