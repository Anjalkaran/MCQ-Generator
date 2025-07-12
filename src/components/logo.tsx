import Image from 'next/image';
import type { ComponentProps } from 'react';

export function Logo(props: Omit<ComponentProps<typeof Image>, 'src' | 'alt'>) {
  return (
    <Image
      src="https://i.imgur.com/G5gC33K.jpeg"
      alt="Anjalkaran Logo"
      width={250}
      height={70}
      {...props}
    />
  );
}
