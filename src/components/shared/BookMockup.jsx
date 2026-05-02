import { useState } from 'react';
import EditableImage from '../cms/EditableImage';
import EditableText from '../cms/EditableText';
import useCmsStore from '../cms/useCmsStore';

/**
 * BookMockup — album cover mockup cu suport imagine reală
 *
 * Când adminul uploadează o imagine prin EditableImage, fallback-ul (emoji + text)
 * dispare complet și se vede doar imaginea reală.
 */
export default function BookMockup({
  id,
  defaultBg = '#F5F0EB',
  defaultEmoji = '📷',
  defaultTitle = '',
  defaultSub = '',
  accent = '#8B7355',
  className = '',
  size = 'md',
  square = false,
  style = {},
}) {
  const coverSrc = useCmsStore((s) => s.get(`${id}_cover`, ''));
  const [imgLoaded, setImgLoaded] = useState(false);
  const hasImage = coverSrc && coverSrc.length > 0;

  const padding = size === 'sm' ? 'inset-[8%]' : size === 'lg' ? 'inset-[6%]' : 'inset-[10%]';
  const emojiSize = size === 'sm' ? 'text-2xl' : size === 'lg' ? 'text-5xl' : 'text-3xl';
  const titleSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-base' : 'text-xs';

  return (
    <div
      className={`relative overflow-hidden rounded-sm ${className}`}
      style={{
        aspectRatio: square ? '1/1' : '3/4',
        backgroundColor: defaultBg,
        boxShadow: '6px 6px 20px rgba(0,0,0,.1), 1px 1px 3px rgba(0,0,0,.06)',
        transform: 'rotateY(-2deg)',
        ...style,
      }}
    >
      {/* Cover image — fills entire cover */}
      <EditableImage
        id={`${id}_cover`}
        defaultSrc=""
        alt={defaultTitle || 'Copertă album'}
        className="absolute inset-0 w-full h-full z-[1]"
        imgClassName="w-full h-full object-cover"
        onLoad={() => setImgLoaded(true)}
      />

      {/* Fallback content — ONLY shown when no image uploaded */}
      {!hasImage && (
        <div className={`absolute ${padding} flex flex-col items-center justify-center gap-1.5 z-[2] pointer-events-none`}>
          <span className={emojiSize}>{defaultEmoji}</span>
          {defaultTitle && (
            <EditableText
              id={`${id}_title`}
              defaultValue={defaultTitle}
              tag="p"
              className={`font-serif ${titleSize} text-center leading-tight`}
              style={{ color: accent }}
            />
          )}
          {defaultSub && (
            <EditableText
              id={`${id}_sub`}
              defaultValue={defaultSub}
              tag="p"
              className="text-[9px] text-center"
              style={{ color: accent + '77' }}
            />
          )}
          <p className="text-[7px] tracking-[0.15em] uppercase mt-1" style={{ color: accent + '44' }}>
            fotocarte
          </p>
        </div>
      )}

      {/* 3D Spine overlay */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[5%] z-[3]"
        style={{ background: 'linear-gradient(90deg, rgba(0,0,0,.15), rgba(0,0,0,.03) 40%, rgba(0,0,0,.06) 60%, rgba(0,0,0,.01))' }}
      />
    </div>
  );
}
