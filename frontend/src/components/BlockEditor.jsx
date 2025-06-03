// Version 8 - Rich text editor with toolbar and proper text visibility

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { 
  Bold, Italic, Code, List, ListOrdered, Quote, 
  Heading1, Heading2, Heading3, Minus, 
  CheckSquare, Image as ImageIcon,
  Underline, Strikethrough
} from 'lucide-react';

const BlockEditor = ({ value, onChange, isDarkMode }) => {
  const [showToolbar, setShowToolbar] = useState(false);
  const editorRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === 'heading') {
            return `Heading ${node.attrs.level}`;
          }
          return "Start typing... Use '/' for quick commands";
        },
        showOnlyWhenEditable: true,
        includeChildren: true,
      }),
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class: `prose prose-lg max-w-none focus:outline-none min-h-[400px] px-6 py-4 ${
          isDarkMode 
            ? 'prose-invert text-white caret-white' 
            : 'prose-gray text-gray-900 caret-gray-900'
        }`,
        style: isDarkMode 
          ? 'color: #fff; caret-color: #fff;' 
          : 'color: #1f2937; caret-color: #1f2937;'
      },
      handleKeyDown: (view, event) => {
        // Show toolbar on focus
        if (!showToolbar) {
          setShowToolbar(true);
        }

        // Handle slash commands
        if (event.key === '/') {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;
          
          const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
          if (textBefore === '' || textBefore.endsWith(' ')) {
            // Could implement slash command menu here
            return false;
          }
        }
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus: () => {
      setShowToolbar(true);
    },
    onBlur: () => {
      // Keep toolbar visible for a short time
      setTimeout(() => {
        if (editorRef.current && !editorRef.current.contains(document.activeElement)) {
          setShowToolbar(false);
        }
      }, 200);
    },
  });

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
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
      onClick={onClick}
      title={title}
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
      className={`block-editor relative ${isDarkMode ? 'dark' : ''}`}
    >
      {/* Floating Toolbar */}
      {showToolbar && (
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
                title="Add Image"
              >
                <ImageIcon size={16} />
              </ToolbarButton>
            </div>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className={`editor-content ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
        <EditorContent 
          editor={editor} 
          style={{
            color: isDarkMode ? '#ffffff' : '#1f2937',
            caretColor: isDarkMode ? '#ffffff' : '#1f2937'
          }}
        />
      </div>

      {/* Quick Help */}
      {!showToolbar && (
        <div className={`absolute bottom-4 right-4 text-xs px-3 py-2 rounded-lg ${
          isDarkMode 
            ? 'bg-gray-700/80 text-gray-400' 
            : 'bg-gray-100/80 text-gray-600'
        }`}>
          Click to start editing
        </div>
      )}

      <style jsx>{`
        .editor-content .ProseMirror {
          outline: none;
        }
        
        .dark-mode .ProseMirror {
          color: #ffffff !important;
          caret-color: #ffffff !important;
        }
        
        .light-mode .ProseMirror {
          color: #1f2937 !important;
          caret-color: #1f2937 !important;
        }
        
        .dark-mode .ProseMirror h1,
        .dark-mode .ProseMirror h2,
        .dark-mode .ProseMirror h3,
        .dark-mode .ProseMirror h4,
        .dark-mode .ProseMirror h5,
        .dark-mode .ProseMirror h6 {
          color: #ffffff !important;
        }
        
        .light-mode .ProseMirror h1,
        .light-mode .ProseMirror h2,
        .light-mode .ProseMirror h3,
        .light-mode .ProseMirror h4,
        .light-mode .ProseMirror h5,
        .light-mode .ProseMirror h6 {
          color: #1f2937 !important;
        }
        
        .dark-mode .ProseMirror p,
        .dark-mode .ProseMirror li,
        .dark-mode .ProseMirror blockquote {
          color: #e5e7eb !important;
        }
        
        .light-mode .ProseMirror p,
        .light-mode .ProseMirror li,
        .light-mode .ProseMirror blockquote {
          color: #374151 !important;
        }
        
        .dark-mode .ProseMirror code {
          background: rgba(139, 92, 246, 0.2) !important;
          color: #a78bfa !important;
          border: 1px solid rgba(139, 92, 246, 0.3);
        }
        
        .light-mode .ProseMirror code {
          background: rgba(139, 92, 246, 0.1) !important;
          color: #7c3aed !important;
          border: 1px solid rgba(139, 92, 246, 0.2);
        }
        
        .dark-mode .ProseMirror pre {
          background: #1a1a1a !important;
          color: #10b981 !important;
          border-left: 4px solid #10b981;
        }
        
        .light-mode .ProseMirror pre {
          background: #f3f4f6 !important;
          color: #059669 !important;
          border-left: 4px solid #059669;
        }
        
        .dark-mode .ProseMirror blockquote {
          border-left: 4px solid #3b82f6;
          background: rgba(59, 130, 246, 0.1) !important;
          color: #e5e7eb !important;
        }
        
        .light-mode .ProseMirror blockquote {
          border-left: 4px solid #3b82f6;
          background: rgba(59, 130, 246, 0.05) !important;
          color: #374151 !important;
        }
        
        .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div > p {
          text-decoration: line-through;
          opacity: 0.6;
        }
        
        .ProseMirror ul[data-type="taskList"] li > label {
          margin-right: 0.5rem;
        }
        
        .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          border-radius: 0.25rem;
          border: 2px solid #d1d5db;
          margin: 0;
        }
        
        .dark-mode .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
          border-color: #6b7280;
          background: transparent;
        }
        
        .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:checked {
          background: #3b82f6;
          border-color: #3b82f6;
        }
      `}</style>
    </div>
  );
};

export default BlockEditor;