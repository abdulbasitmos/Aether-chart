const fs = require('fs');
const path = 'C:\\\\Users\\\\USER\\\\Desktop\\\\bashab\\\\bashab\\\\src\\\\components\\\\ChatWindow.jsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add states
const stateInsertion = `  const [pickerTab, setPickerTab] = useState('emoji'); // 'emoji' | 'gif' | 'sticker'
  
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
`;
code = code.replace("  const [pickerTab, setPickerTab] = useState('emoji'); // 'emoji' | 'gif' | 'sticker'", stateInsertion);

// 2. Add handleDrag... and addAttachment logic
const fileHelpers = `  const imageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const addAttachment = (file) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    let type = 'document';
    if (isImage) type = 'image';
    if (isVideo) type = 'video';

    const previewUrl = (isImage || isVideo) ? URL.createObjectURL(file) : null;
    
    setAttachments(prev => [...prev, {
      id: Date.now() + Math.random().toString(),
      file,
      previewUrl,
      type,
      name: file.name,
      size: file.size
    }]);
  };

  const removeAttachment = (id) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    // Only set dragging to false if we are leaving the main window, not children
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(addAttachment);
    }
  };

  const handlePaste = (e) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      Array.from(e.clipboardData.files).forEach(addAttachment);
    }
  };

  const handleImageSelect = (e) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(addAttachment);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(addAttachment);
    }
  };`;

const oldHandlersPattern = /  const imageInputRef = useRef\(null\);\n  const fileInputRef = useRef\(null\);\n\n  const handleImageSelect.*?  \};\n\n  const handleFileSelect.*?\n  \};\n/s;
code = code.replace(oldHandlersPattern, fileHelpers + "\n");

// 3. Rewrite handleSend
const oldSendPattern = /  const handleSend = \(e\) => \{.*?  \};\n/s;
const newSend = `  const handleSend = (e) => {
    e?.preventDefault();
    if (!inputText.trim() && attachments.length === 0) return;

    const payload = {};
    if (replyingToMsg) {
      payload.replyTo = {
        id: replyingToMsg.id,
        text: replyingToMsg.text,
        senderName: replyingToMsg.senderId === 'user_me' ? 'You' : target.name
      };
    }

    if (attachments.length > 0) {
      attachments.forEach(att => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target.result;
          const sizeStr = att.file.size > 1024 * 1024 
            ? (att.file.size / (1024 * 1024)).toFixed(1) + ' MB' 
            : (att.file.size / 1024).toFixed(0) + ' KB';
          
          sendMessage(att.file.name, att.type, {
            fileName: att.file.name,
            fileSize: sizeStr,
            mediaUrl: base64Data
          });
        };
        reader.readAsDataURL(att.file);
      });
      setAttachments([]);
    }

    if (inputText.trim()) {
      if (editingMsg) {
        editMessage(editingMsg.id, inputText);
        setEditingMsg(null);
      } else {
        sendMessage(inputText, 'text', payload);
      }
    }

    setInputText('');
    setReplyingToMsg(null);
    setShowEmojiPicker(false);
  };
`;
code = code.replace(oldSendPattern, newSend);

// 4. Attach Drag and Drop handlers to the main wrapper
const mainWrapperPattern = '<div className="flex-1 h-full flex flex-col bg-slate-950 relative overflow-hidden"';
const newMainWrapper = `<div 
      className="flex-1 h-full flex flex-col bg-slate-950 relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}`;
code = code.replace(mainWrapperPattern, newMainWrapper);

// 5. Add overlay for drag & drop
const overlayHtml = `
      {/* Drag & Drop Overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm border-2 border-dashed border-emerald-500 rounded-3xl m-4 flex flex-col items-center justify-center text-emerald-400 pointer-events-none"
          >
            <FiPaperclip size={48} className="mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold font-display">Drop files to attach</h2>
          </motion.div>
        )}
      </AnimatePresence>
`;
code = code.replace('onDrop={handleDrop}\n    >', 'onDrop={handleDrop}\n    >' + overlayHtml);

// 6. Add onPaste to the text input
const inputPattern = /placeholder="Message.*?"\n\s*className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"/m;
const newInput = `placeholder="Message..."
                  className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none"
                  onPaste={handlePaste}`;
code = code.replace(inputPattern, newInput);

// 7. Add attachments preview ribbon above the input form
const formPattern = '<form onSubmit={handleSend} className="flex gap-2 items-center">';
const previewRibbon = `
          <div className="flex flex-col gap-2 w-full">
            {/* Attachment Preview Ribbon */}
            {attachments.length > 0 && (
              <div className="flex gap-2 overflow-x-auto p-2 bg-slate-900/50 rounded-xl border border-white/5 no-scrollbar">
                {attachments.map(att => (
                  <div key={att.id} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-slate-800 flex items-center justify-center group">
                    {att.previewUrl ? (
                      <img src={att.previewUrl} alt={att.name} className="w-full h-full object-cover" />
                    ) : (
                      <FiFileText size={20} className="text-slate-400" />
                    )}
                    <button 
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                    >
                      <FiX size={12} />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-white truncate px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-center z-10">
                      {att.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleSend} className="flex gap-2 items-center w-full">
`;
code = code.replace(formPattern, previewRibbon);

const formEndPattern = '</form>\n        )}';
const newFormEnd = '</form>\n          </div>\n        )}';
code = code.replace(formEndPattern, newFormEnd);

// 8. Add \`multiple\` to hidden file inputs
code = code.replace('accept="image/*" \n          className="hidden" \n        />', 'accept="image/*" \n          className="hidden"\n          multiple\n        />');
code = code.replace('accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt" \n          className="hidden" \n        />', 'accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt" \n          className="hidden"\n          multiple\n        />');

fs.writeFileSync(path, code, 'utf8');
console.log("Updated ChatWindow.jsx successfully.");
