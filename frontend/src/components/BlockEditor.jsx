// Version 10 - Fixed all text editor issues with proper dark mode support

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { 
  Bold, Italic, Code, List, ListOrdered, Quote, 
  Heading1, Heading2, Heading3, Minus, 
  CheckSquare, Image as ImageIcon, Paperclip, Strikethrough
} from 'lucide-react';

const BlockEditor = ({ value, onChange, isDarkMode }) => {
  const [showToolbar, setShowToolbar] = useState(true); // Always show toolbar
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const toolbarRef = useRef(null);

  // Memoize editor configuration to prevent unnecessary recreations
  const editorConfig = useMemo(() => ({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: isDarkMode ? 'text-white' : 'text-gray-900',
          }
        },
        paragraph: {
          HTMLAttributes: {
            class: `paragraph ${isDarkMode ? 'text-white' : 'text-gray-900'}`,
          },
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'bullet-list',
          },
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'ordered-list',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'list-item',
          },
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image resizable-image',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return `Heading ${node.attrs.level}`;
          }
          return "Start typing... Use toolbar for formatting";
        },
        showOnlyWhenEditable: true,
        includeChildren: true,
      }),
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class: `prose prose-lg max-w-none focus:outline-none min-h-[400px] px-6 py-4 editor-content ${
          isDarkMode ? 'dark-mode prose-invert' : 'light-mode'
        }`,
      },
      handlePaste: (view, event, slice) => {
        // Handle image paste from clipboard
        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find(item => item.type.startsWith('image/'));
        
        if (imageItem) {
          event.preventDefault();
          const file = imageItem.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              view.dispatch(
                view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.image.create({ 
                    src: e.target.result,
                    alt: 'Pasted image',
                    title: 'Click to resize'
                  })
                )
              );
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        // Handle image drop
        const files = Array.from(event.dataTransfer?.files || []);
        const imageFile = files.find(file => file.type.startsWith('image/'));
        
        if (imageFile) {
          event.preventDefault();
          const reader = new FileReader();
          reader.onload = (e) => {
            const { state } = view;
            const { tr } = state;
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (pos) {
              tr.insert(pos.pos, state.schema.nodes.image.create({ 
                src: e.target.result,
                alt: 'Dropped image',
                title: 'Click to resize'
              }));
              view.dispatch(tr);
            }
          };
          reader.readAsDataURL(imageFile);
          return true;
        }
        return false;
      },
      handleClick: (view, pos, event) => {
        // Find the node at the clicked position
        const $pos = view.state.doc.resolve(pos);
        let node = null;
        let nodePos = pos;
        
        // Check if we clicked directly on an image
        if (event.target && event.target.tagName === 'IMG') {
          // Find the image node in the document
          view.state.doc.descendants((n, p) => {
            if (n.type.name === 'image' && n.attrs.src === event.target.src) {
              node = n;
              nodePos = p;
              return false; // Stop searching
            }
          });
          
          if (node) {
            setSelectedImage({ node, pos: nodePos, element: event.target });
            return true;
          }
        }
        
        // Clear selection if clicked elsewhere
        setSelectedImage(null);
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  }), [value, onChange, isDarkMode]);

  const editor = useEditor(editorConfig);

  // Handle image resizing
  const resizeImage = useCallback((width) => {
    if (selectedImage && editor) {
      const { pos } = selectedImage;
      
      // Get the current node at the position
      const node = editor.state.doc.nodeAt(pos);
      if (node && node.type.name === 'image') {
        // Create new attributes with the width style
        const attrs = { 
          ...node.attrs, 
          style: `width: ${width}px; height: auto; max-width: 100%;`,
          width: width.toString()
        };
        
        // Create a transaction to update the node
        const tr = editor.state.tr.setNodeMarkup(pos, null, attrs);
        editor.view.dispatch(tr);
        
        // Clear selection after resize
        setSelectedImage(null);
      }
    }
  }, [selectedImage, editor]);

  const addImage = useCallback((e) => {
    e.preventDefault();
    const url = window.prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ 
        src: url, 
        alt: 'External image',
        title: 'Click to resize'
      }).run();
    }
  }, [editor]);

  const addAttachment = useCallback((e) => {
    e.preventDefault();
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file && editor) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          editor.chain().focus().setImage({ 
            src: e.target.result,
            alt: file.name,
            title: 'Click to resize'
          }).run();
        };
        reader.readAsDataURL(file);
      }
    }
    // Reset input
    event.target.value = '';
  }, [editor]);

  if (!editor) {
    return (
      <div className={`animate-pulse ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        Loading editor...
      </div>
    );
  }

  const ToolbarButton = ({ onClick, isActive, children, title }) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent focus loss
        onClick();
      }}
      title={title}
      type="button"
      className={`p-2 rounded-lg transition-all duration-200 ${
        isActive 
          ? (isDarkMode 
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'bg-blue-500 text-white shadow-lg'
            )
          : (isDarkMode 
              ? 'text-gray-300 hover:text-white hover:bg-gray-700' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            )
      }`}
    >
      {children}
    </button>
  );

  return (
    <div 
      ref={editorRef}
      className={`block-editor relative ${isDarkMode ? 'dark' : 'light'}`}
    >
      {/* Floating Toolbar */}
      <div className={`sticky top-0 z-10 p-4 border-b backdrop-blur-sm transition-all duration-300 ${
        isDarkMode 
          ? 'bg-gray-800/90 border-gray-600/30' 
          : 'bg-white/90 border-gray-200/30'
      }`} ref={toolbarRef}>
        <div className="flex flex-wrap items-center gap-1">
          {/* Text Formatting */}
          <div className="flex items-center space-x-1 mr-4">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold (Ctrl+B)"
            >
              <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic (Ctrl+I)"
            >
              <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              title="Strikethrough"
            >
              <Strikethrough size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              title="Inline Code"
            >
              <Code size={16} />
            </ToolbarButton>
          </div>

          {/* Headings */}
          <div className="flex items-center space-x-1 mr-4">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              title="Heading 1"
            >
              <Heading1 size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              title="Heading 2"
            >
              <Heading2 size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              title="Heading 3"
            >
              <Heading3 size={16} />
            </ToolbarButton>
          </div>

          {/* Lists */}
          <div className="flex items-center space-x-1 mr-4">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              title="Bullet List"
            >
              <List size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              title="Numbered List"
            >
              <ListOrdered size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              isActive={editor.isActive('taskList')}
              title="Task List"
            >
              <CheckSquare size={16} />
            </ToolbarButton>
          </div>

          {/* Other Elements */}
          <div className="flex items-center space-x-1">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              title="Quote"
            >
              <Quote size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              isActive={editor.isActive('codeBlock')}
              title="Code Block"
            >
              <Code size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal Rule"
            >
              <Minus size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={addImage}
              title="Add Image URL"
            >
              <ImageIcon size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={addAttachment}
              title="Upload Image"
            >
              <Paperclip size={16} />
            </ToolbarButton>
          </div>
        </div>
      </div>

      {/* Image Resize Controls */}
      {selectedImage && (
        <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 p-4 rounded-xl border shadow-xl ${
          isDarkMode 
            ? 'bg-gray-800/95 border-gray-700/50 text-white' 
            : 'bg-white/95 border-gray-200/50 text-gray-900'
        }`}>
          <div className="flex items-center space-x-3">
            <span className="text-sm font-medium">Resize Image:</span>
            <button onClick={() => resizeImage(200)} className="px-2 py-1 text-xs bg-blue-500 text-white rounded">Small</button>
            <button onClick={() => resizeImage(400)} className="px-2 py-1 text-xs bg-blue-500 text-white rounded">Medium</button>
            <button onClick={() => resizeImage(600)} className="px-2 py-1 text-xs bg-blue-500 text-white rounded">Large</button>
            <button onClick={() => resizeImage(800)} className="px-2 py-1 text-xs bg-blue-500 text-white rounded">XL</button>
            <button onClick={() => setSelectedImage(null)} className="px-2 py-1 text-xs bg-gray-500 text-white rounded">Close</button>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Editor Content */}
      <div className="editor-wrapper">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default BlockEditor;