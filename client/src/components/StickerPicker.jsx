import React from 'react';

const STICKER_PACKS = [
  {
    name: 'Smileys',
    stickers: [
      { id: 's1', emoji: '😊', label: 'Smile' },
      { id: 's2', emoji: '😂', label: 'Laugh' },
      { id: 's3', emoji: '🥹', label: 'Tears' },
      { id: 's4', emoji: '😎', label: 'Cool' },
      { id: 's5', emoji: '🤩', label: 'Star' },
      { id: 's6', emoji: '😍', label: 'Love' },
      { id: 's7', emoji: '🤗', label: 'Hug' },
      { id: 's8', emoji: '😤', label: 'Frustrated' },
      { id: 's9', emoji: '🥳', label: 'Celebrate' },
      { id: 's10', emoji: '🤔', label: 'Thinking' },
      { id: 's11', emoji: '🙄', label: 'Roll eyes' },
      { id: 's12', emoji: '😴', label: 'Sleep' },
    ]
  },
  {
    name: 'Actions',
    stickers: [
      { id: 'a1', emoji: '👋', label: 'Wave' },
      { id: 'a2', emoji: '👍', label: 'Thumbs up' },
      { id: 'a3', emoji: '👎', label: 'Thumbs down' },
      { id: 'a4', emoji: '🙌', label: 'Celebrate' },
      { id: 'a5', emoji: '👏', label: 'Clap' },
      { id: 'a6', emoji: '💪', label: 'Strong' },
      { id: 'a7', emoji: '🤝', label: 'Handshake' },
      { id: 'a8', emoji: '✌️', label: 'Peace' },
    ]
  },
  {
    name: 'Hearts',
    stickers: [
      { id: 'h1', emoji: '❤️', label: 'Heart' },
      { id: 'h2', emoji: '🧡', label: 'Orange Heart' },
      { id: 'h3', emoji: '💛', label: 'Yellow Heart' },
      { id: 'h4', emoji: '💚', label: 'Green Heart' },
      { id: 'h5', emoji: '💙', label: 'Blue Heart' },
      { id: 'h6', emoji: '💜', label: 'Purple Heart' },
      { id: 'h7', emoji: '🖤', label: 'Black Heart' },
      { id: 'h8', emoji: '🤍', label: 'White Heart' },
      { id: 'h9', emoji: '💖', label: 'Sparkling Heart' },
      { id: 'h10', emoji: '💝', label: 'Heart with Ribbon' },
    ]
  },
  {
    name: 'Animals',
    stickers: [
      { id: 'an1', emoji: '🐶', label: 'Dog' },
      { id: 'an2', emoji: '🐱', label: 'Cat' },
      { id: 'an3', emoji: '🐼', label: 'Panda' },
      { id: 'an4', emoji: '🐨', label: 'Koala' },
      { id: 'an5', emoji: '🦊', label: 'Fox' },
      { id: 'an6', emoji: '🐸', label: 'Frog' },
      { id: 'an7', emoji: '🐙', label: 'Octopus' },
      { id: 'an8', emoji: '🦄', label: 'Unicorn' },
    ]
  },
  {
    name: 'Food',
    stickers: [
      { id: 'f1', emoji: '🍕', label: 'Pizza' },
      { id: 'f2', emoji: '🍔', label: 'Burger' },
      { id: 'f3', emoji: '🌮', label: 'Taco' },
      { id: 'f4', emoji: '🍦', label: 'Ice Cream' },
      { id: 'f5', emoji: '🍩', label: 'Donut' },
      { id: 'f6', emoji: '☕', label: 'Coffee' },
      { id: 'f7', emoji: '🍺', label: 'Beer' },
      { id: 'f8', emoji: '🍷', label: 'Wine' },
    ]
  },
];

const StickerPicker = ({ onSelect, theme }) => {
  const [activePack, setActivePack] = React.useState(0);

  return (
    <div className="flex flex-col h-[320px] bg-white dark:bg-[#202C33]">
      <div className="flex gap-1 p-2 border-b border-slate-200 dark:border-white/5 overflow-x-auto no-scrollbar shrink-0">
        {STICKER_PACKS.map((pack, idx) => (
          <button
            key={idx}
            onClick={() => setActivePack(idx)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              activePack === idx
                ? 'bg-blue-500 text-white'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#2A3942]'
            }`}
          >
            {pack.name}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-4 gap-2 no-scrollbar content-start">
        {STICKER_PACKS[activePack].stickers.map((sticker) => (
          <button
            key={sticker.id}
            onClick={() => onSelect(sticker.emoji)}
            title={sticker.label}
            className="aspect-square rounded-xl bg-slate-50 dark:bg-[#2A3942] hover:bg-slate-100 dark:hover:bg-[#3A4A54] border border-slate-200 dark:border-white/5 active:scale-90 transition-all cursor-pointer flex items-center justify-center text-3xl"
          >
            {sticker.emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StickerPicker;
