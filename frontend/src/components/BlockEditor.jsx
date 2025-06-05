// Version 13 - Complete BlockEditor with all fixes

import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlock from '@tiptap/extension-code-block';
import { Node } from '@tiptap/core';
import { 
  Bold, Italic, Code, List, ListOrdered, Quote, 
  Heading1, Heading2, Heading3, Minus, 
  CheckSquare, Image as ImageIcon, Paperclip, Strikethrough,
  Maximize2, Minimize2, Settings, FileText, Download,
  FileImage, FileVideo, FileAudio, File
} from 'lucide-react';

// Custom File Attachment Extension - Fixed ProseMirror Error
const FileAttachment = Node.create({
  name: 'fileAttachment',
  
  group: 'block',
  
  atom: true,
  
  addAttributes() {
    return {
      src: {
        default: null,
      },
      fileName: {
        default: null,
      },
      fileSize: {
        default: null,
      },
      fileType: {
        default: null,
      },
    }
  },
  
  parseHTML() {
    return [
      {
        tag: 'div[data-type="file-attachment"]',
      },
    ]
  },
  
  renderHTML({ HTMLAttributes, node }) {
    // FIXED: Remove the "0" content for atom nodes
    return [
      'div', 
      { 
        'data-type': 'file-attachment',
        'data-file-name': node.attrs.fileName,
        'data-file-size': node.attrs.fileSize,
        'data-file-type': node.attrs.fileType,
        'data-src': node.attrs.src,
        class: 'file-attachment',
        ...HTMLAttributes 
      }
      // No content array for atom nodes
    ]
  },
  
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'file-attachment';
      
      const icon = document.createElement('span');
      icon.className = 'file-attachment-icon';
      icon.innerHTML = getFileIcon(node.attrs.fileType);
      
      const details = document.createElement('div');
      details.className = 'file-attachment-details';
      
      const name = document.createElement('div');
      name.className = 'file-attachment-name';
      name.textContent = node.attrs.fileName || 'Unknown file';
      
      const size = document.createElement('div');
      size.className = 'file-attachment-size';
      size.textContent = formatFileSize(node.attrs.fileSize);
      
      const downloadIcon = document.createElement('span');
      downloadIcon.innerHTML = '↓';
      downloadIcon.style.marginLeft = 'auto';
      downloadIcon.style.opacity = '0.7';
      
      details.appendChild(name);
      details.appendChild(size);
      
      dom.appendChild(icon);
      dom.appendChild(details);
      dom.appendChild(downloadIcon);
      
      // Add click handler for download
      dom.addEventListener('click', (e) => {
        e.preventDefault();
        if (node.attrs.src) {
          const link = document.createElement('a');
          link.href = node.attrs.src;
          link.download = node.attrs.fileName || 'download';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      });
      
      return {
        dom,
      }
    }
  },
});

