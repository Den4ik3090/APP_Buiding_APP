import React from 'react';
import { motion } from 'framer-motion';
import InteractiveBentoGallery from '@/shared/ui/InteractiveBentoGallery';

const mediaItems = [
  {
    id: 1,
    type: 'image',
    title: 'Горный рассвет',
    desc: 'Спокойствие вершин',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
    span: 'md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2',
  },
  {
    id: 2,
    type: 'video',
    title: 'Лесной ручей',
    desc: 'Звук живой природы',
    url: 'https://cdn.pixabay.com/video/2024/07/24/222837_large.mp4',
    span: 'md:col-span-2 md:row-span-2 col-span-1 sm:col-span-2 sm:row-span-2',
  },
  {
    id: 3,
    type: 'image',
    title: 'Лесная тропа',
    desc: 'Мистический лесной путь',
    url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e',
    span: 'md:col-span-1 md:row-span-3 sm:col-span-2 sm:row-span-2',
  },
  {
    id: 4,
    type: 'image',
    title: 'Осенний парк',
    desc: 'Золото листопада',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb',
    span: 'md:col-span-2 md:row-span-2 sm:col-span-1 sm:row-span-2',
  },
  {
    id: 5,
    type: 'video',
    title: 'Тропический берег',
    desc: 'Волны и песок',
    url: 'https://cdn.pixabay.com/video/2020/07/30/46026-447087782_large.mp4',
    span: 'md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2',
  },
  {
    id: 6,
    type: 'image',
    title: 'Морской закат',
    desc: 'Солнечный пляж',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
    span: 'md:col-span-2 md:row-span-2 sm:col-span-1 sm:row-span-2',
  },
  {
    id: 7,
    type: 'image',
    title: 'Зимний лес',
    desc: 'Тишина снежного утра',
    url: 'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22',
    span: 'md:col-span-1 md:row-span-3 sm:col-span-1 sm:row-span-2',
  },
];



// Inline SVG so it can sit in a fixed layer independent of scroll


function NewReactComponent() {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#020617' }}>
      {/* Fixed beams — always visible behind scrollable content */}


      {/* Scrollable gallery on top */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <InteractiveBentoGallery
          mediaItems={mediaItems}
          title="Галерея изображений"
          description="Перетащите и исследуйте нашу коллекцию"
        />
      </div>
    </div>
  );
}

export default NewReactComponent;
