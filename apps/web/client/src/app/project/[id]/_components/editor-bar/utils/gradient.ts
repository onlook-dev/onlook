export const hasGradient = (bgImage?: string): boolean => {
    return !!(bgImage && 
              bgImage !== 'none' && 
              (bgImage.includes('gradient') || 
               bgImage.includes('linear-gradient') || 
               bgImage.includes('radial-gradient') || 
               bgImage.includes('conic-gradient')));
}; 