// Helper functions for file handling
const getFileIcon = (fileType) => {
  if (!fileType) return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>';
  
  if (fileType.startsWith('image/')) {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z" /></svg>';
  }
  
  if (fileType.startsWith('video/')) {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z" /></svg>';
  }
  
  if (fileType.startsWith('audio/')) {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z" /></svg>';
  }
  
  return '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" /></svg>';
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

const BlockEditor = ({ value, onChange, isDarkMode }) => {
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [contentWidth, setContentWidth] = useState(70); // percentage
  const [showWidthControl, setShowWidthControl] = useState(false);
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);

  // CRITICAL FIX: Force editor to update classes when isDarkMode changes
  const editorConfig = useMemo(() => ({
    extensions: [
      StarterKit.configure({
        // Disable default code block since we're using our own
        codeBlock: false,
        // Configure lists properly
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'tiptap-bullet-list',
          },
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'tiptap-ordered-list',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'tiptap-list-item',
          },
        },
        // Configure headings with proper attributes
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: 'tiptap-heading',
          }
        },
        // Configure paragraph
        paragraph: {
          HTMLAttributes: {
            class: 'tiptap-paragraph',
          },
        },
        // Configure blockquote
        blockquote: {
          HTMLAttributes: {
            class: 'tiptap-blockquote',
          },
        },
        // Configure code
        code: {
          HTMLAttributes: {
            class: 'tiptap-code',
          },
        },
      }),
      
      // Custom code block extension
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'tiptap-code-block',
        },
        exitOnTripleEnter: false,
        exitOnArrowDown: false,
      }),

      // Image extension with base64 support
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'tiptap-image',
        },
      }),

      // File attachment extension - RESTORED
      FileAttachment,

      // Task list extensions with proper configuration
      TaskList.configure({
        HTMLAttributes: {
          class: 'tiptap-task-list',
        },
      }),
      
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'tiptap-task-item',
        },
      }),

      // Placeholder extension
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return `Heading ${node.attrs.level}`;
          }
          if (node.type.name === 'codeBlock') {
            return 'Enter your code here...';
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
        // CRITICAL: This class must update when isDarkMode changes
        class: `tiptap-editor-content focus:outline-none ${
          isDarkMode ? 'dark-mode' : 'light-mode'
        }`,
        // Force style attribute for immediate effect
        style: `color: ${isDarkMode ? '#ffffff' : '#111827'};`
      },
      
      // Handle image paste from clipboard
      handlePaste: (view, event, slice) => {
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
                    style: 'width: 50%; height: auto;'
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
      
      // Handle file drop
      handleDrop: (view, event, slice, moved) => {
        const files = Array.from(event.dataTransfer?.files || []);
        
        if (files.length > 0) {
          event.preventDefault();
          
          files.forEach(file => {
            if (file.type.startsWith('image/')) {
              // Handle images
              const reader = new FileReader();
              reader.onload = (e) => {
                const { state } = view;
                const { tr } = state;
                const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
                if (pos) {
                  tr.insert(pos.pos, state.schema.nodes.image.create({ 
                    src: e.target.result,
                    alt: file.name,
                    style: 'width: 50%; height: auto;'
                  }));
                  view.dispatch(tr);
                }
              };
              reader.readAsDataURL(file);
            } else {
              // Handle other files as attachments using custom extension
              const reader = new FileReader();
              reader.onload = (e) => {
                try {
                  const { state } = view;
                  const { tr } = state;
                  const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
                  if (pos) {
                    tr.insert(pos.pos, state.schema.nodes.fileAttachment.create({
                      src: e.target.result,
                      fileName: file.name,
                      fileSize: file.size,
                      fileType: file.type
                    }));
                    view.dispatch(tr);
                  }
                } catch (error) {
                  console.error('Error adding dropped file:', error);
                }
              };
              reader.readAsDataURL(file);
            }
          });
          return true;
        }
        return false;
      },
      
      // Handle image click for resizing
      handleClick: (view, pos, event) => {
        if (event.target && event.target.tagName === 'IMG') {
          // Find the image node in the document
          view.state.doc.descendants((node, nodePos) => {
            if (node.type.name === 'image' && node.attrs.src === event.target.src) {
              setSelectedImage({ 
                node, 
                pos: nodePos, 
                element: event.target,
                currentWidth: getCurrentImageWidth(event.target)
              });
              return false; // Stop searching
            }
          });
          return true;
        }
        
        // Clear selection if clicked elsewhere
        setSelectedImage(null);
        return false;
      },
    },
    
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    
    // CRITICAL: Force editor to recognize isDarkMode changes
    key: `editor-${isDarkMode ? 'dark' : 'light'}`,
    
  }), [value, onChange, isDarkMode]); // CRITICAL: isDarkMode in dependencies

  const editor = useEditor(editorConfig);

  // CRITICAL FIX: Force editor DOM to update classes when isDarkMode changes
  useEffect(() => {
    if (editor && editor.view && editor.view.dom) {
      const editorElement = editor.view.dom;
      
      // Remove all theme classes
      editorElement.classList.remove('dark-mode', 'light-mode');
      
      // Add correct class
      const modeClass = isDarkMode ? 'dark-mode' : 'light-mode';
      editorElement.classList.add(modeClass);
      
      // Force immediate style application
      editorElement.style.color = isDarkMode ? '#ffffff' : '#111827';
      
      console.log('🔄 Updated editor class to:', modeClass);
      console.log('📝 Editor classes now:', editorElement.className);
    }
  }, [editor, isDarkMode]);

  // ADDITIONAL FIX: Watch for editor creation and apply classes immediately
  useEffect(() => {
    if (editor && editor.view && editor.view.dom) {
      const editorElement = editor.view.dom;
      
      // Force immediate class application
      const targetClass = isDarkMode ? 'dark-mode' : 'light-mode';
      editorElement.className = `tiptap-editor-content focus:outline-none ${targetClass}`;
      
      // Force immediate style application
      editorElement.style.color = isDarkMode ? '#ffffff' : '#111827';
      
      console.log('✅ Editor created with classes:', editorElement.className);
      console.log('✅ Editor color:', editorElement.style.color);
    }
  }, [editor]);

  // Get current image width as percentage
  const getCurrentImageWidth = (imageElement) => {
    const style = imageElement.style.width;
    if (style && style.includes('%')) {
      return parseInt(style);
    }
    // Calculate percentage based on container width
    const containerWidth = imageElement.parentElement?.offsetWidth || 800;
    const imageWidth = imageElement.offsetWidth;
    return Math.round((imageWidth / containerWidth) * 100);
  };

  // Handle image resizing with percentage
  const resizeImage = useCallback((percentage) => {
    if (selectedImage && editor) {
      const { pos } = selectedImage;
      
      // Get the current node at the position
      const node = editor.state.doc.nodeAt(pos);
      if (node && node.type.name === 'image') {
        // Create new attributes with the width style
        const attrs = { 
          ...node.attrs, 
          style: `width: ${percentage}%; height: auto; max-width: 100%;`
        };
        
        // Create a transaction to update the node
        const tr = editor.state.tr.setNodeMarkup(pos, null, attrs);
        editor.view.dispatch(tr);
        
        // Clear selection after resize
        setSelectedImage(null);
      }
    }
  }, [selectedImage, editor]);

  // Add image from URL
  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ 
        src: url, 
        alt: 'External image',
        style: 'width: 50%; height: auto;'
      }).run();
    }
  }, [editor]);

  // Handle image file upload
  const handleImageSelect = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file && editor) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          editor.chain().focus().setImage({ 
            src: e.target.result,
            alt: file.name,
            style: 'width: 50%; height: auto;'
          }).run();
        };
        reader.readAsDataURL(file);
      }
    }
    // Reset input
    event.target.value = '';
  }, [editor]);

  // Handle any file upload as attachment
  const handleFileSelect = useCallback((event) => {
    const file = event.target.files?.[0];
    if (file && editor) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          if (file.type.startsWith('image/')) {
            // Add as image if it's an image file
            editor.chain().focus().setImage({ 
              src: e.target.result,
              alt: file.name,
              style: 'width: 50%; height: auto;'
            }).run();
          } else {
            // Add as file attachment using the custom extension
            editor.chain().focus().insertContent({
              type: 'fileAttachment',
              attrs: {
                src: e.target.result,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type
              }
            }).run();
          }
        } catch (error) {
          console.error('Error adding file:', error);
          // Fallback: Add as simple text link
          const fileName = file.name || 'Attached file';
          const fileLink = `<p><strong>📎 ${fileName}</strong> (${formatFileSize(file.size)})</p>`;
          editor.chain().focus().insertContent(fileLink).run();
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    event.target.value = '';
  }, [editor]);

  // Button handlers
  const addImageFile = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const addAttachment = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

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
      className={`tiptap-block-editor relative ${isDarkMode ? 'dark dark-mode' : 'light light-mode'}`}
    >
      {/* Floating Toolbar */}
      <div className={`sticky top-0 z-10 p-4 border-b backdrop-blur-sm transition-all duration-300 ${
        isDarkMode 
          ? 'bg-gray-800/90 border-gray-600/30' 
          : 'bg-white/90 border-gray-200/30'
      }`}>
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
          <div className="flex items-center space-x-1 mr-4">
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
              onClick={addImageFile}
              title="Upload Image"
            >
              <FileImage size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={addAttachment}
              title="Attach File"
            >
              <Paperclip size={16} />
            </ToolbarButton>
          </div>

          {/* Layout Controls */}
          <div className="flex items-center space-x-1 ml-auto">
            <ToolbarButton
              onClick={() => setShowWidthControl(!showWidthControl)}
              title="Content Width Settings"
            >
              <Settings size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => setIsFullWidth(!isFullWidth)}
              title={isFullWidth ? "Standard Width" : "Full Width"}
            >
              {isFullWidth ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </ToolbarButton>
          </div>
        </div>

        {/* Width Control */}
        {showWidthControl && (
          <div className={`mt-4 p-4 rounded-lg border ${
            isDarkMode 
              ? 'bg-gray-700/50 border-gray-600/50' 
              : 'bg-gray-50/50 border-gray-200/50'
          }`}>
            <div className="flex items-center space-x-4">
              <label className={`text-sm font-medium ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Content Width:
              </label>
              <input
                type="range"
                min="40"
                max="100"
                step="5"
                value={contentWidth}
                onChange={(e) => setContentWidth(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className={`text-sm font-mono ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {contentWidth}%
              </span>
            </div>
          </div>
        )}
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
            <button onClick={() => resizeImage(25)} className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">25%</button>
            <button onClick={() => resizeImage(50)} className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">50%</button>
            <button onClick={() => resizeImage(75)} className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">75%</button>
            <button onClick={() => resizeImage(100)} className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">100%</button>
            <button onClick={() => setSelectedImage(null)} className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600">Close</button>
          </div>
          <div className="text-xs text-center mt-2 opacity-75">
            Current: {selectedImage.currentWidth}%
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
      
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Editor Content Container with explicit theme classes */}
      <div className={`editor-container ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
        <div 
          className={`editor-content-wrapper ${isDarkMode ? 'dark-mode' : 'light-mode'}`}
          style={{
            maxWidth: isFullWidth ? '100%' : `${contentWidth}%`,
            margin: '0 auto',
            transition: 'max-width 0.3s ease'
          }}
        >
          <EditorContent 
            editor={editor} 
            className={isDarkMode ? 'dark-mode' : 'light-mode'}
          />
        </div>
      </div>
    </div>
  );
};

export default BlockEditor;