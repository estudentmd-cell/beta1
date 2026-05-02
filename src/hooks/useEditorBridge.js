import { useState, useCallback } from 'react';
import useProjectStore from '../stores/useProjectStore';
import useUIStore from '../stores/useUIStore';

export default function useEditorBridge() {
  const [isEditorReady, setIsEditorReady] = useState(true);
  const { setSpreadCount, setEditorData } = useProjectStore();
  const { addToast } = useUIStore();

  const updateSpreads = useCallback((count) => {
    setSpreadCount(count);
  }, [setSpreadCount]);

  const saveEditorData = useCallback((data) => {
    setEditorData(data);
    addToast('Salvat!');
  }, [setEditorData, addToast]);

  return { isEditorReady, updateSpreads, saveEditorData };
}
