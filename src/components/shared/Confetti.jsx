import { useEffect, useState } from 'react';

const COLORS = ['#3D6B5E', '#4D8B74', '#E8B931', '#D4A59A', '#B54A3A', '#FAF8F5'];

function randomBetween(a, b) { return a + Math.random() * (b - a); }

export default function Confetti({ active = false, duration = 3000 }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (!active) return;
    const newPieces = Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: randomBetween(5, 95),
      delay: randomBetween(0, 0.5),
      duration: randomBetween(1.5, 3),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: randomBetween(6, 12),
      rotation: randomBetween(0, 360),
    }));
    setPieces(newPieces);
    const timer = setTimeout(() => setPieces([]), duration);
    return () => clearTimeout(timer);
  }, [active, duration]);

  if (pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[999] overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: '-10px',
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            borderRadius: '2px',
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
