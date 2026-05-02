import { useState, useEffect } from 'react';

const SALE_END = '2026-05-10T23:59:59';

function pad(n) {
  return String(n).padStart(2, '0');
}

function getTimeLeft() {
  const diff = new Date(SALE_END) - new Date();
  if (diff <= 0) return null;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

function TimeBox({ value, label }) {
  return (
    <div className="flex flex-col items-center mx-1.5 sm:mx-2.5">
      <span className="text-[18px] sm:text-[22px] font-bold leading-none tabular-nums">
        {pad(value)}
      </span>
      <span className="text-[9px] sm:text-[10px] uppercase tracking-wider opacity-60 mt-0.5">
        {label}
      </span>
    </div>
  );
}

function Colon() {
  return <span className="text-[18px] sm:text-[22px] font-light opacity-40 -mx-0.5">:</span>;
}

export default function CountdownStrip() {
  const [time, setTime] = useState(getTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!time) return null;

  return (
    <div className="bg-[#1c1c1c] text-white py-2.5 sm:py-3">
      <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-center gap-3 sm:gap-5">
        <span className="text-[11px] sm:text-[12px] uppercase tracking-[0.15em] font-medium">
          Oferta expiră în
        </span>
        <div className="flex items-center">
          <TimeBox value={time.d} label="zile" />
          <Colon />
          <TimeBox value={time.h} label="ore" />
          <Colon />
          <TimeBox value={time.m} label="min" />
          <Colon />
          <TimeBox value={time.s} label="sec" />
        </div>
      </div>
    </div>
  );
}
