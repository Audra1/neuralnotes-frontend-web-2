import React, { useState, useEffect, useRef, useCallback } from 'react';
import defaultNoteStar from '../../../../assets/defaultnotestar.png';
import './Description.css';

export default function Description({ 
  description = '', 
  onSave,
  placeholder = "Add context..." 
}) {
  const [blocks, setBlocks] = useState([]);
  const [localContent, setLocalContent] = useState({}); // Track local content per block
  const [isEditing, setIsEditing] = useState({}); // Track editing state per block
  const [focusedBlockIndex, setFocusedBlockIndex] = useState(null);
  const [draggedBlockIndex, setDraggedBlockIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const blockRefs = useRef([]);
  const saveTimeoutRef = useRef(null);

  // Convert description to blocks array on mount or when description changes
  useEffect(() => {
    // Only update blocks that are not currently being edited
    if (Array.isArray(description)) {
      const newBlocks = description.length > 0 ? description : [createEmptyBlock()];
      updateBlocksConditionally(newBlocks);
    } else if (typeof description === 'string') {
      if (description === '') {
        updateBlocksConditionally([createEmptyBlock()]);
      } else {
        const lines = description.split('\n');
        const initialBlocks = lines.map((line, index) => {
          if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
            return {
              id: `block-${Date.now()}-${index}`,
              type: 'bullet',
              content: line.trim().substring(1).trim()
            };
          }
          return {
            id: `block-${Date.now()}-${index}`,
            type: 'paragraph',
            content: line
          };
        });
        updateBlocksConditionally(initialBlocks);
      }
    } else {
      updateBlocksConditionally([createEmptyBlock()]);
    }
  }, [description]);

  // Helper function to update blocks only if not editing
  const updateBlocksConditionally = (newBlocks) => {
    setBlocks(prevBlocks => {
      const updatedBlocks = [...newBlocks];

      // Only preserve local content for blocks that are actively being edited
      newBlocks.forEach((newBlock, index) => {
        if (isEditing[index] && prevBlocks[index]) {
          // User is editing this block - preserve local content
          updatedBlocks[index] = { ...prevBlocks[index] };
          if (localContent[index] !== undefined) {
            updatedBlocks[index].content = localContent[index];
          }
        }
      });

      return updatedBlocks;
    });
  };

  const createEmptyBlock = () => ({
    id: `block-${Date.now()}-${Math.random()}`,
    type: 'paragraph',
    content: ''
  });

  // Debounced save function (500ms delay) - save from local content
  const debouncedSave = useCallback((blockIndex) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      // Create blocks array with current local content
      const blocksToSave = blocks.map((block, index) => ({
        ...block,
        content: localContent[index] !== undefined ? localContent[index] : block.content
      }));
      
      console.log('🔄 Auto-saving blocks:', blocksToSave);
      onSave(blocksToSave);
    }, 500);
  }, [blocks, localContent, onSave]);

  // Save blocks immediately for structural changes
  const immediateSave = useCallback((blocksToSave) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    console.log('💾 Immediate save blocks:', blocksToSave);
    onSave(blocksToSave);
  }, [onSave]);

  const handleInput = (e, index) => {
    const element = e.target;
    const newContent = element.textContent || '';
    
    // Save cursor position before any state updates
    const selection = window.getSelection();
    const cursorOffset = selection.rangeCount > 0 ? selection.getRangeAt(0).startOffset : 0;
    
    // Update local content only - don't touch blocks state during typing
    setLocalContent(prev => ({
      ...prev,
      [index]: newContent
    }));

    // Check for bullet conversion (only for paragraph blocks)
    if (blocks[index].type === 'paragraph') {
      const trimmed = newContent.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const updatedBlocks = [...blocks];
        updatedBlocks[index] = {
          ...updatedBlocks[index],
          type: 'bullet'
        };
        setBlocks(updatedBlocks);
        
        // Update local content with trimmed bullet content
        const bulletContent = trimmed.substring(1).trim();
        setLocalContent(prev => ({
          ...prev,
          [index]: bulletContent
        }));
        
        // Restore cursor after conversion - use requestAnimationFrame for better timing
        requestAnimationFrame(() => {
          if (blockRefs.current[index]) {
            const element = blockRefs.current[index];
            const range = document.createRange();
            const selection = window.getSelection();
            const textNode = element.firstChild || element;
            const safeOffset = Math.min(cursorOffset - 1, textNode.textContent?.length || 0);
            range.setStart(textNode, Math.max(0, safeOffset));
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        });
        return;
      }
    }

    // Remove the cursor restoration here - let React handle it naturally
    // The issue was this setTimeout competing with React's render cycle

    // Trigger debounced save
    debouncedSave(index);
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const newBlock = createEmptyBlock();
      const updatedBlocks = [...blocks];
      updatedBlocks.splice(index + 1, 0, newBlock);
      setBlocks(updatedBlocks);
      
      // Sync local content to blocks for immediate save
      const blocksWithLocalContent = updatedBlocks.map((block, i) => ({
        ...block,
        content: localContent[i] !== undefined ? localContent[i] : block.content
      }));
      
      immediateSave(blocksWithLocalContent);
      
      // Focus next block
      setTimeout(() => {
        setFocusedBlockIndex(index + 1);
        if (blockRefs.current[index + 1]) {
          blockRefs.current[index + 1].focus();
        }
      }, 0);
      
    } else if (e.key === 'Backspace') {
      const currentContent = localContent[index] !== undefined ? localContent[index] : blocks[index].content;
      
      if (currentContent === '' && blocks.length > 1) {
        e.preventDefault();
        
        const updatedBlocks = [...blocks];
        updatedBlocks.splice(index, 1);
        setBlocks(updatedBlocks);
        
        // Clean up local content for removed block
        setLocalContent(prev => {
          const newLocal = { ...prev };
          delete newLocal[index];
          // Shift down indices for blocks after removed one
          Object.keys(newLocal).forEach(key => {
            const keyIndex = parseInt(key);
            if (keyIndex > index) {
              newLocal[keyIndex - 1] = newLocal[keyIndex];
              delete newLocal[keyIndex];
            }
          });
          return newLocal;
        });
        
        // Sync and save
        const blocksWithLocalContent = updatedBlocks.map((block, i) => ({
          ...block,
          content: localContent[i] !== undefined ? localContent[i] : block.content
        }));
        
        immediateSave(blocksWithLocalContent);
        
        const prevIndex = Math.max(0, index - 1);
        setTimeout(() => {
          setFocusedBlockIndex(prevIndex);
          if (blockRefs.current[prevIndex]) {
            blockRefs.current[prevIndex].focus();
            // Position cursor at end
            const element = blockRefs.current[prevIndex];
            const range = document.createRange();
            const selection = window.getSelection();
            range.selectNodeContents(element);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }, 0);
        
      } else if (window.getSelection().anchorOffset === 0 && index > 0) {
        e.preventDefault();
        
        const updatedBlocks = [...blocks];
        const currentContent = localContent[index] !== undefined ? localContent[index] : blocks[index].content;
        const prevContent = localContent[index - 1] !== undefined ? localContent[index - 1] : blocks[index - 1].content;
        const mergePoint = prevContent.length;
        
        // Merge content
        const mergedContent = prevContent + currentContent;
        updatedBlocks[index - 1].content = mergedContent;
        updatedBlocks.splice(index, 1);
        setBlocks(updatedBlocks);
        
        // Update local content
        setLocalContent(prev => {
          const newLocal = { ...prev };
          newLocal[index - 1] = mergedContent;
          delete newLocal[index];
          // Shift down indices for blocks after removed one
          Object.keys(newLocal).forEach(key => {
            const keyIndex = parseInt(key);
            if (keyIndex > index) {
              newLocal[keyIndex - 1] = newLocal[keyIndex];
              delete newLocal[keyIndex];
            }
          });
          return newLocal;
        });
        
        // Sync and save
        const blocksWithLocalContent = updatedBlocks.map((block, i) => ({
          ...block,
          content: i === index - 1 ? mergedContent : (localContent[i] !== undefined ? localContent[i] : block.content)
        }));
        
        immediateSave(blocksWithLocalContent);
        
        setTimeout(() => {
          setFocusedBlockIndex(index - 1);
          if (blockRefs.current[index - 1]) {
            const element = blockRefs.current[index - 1];
            element.focus();
            // Position cursor at merge point
            const range = document.createRange();
            const selection = window.getSelection();
            const textNode = element.firstChild || element;
            if (textNode.textContent) {
              range.setStart(textNode, mergePoint);
              range.collapse(true);
              selection.removeAllRanges();
              selection.addRange(range);
            }
          }
        }, 0);
      }
    }
  };

  const handleFocus = (index) => {
    setFocusedBlockIndex(index);
    setIsEditing(prev => ({
      ...prev,
      [index]: true
    }));
    
    // Initialize local content with current block content if not set
    setLocalContent(prev => ({
      ...prev,
      [index]: prev[index] !== undefined ? prev[index] : blocks[index].content
    }));
  };

  const handleBlur = (index) => {
    // Sync local content to block state
    if (localContent[index] !== undefined) {
      const updatedBlocks = [...blocks];
      updatedBlocks[index] = { ...updatedBlocks[index], content: localContent[index] };
      setBlocks(updatedBlocks);
      
      // Save immediately on blur
      immediateSave(updatedBlocks);
    }
    
    // Clear editing state
    setTimeout(() => {
      if (focusedBlockIndex === index) {
        setFocusedBlockIndex(null);
      }
      setIsEditing(prev => ({
        ...prev,
        [index]: false
      }));
    }, 100);
  };

  // Drag and drop handlers
  const handleDragStart = (e, index) => {
    setDraggedBlockIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedBlockIndex !== null && draggedBlockIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (draggedBlockIndex === null || draggedBlockIndex === dropIndex) return;

    const updatedBlocks = [...blocks];
    const draggedBlock = updatedBlocks[draggedBlockIndex];
    
    // Remove dragged block
    updatedBlocks.splice(draggedBlockIndex, 1);
    
    // Insert at new position (adjust index if needed)
    const newIndex = draggedBlockIndex < dropIndex ? dropIndex - 1 : dropIndex;
    updatedBlocks.splice(newIndex, 0, draggedBlock);
    
    setBlocks(updatedBlocks);
    setDraggedBlockIndex(null);
    setDragOverIndex(null);
    
    // Save immediately after reordering
    immediateSave(updatedBlocks);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Add useEffect to sync content to DOM elements
  useEffect(() => {
    blocks.forEach((block, index) => {
      const element = blockRefs.current[index];
      if (element) {
        const currentContent = localContent[index] !== undefined ? localContent[index] : block.content;
        if (element.textContent !== currentContent) {
          element.textContent = currentContent;
        }
      }
    });
  }, [blocks, localContent]);

  return (
    <div className="description-editor live-editor">
      {blocks.map((block, index) => (
        <div 
          key={block.id} 
          className={`description-block live-block ${block.type} ${dragOverIndex === index ? 'drag-over' : ''} ${focusedBlockIndex === index ? 'editing-selecting' : ''}`}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
        >
          <div 
            className="drag-handle"
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
          >
            ⋮⋮
          </div>
          
          {block.type === 'bullet' && (
            <img src={defaultNoteStar} alt="•" className="bullet-icon" />
          )}
          
          <div
            ref={el => blockRefs.current[index] = el}
            className="block-content-editable"
            contentEditable
            suppressContentEditableWarning={true}
            onInput={(e) => handleInput(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onFocus={() => handleFocus(index)}
            onBlur={() => handleBlur(index)}
            data-placeholder={
              (localContent[index] !== undefined ? localContent[index] : block.content) === '' ? 
                (block.type === 'bullet' ? "List item..." : placeholder) : 
                ''
            }
          />
        </div>
      ))}
    </div>
  );
}

                