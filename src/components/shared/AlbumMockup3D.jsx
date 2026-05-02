/**
 * AlbumMockup3D — mockup 3D fotorealist de album foto hardcover
 * Copertă cu hangover (depășește paginile), cotor gros cu groove,
 * pagini vizibile albe, umbră lungă.
 */

export default function AlbumMockup3D({ template, className = '', size = 'md', demoPhoto, demoText }) {
  const { coverStyle = {}, decorTexts = [], decorImages = [], frames = [], texts = [], perFormat } = template || {};
  const bg = coverStyle.bg || '#E8E4D8';
  const bgImage = coverStyle.designSquare || coverStyle.bgImage || coverStyle.previewImage;
  const accent = coverStyle.accent || '#2C2520';

  const pf = perFormat ? Object.values(perFormat)[0] : null;
  const activeFrames = pf?.frames || frames || [];
  const activeTexts = pf?.texts || texts || [];
  const activeDecorImages = pf?.decorImages || decorImages || [];
  const activeDecorTexts = pf?.decorTexts || decorTexts || [];

  const S = {
    sm:  { cover: 180, spine: 16, pages: 13, hang: 3 },
    md:  { cover: 280, spine: 22, pages: 18, hang: 4 },
    lg:  { cover: 380, spine: 28, pages: 23, hang: 5 },
    xl:  { cover: 480, spine: 34, pages: 28, hang: 6 },
  }[size] || { cover: 280, spine: 22, pages: 18, hang: 4 };

  const W = S.cover;
  const H = S.cover;
  const HANG = S.hang; // cover hangs over pages

  return (
    <div
      className={`relative ${className}`}
      style={{ width: W * 1.4, height: H * 1.35 }}
    >
      {/* ═══ SHADOW — long, soft, extending to bottom-right ═══ */}
      <div style={{
        position: 'absolute',
        width: W * 1.0,
        height: H * 0.35,
        bottom: '0%',
        left: '12%',
        background: 'radial-gradient(ellipse 70% 100% at 40% 30%, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.06) 45%, transparent 75%)',
        filter: `blur(${W * 0.05}px)`,
        zIndex: 0,
      }} />

      {/* ═══ BOOK 3D ═══ */}
      <div style={{
        position: 'absolute',
        top: '4%',
        left: '6%',
        transformStyle: 'preserve-3d',
        transform: `perspective(${W * 4}px) rotateX(10deg) rotateY(-20deg) rotateZ(1deg)`,
        zIndex: 1,
      }}>

        {/* ── PAGES BLOCK (inside, slightly smaller than cover) ── */}
        <div style={{
          position: 'absolute',
          width: W - HANG * 2,
          height: H - HANG * 2,
          left: HANG,
          top: HANG,
          transform: `translateZ(-${S.spine - 2}px)`,
          transformStyle: 'preserve-3d',
        }}>
          {/* Pages left edge */}
          <div style={{
            position: 'absolute',
            width: S.spine - 4,
            height: '100%',
            left: -(S.spine - 4) / 2,
            top: 0,
            transform: `translateX(${(S.spine - 4) / 2}px) rotateY(-90deg)`,
            transformOrigin: 'right center',
            background: `repeating-linear-gradient(180deg,
              #f8f6f2 0px, #f8f6f2 0.8px,
              #f0eee9 0.8px, #f0eee9 1.6px,
              #f5f3ef 1.6px, #f5f3ef 2.4px,
              #ece9e4 2.4px, #ece9e4 3.2px
            )`,
            boxShadow: 'inset -1px 0 3px rgba(0,0,0,0.06)',
          }} />
          {/* Pages bottom edge */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: S.pages - 4,
            left: 0,
            bottom: -(S.pages - 4) / 2,
            transform: `translateY(${(S.pages - 4) / 2}px) rotateX(90deg)`,
            transformOrigin: 'center top',
            background: `repeating-linear-gradient(90deg,
              #f8f6f2 0px, #f8f6f2 0.8px,
              #f0eee9 0.8px, #f0eee9 1.6px,
              #f5f3ef 1.6px, #f5f3ef 2.4px,
              #ece9e4 2.4px, #ece9e4 3.2px
            )`,
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
          }} />
        </div>

        {/* ── BACK COVER ── */}
        <div style={{
          position: 'absolute',
          width: W,
          height: H,
          backgroundColor: bg,
          transform: `translateZ(-${S.spine}px)`,
          borderRadius: '4px 2px 2px 4px',
          boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.05)',
        }}>
          {bgImage && <img src={bgImage} alt="" style={{
            position: 'absolute', inset: 0, width: '210%', height: '100%',
            objectFit: 'cover', objectPosition: 'left center',
            borderRadius: 'inherit', opacity: 0.3,
          }} />}
        </div>

        {/* ── COVER SPINE (left edge — same material as cover) ── */}
        <div style={{
          position: 'absolute',
          width: S.spine,
          height: H,
          left: -S.spine / 2,
          top: 0,
          transform: `translateX(${S.spine / 2}px) rotateY(-90deg)`,
          transformOrigin: 'right center',
          backgroundColor: bg,
          borderRadius: '4px 0 0 4px',
          overflow: 'hidden',
        }}>
          {/* Spine groove lines */}
          <div style={{
            position: 'absolute', right: 2, top: 0, bottom: 0, width: 1.5,
            background: 'rgba(0,0,0,0.1)',
          }} />
          <div style={{
            position: 'absolute', left: 2, top: 0, bottom: 0, width: 1,
            background: 'rgba(0,0,0,0.06)',
          }} />
          {/* Light gradient on spine */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, rgba(0,0,0,0.06) 0%, rgba(255,255,255,0.04) 40%, rgba(0,0,0,0.04) 100%)',
          }} />
        </div>

        {/* ── COVER BOTTOM EDGE ── */}
        <div style={{
          position: 'absolute',
          width: W,
          height: S.spine * 0.6,
          left: 0,
          bottom: -S.spine * 0.3,
          transform: `translateY(${S.spine * 0.3}px) rotateX(90deg)`,
          transformOrigin: 'center top',
          backgroundColor: bg,
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
        }} />

        {/* ═══ FRONT COVER — main visible face ═══ */}
        <div style={{
          position: 'absolute',
          width: W,
          height: H,
          backgroundColor: bg,
          borderRadius: '3px 5px 5px 3px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}>
          {/* Background design — show only the FRONT COVER (right half of full spread) */}
          {bgImage && (
            <img src={bgImage} alt="" style={{
              position: 'absolute', inset: 0,
              width: '210%', height: '100%',
              objectFit: 'cover',
              objectPosition: 'right center',
              borderRadius: 'inherit',
            }} loading="lazy" />
          )}

          {/* Decor images */}
          {activeDecorImages.map((di) => (
            di.src && (
              <img key={di.id} src={di.src} alt="" style={{
                position: 'absolute',
                left: `${di.x}%`, top: `${di.y}%`,
                width: `${di.w}%`, height: `${di.h}%`,
                objectFit: 'cover', pointerEvents: 'none',
              }} />
            )
          ))}

          {/* Photo frames */}
          {activeFrames.map((f) => (
            <div key={f.id} style={{
              position: 'absolute',
              left: `${f.x}%`, top: `${f.y}%`,
              width: `${f.w}%`, height: `${f.h}%`,
              overflow: 'hidden',
            }}>
              {(demoPhoto || f.previewSrc) ? (
                <img src={demoPhoto || f.previewSrc} alt="" style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  backgroundColor: 'rgba(0,0,0,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width={Math.max(14, W * 0.05)} height={Math.max(14, W * 0.05)} viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth="1.5">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
              )}
            </div>
          ))}

          {/* Decor texts */}
          {activeDecorTexts.map((dt) => (
            <div key={dt.id} style={{
              position: 'absolute',
              left: `${dt.x}%`, top: `${dt.y}%`,
              width: `${dt.w}%`, height: `${dt.h}%`,
              fontSize: `${Math.max((dt.fontSize || 14) * (W / 400), 6)}px`,
              fontWeight: dt.fontWeight || 'normal',
              color: dt.color || accent,
              fontFamily: dt.fontFamily || '"DM Serif Display", serif',
              textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              letterSpacing: '0.03em', lineHeight: 1.2,
              pointerEvents: 'none',
            }}>
              {dt.text}
            </div>
          ))}

          {/* Text zones */}
          {activeTexts.map((t) => (
            <div key={t.id} style={{
              position: 'absolute',
              left: `${t.x}%`, top: `${t.y}%`,
              width: `${t.w}%`, height: `${t.h}%`,
              fontSize: `${Math.max((t.fontSize || 14) * (W / 400), 7)}px`,
              fontWeight: t.fontWeight || 'bold',
              color: accent,
              textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              letterSpacing: '0.04em', lineHeight: 1.2,
              pointerEvents: 'none',
            }}>
              {demoText || t.placeholder || ''}
            </div>
          ))}

          {/* ── Binding groove — canal vertical lângă cotor ── */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: 10,
            background: `linear-gradient(90deg,
              rgba(0,0,0,0.10) 0%,
              rgba(0,0,0,0.04) 20%,
              rgba(0,0,0,0.08) 30%,
              rgba(0,0,0,0.02) 45%,
              rgba(255,255,255,0.02) 55%,
              transparent 100%
            )`,
            borderRadius: '3px 0 0 3px',
          }} />

          {/* ── Second groove line (characteristic of hardcover) ── */}
          <div style={{
            position: 'absolute', left: 10, top: 2, bottom: 2, width: 1,
            background: 'rgba(0,0,0,0.05)',
          }} />

          {/* ── Matte surface ── */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(140deg, rgba(255,255,255,0.05) 0%, transparent 30%, rgba(0,0,0,0.015) 100%)',
            borderRadius: 'inherit',
            pointerEvents: 'none',
          }} />
        </div>
      </div>
    </div>
  );
}
