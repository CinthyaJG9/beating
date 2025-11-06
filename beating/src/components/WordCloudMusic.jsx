// components/WordCloudMusic.jsx
import React, { useCallback, useMemo } from 'react';
import ReactWordcloud from 'react-wordcloud';

const WordCloudMusic = ({ words, width = 600, height = 400 }) => {
  // Forma de nota musical - definimos puntos para crear la silueta
  const musicNoteShape = useMemo(() => {
    const points = [];
    // Crear forma de nota musical (simplificada)
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * 2 * Math.PI;
      // Forma ovalada para la cabeza de la nota
      if (i < 50) {
        points.push([
          0.5 + 0.4 * Math.cos(angle),
          0.3 + 0.2 * Math.sin(angle)
        ]);
      } 
      // Forma alargada para el cuerpo
      else {
        const progress = (i - 50) / 50;
        points.push([
          0.5 + 0.1 * Math.cos(angle),
          0.5 + 0.4 * progress
        ]);
      }
    }
    return points;
  }, []);

  const options = {
    colors: ['#ec4899', '#a855f7', '#8b5cf6', '#d946ef', '#f59e0b', '#10b981'],
    enableTooltip: true,
    deterministic: false,
    fontFamily: 'Arial, sans-serif',
    fontSizes: [20, 60],
    fontStyle: 'normal',
    fontWeight: 'bold',
    padding: 1,
    rotations: 3,
    rotationAngles: [-45, 0, 45],
    scale: 'sqrt',
    spiral: 'archimedean',
    transitionDuration: 1000,
  };

  const callbacks = {
    getWordColor: (word) => word.color || options.colors[Math.floor(Math.random() * options.colors.length)],
    getWordTooltip: (word) => `${word.text} (${word.value} veces)`,
    onWordClick: (word) => console.log('Palabra clickeada:', word),
    onWordMouseOver: (word) => console.log('Palabra hover:', word),
  };

  return (
    <div className="relative">
      <div 
        className="bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10 p-6"
        style={{ width, height }}
      >
        <ReactWordcloud
          words={words}
          options={options}
          callbacks={callbacks}
        />
      </div>
      
      {/* Efecto de brillo sutil */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 pointer-events-none" />
    </div>
  );
};

export default WordCloudMusic;