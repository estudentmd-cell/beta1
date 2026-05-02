import { useRef, useCallback } from 'react';
import useCmsStore from './useCmsStore';

export default function EditableText({ id, defaultValue, tag: Tag = 'span', className = '', style }) {
  const ref = useRef(null);
  const editMode = useCmsStore((s) => s.editMode);
  const value = useCmsStore((s) => s.get(id, defaultValue));
  const update = useCmsStore((s) => s.update);

  const handleBlur = useCallback(() => {
    const newText = ref.current?.innerText?.trim();
    if (newText && newText !== value) {
      update(id, newText, 'text');
    }
  }, [id, value, update]);

  if (!editMode) {
    return <Tag className={className} style={style}>{value}</Tag>;
  }

  return (
    <Tag
      ref={ref}
      className={`cms-editable-text ${className}`}
      style={{
        ...style,
        outline: 'none',
        cursor: 'text',
      }}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onClick={(e) => e.stopPropagation()}
    >
      {value}
    </Tag>
  );
}
