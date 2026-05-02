import { useState, useRef, useEffect, useMemo } from 'react';

export default function MobileNavMenu({ items, accentColor, activeIndex: controlledIndex, onSelect }) {
  const [internalIndex, setInternalIndex] = useState(0);
  const activeIndex = controlledIndex !== undefined ? controlledIndex : internalIndex;

  const textRefs = useRef([]);
  const itemRefs = useRef([]);

  useEffect(() => {
    const setLineWidth = () => {
      const activeItem = itemRefs.current[activeIndex];
      const activeText = textRefs.current[activeIndex];
      if (activeItem && activeText) {
        activeItem.style.setProperty('--lineWidth', `${activeText.offsetWidth}px`);
      }
    };
    setLineWidth();
    window.addEventListener('resize', setLineWidth);
    return () => window.removeEventListener('resize', setLineWidth);
  }, [activeIndex, items]);

  const handleClick = (index) => {
    if (onSelect) onSelect(index);
    else setInternalIndex(index);
  };

  return (
    <nav
      className="mobile-nav-menu"
      role="navigation"
      style={{ '--nav-accent': accentColor || '#3D6B5E' }}
    >
      {items.map((item, index) => {
        const isActive = index === activeIndex;
        const Icon = item.icon;
        return (
          <button
            key={item.id || item.label}
            className={`mobile-nav-menu__item ${isActive ? 'active' : ''}`}
            onClick={() => handleClick(index)}
            ref={(el) => (itemRefs.current[index] = el)}
            style={{ '--lineWidth': '0px' }}
          >
            <div className="mobile-nav-menu__icon">
              <Icon className="mobile-nav-menu__svg" />
            </div>
            <strong
              className={`mobile-nav-menu__text ${isActive ? 'active' : ''}`}
              ref={(el) => (textRefs.current[index] = el)}
            >
              {item.label}
            </strong>
          </button>
        );
      })}
    </nav>
  );
}
