import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Node, mergeAttributes } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { 
  Type, Bold, Italic, Code, Link, ListOrdered, List, Quote, 
  Heading1, Heading2, Heading3, Image as ImageIcon, Minus, 
  CheckSquare, File, Trash2, Plus, GripVertical, ChevronRight,
  Clock, User, Calendar, Hash
} from 'lucide-react';

// Block metadata extension to track last edited time
const BlockMetadata = Extension.create({
  name: 'blockMetadata',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'bulletList', 'orderedList', 'blockquote', 'codeBlock', 'taskList'],
        attributes: {
          lastEdited: {
            default: new Date().toISOString(),
            parseHTML: element => element.getAttribute('data-last-edited'),
            renderHTML: attributes => {
              return {
                'data-last-edited': attributes.lastEdited || new Date().toISOString(),
              };
            },
          },
          blockId: {
            default: () => `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            parseHTML: element => element.getAttribute('data-block-id'),
            renderHTML: attributes => {
              return {
                'data-block-id': attributes.blockId,
              };
            },
          },
          author: {
            default: null,
            parseHTML: element => element.getAttribute('data-author'),
            renderHTML: attributes => {
              if (!attributes.author) return {};
              return {
                'data-author': attributes.author,
              };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('updateBlockMetadata'),
        appendTransaction: (transactions, oldState, newState) => {
          const docChanged = transactions.some(tr => tr.docChanged);
          if (!docChanged) return null;

          const tr = newState.tr;
          let modified = false;

          transactions.forEach(transaction => {
            if (!transaction.docChanged) return;

            transaction.steps.forEach(step => {
              step.getMap().forEach((oldStart, oldEnd, newStart, newEnd) => {
                const $pos = newState.doc.resolve(newStart);
                const node = $pos.parent;
                
                if (node && node.type.spec.group?.includes('block')) {
                  tr.setNodeMarkup($pos.before($pos.depth), null, {
                    ...node.attrs,
                    lastEdited: new Date().toISOString(),
                  });
                  modified = true;
                }
              });
            });
          });

          return modified ? tr : null;
        },
      }),
    ];
  },
});

// Custom Block Node for wrapping content
const BlockNode = Node.create({
  name: 'block',
  group: 'block',
  content: 'block+',
  draggable: true,
  
  parseHTML() {
    return [{ tag: 'div[data-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-block': true }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockWrapper);
  },
});

// Block Wrapper Component
const BlockWrapper = ({ node, getPos, editor, deleteNode }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const menuRef = useRef(null);

  const handleDelete = () => {
    deleteNode();
  };

  const handleAddBlock = () => {
    const pos = getPos() + node.nodeSize;
    editor.chain()
      .focus()
      .insertContentAt(pos, { type: 'paragraph' })
      .focus(pos + 1)
      .run();
  };

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    
    const pos = getPos();
    const $pos = editor.state.doc.resolve(pos);
    const selection = editor.state.tr.setSelection(
      editor.state.selection.constructor.create(editor.state.doc, $pos.pos, $pos.pos + node.nodeSize)
    );
    editor.view.dispatch(selection);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div 
      className={`block-wrapper group relative ${isDragging ? 'opacity-50' : ''}`}
      data-block-id={node.attrs?.blockId}
    >
      {/* Drag Handle */}
      <div
        className="drag-handle absolute -left-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-move p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        contentEditable={false}
      >
        <GripVertical size={16} className="text-gray-400" />
      </div>

      {/* Add Button */}
      <button
        className="add-button absolute -left-16 top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={handleAddBlock}
        contentEditable={false}
      >
        <Plus size={16} className="text-gray-400" />
      </button>

      {/* Content */}
      <div className="block-content">
        {/* NodeViewContent renders the actual content */}
      </div>
    </div>
  );
};

// Slash Command Menu
const SlashCommandMenu = ({ editor, items, command }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prevIndex) => 
          prevIndex > 0 ? prevIndex - 1 : items.length - 1
        );
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prevIndex) => 
          prevIndex < items.length - 1 ? prevIndex + 1 : 0
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = items[selectedIndex];
        if (item) {
          command(item);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, command]);

  return (
    <div className="slash-menu absolute z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 w-64 max-h-80 overflow-y-auto">
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => command(item)}
          className={`w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
            index === selectedIndex ? 'bg-gray-100 dark:bg-gray-700' : ''
          }`}
        >
          <span className="text-gray-400">{item.icon}</span>
          <div>
            <div className="font-medium text-sm">{item.title}</div>
            <div className="text-xs text-gray-500">{item.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
};

// Slash Commands Extension
const SlashCommands = Extension.create({
  name: 'slashCommands',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: true,
        command: ({ editor, range, props }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      // This would integrate with @tiptap/suggestion
      // For simplicity, we'll handle it in the main component
    ];
  },
});

// Block Editor Component
const BlockEditor = ({ value, onChange, isDarkMode, selectedTask, updateTask }) => {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });
  const [slashMenuSearch, setSlashMenuSearch] = useState('');
  const editorRef = useRef(null);

  const slashCommands = [
    { 
      title: 'Heading 1', 
      description: 'Big section heading', 
      icon: <Heading1 size={18} />,
      command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run()
    },
    { 
      title: 'Heading 2', 
      description: 'Medium section heading', 
      icon: <Heading2 size={18} />,
      command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run()
    },
    { 
      title: 'Heading 3', 
      description: 'Small section heading', 
      icon: <Heading3 size={18} />,
      command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run()
    },
    { 
      title: 'Text', 
      description: 'Plain text paragraph', 
      icon: <Type size={18} />,
      command: (editor) => editor.chain().focus().setParagraph().run()
    },
    { 
      title: 'Bullet List', 
      description: 'Create a simple list', 
      icon: <List size={18} />,
      command: (editor) => editor.chain().focus().toggleBulletList().run()
    },
    { 
      title: 'Numbered List', 
      description: 'Create a numbered list', 
      icon: <ListOrdered size={18} />,
      command: (editor) => editor.chain().focus().toggleOrderedList().run()
    },
    { 
      title: 'Task List', 
      description: 'Track tasks with checkboxes', 
      icon: <CheckSquare size={18} />,
      command: (editor) => editor.chain().focus().toggleTaskList().run()
    },
    { 
      title: 'Quote', 
      description: 'Capture a quote', 
      icon: <Quote size={18} />,
      command: (editor) => editor.chain().focus().toggleBlockquote().run()
    },
    { 
      title: 'Code Block', 
      description: 'Display code with syntax highlighting', 
      icon: <Code size={18} />,
      command: (editor) => editor.chain().focus().toggleCodeBlock().run()
    },
    { 
      title: 'Divider', 
      description: 'Visually divide sections', 
      icon: <Minus size={18} />,
      command: (editor) => editor.chain().focus().setHorizontalRule().run()
    },
  ];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        document: false,
        dropcursor: {
          color: '#3b82f6',
          width: 3,
        },
      }),
      Document.extend({
        content: 'block+',
      }),
      BlockMetadata,
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
          return "Type '/' for commands...";
        },
        showOnlyWhenEditable: true,
        includeChildren: true,
      }),
      SlashCommands,
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class: `prose prose-lg max-w-none focus:outline-none min-h-[400px] px-8 py-6 ${
          isDarkMode ? 'prose-invert' : ''
        }`,
      },
      handleKeyDown: (view, event) => {
        // Handle slash command
        if (event.key === '/') {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;
          
          // Check if at start of line or after space
          const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
          if (textBefore === '' || textBefore.endsWith(' ')) {
            setTimeout(() => {
              const coords = view.coordsAtPos(selection.from);
              setSlashMenuPosition({ 
                x: coords.left, 
                y: coords.bottom + 5 
              });
              setShowSlashMenu(true);
              setSlashMenuSearch('');
            }, 0);
          }
        } else if (event.key === 'Escape' && showSlashMenu) {
          setShowSlashMenu(false);
          return true;
        }
      },
    },
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      onChange(json);
      
      // Update metadata for reporting
      const blocks = [];
      const extractBlocks = (content) => {
        if (Array.isArray(content)) {
          content.forEach(item => {
            if (item.type && item.attrs) {
              blocks.push({
                type: item.type,
                ...item.attrs,
                content: item.content,
              });
            }
            if (item.content) {
              extractBlocks(item.content);
            }
          });
        }
      };
      
      extractBlocks(json.content);
      
      // Store metadata for reporting
      if (selectedTask && updateTask) {
        updateTask({
          ...selectedTask,
          blockMetadata: blocks,
        });
      }
    },
  });

  const executeSlashCommand = (item) => {
    if (editor) {
      // Remove the slash
      editor.chain().focus().deleteRange({
        from: editor.state.selection.from - 1,
        to: editor.state.selection.from,
      }).run();
      
      // Execute command
      item.command(editor);
      setShowSlashMenu(false);
    }
  };

  // Filter slash commands based on search
  const filteredCommands = slashCommands.filter(cmd =>
    cmd.title.toLowerCase().includes(slashMenuSearch.toLowerCase()) ||
    cmd.description.toLowerCase().includes(slashMenuSearch.toLowerCase())
  );

  // Handle input changes to update slash search
  useEffect(() => {
    if (!editor || !showSlashMenu) return;

    const handleTransaction = () => {
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;
      
      // Get text after slash
      const text = $from.parent.textContent.slice(0, $from.parentOffset);
      const slashIndex = text.lastIndexOf('/');
      
      if (slashIndex !== -1) {
        const searchText = text.slice(slashIndex + 1);
        setSlashMenuSearch(searchText);
        
        // Hide menu if no slash found
        if (searchText.includes(' ')) {
          setShowSlashMenu(false);
        }
      } else {
        setShowSlashMenu(false);
      }
    };

    editor.on('transaction', handleTransaction);
    return () => editor.off('transaction', handleTransaction);
  }, [editor, showSlashMenu]);

  // Handle paste for images
  useEffect(() => {
    const handlePaste = async (e) => {
      if (!editor) return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          
          // Convert to base64
          const reader = new FileReader();
          reader.onload = (event) => {
            editor.chain().focus().setImage({ 
              src: event.target.result 
            }).run();
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div 
      ref={editorRef}
      className={`block-editor relative ${isDarkMode ? 'dark' : ''}`}
    >
      <EditorContent editor={editor} />
      
      {/* Slash Command Menu */}
      {showSlashMenu && (
        <div
          style={{
            position: 'fixed',
            left: slashMenuPosition.x,
            top: slashMenuPosition.y,
            zIndex: 1000,
          }}
        >
          <SlashCommandMenu
            editor={editor}
            items={filteredCommands}
            command={executeSlashCommand}
          />
        </div>
      )}
    </div>
  );
};

export default BlockEditor;