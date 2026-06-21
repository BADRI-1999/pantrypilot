import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PantryPilot',
    short_name: 'PantryPilot',
    description: 'Pantry-aware nutrition: receipts → inventory → meals → shopping list.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f1410',
    theme_color: '#1e2820',
    orientation: 'portrait-primary',
    categories: ['food', 'health', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
