// Shared message search & filtering helpers.
// Used by ChatWindow (inline search), InfoPanel (search + media tabs),
// Sidebar (conversation search) and ProfileView (media analytics) so the
// filtering logic lives in exactly one place.
import { useState, useEffect } from 'react';

// URL detection for the "Links" filter. Matches http(s):// links and bare
// www./domain-style links so pasted URLs are caught either way.
export const LINK_REGEX = /(https?:\/\/[^\s]+)|(\bwww\.[^\s]+)|(\b[a-z0-9-]+\.(com|net|org|io|dev|ai|co|app|gg|me|xyz)\b[^\s]*)/i;

export const hasLink = (text) => !!text && LINK_REGEX.test(text);

// Categorize a message for filter chips.
// Returns one of: 'media' | 'doc' | 'audio' | 'link' | 'text'
export const messageCategory = (msg) => {
  if (!msg) return 'text';
  const type = msg.type || 'text';
  if (type === 'image' || type === 'video' || type === 'gif' || type === 'sticker') return 'media';
  if (type === 'document') return 'doc';
  if (type === 'audio') return 'audio';
  if (type === 'text' && hasLink(msg.text)) return 'link';
  return 'text';
};

// Case-insensitive substring match over a message's text and filename.
export const matchesQuery = (msg, query) => {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    (!!msg.text && msg.text.toLowerCase().includes(q)) ||
    (!!msg.fileName && msg.fileName.toLowerCase().includes(q)) ||
    (!!msg.caption && msg.caption.toLowerCase().includes(q))
  );
};

// Resolve a message's sender id across the several shapes used in this app
// (populated object, raw id, or the local "user_me" sentinel).
export const senderIdOf = (msg) =>
  (msg.senderId && (msg.senderId._id || msg.senderId.id)) || msg.senderId || null;

// Composed predicate: filter a message list by query + category + starred + sender.
// category: 'all' | 'text' | 'media' | 'doc' | 'link' | 'audio'
export const filterMessages = (messages = [], { query = '', category = 'all', starred = false, senderId = null } = {}) => {
  return messages.filter((m) => {
    if (m.isDateDivider) return false;
    if (!matchesQuery(m, query)) return false;
    if (starred && !(m.starred || (Array.isArray(m.starredBy) && m.starredBy.length > 0))) return false;
    if (senderId && senderIdOf(m) !== senderId) return false;
    if (category && category !== 'all') {
      if (category === 'media') {
        if (messageCategory(m) !== 'media') return false;
      } else if (messageCategory(m) !== category) {
        return false;
      }
    }
    return true;
  });
};

// The canonical filter-chip set for in-chat search UIs.
export const SEARCH_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'text', label: 'Text' },
  { id: 'media', label: 'Media' },
  { id: 'doc', label: 'Docs' },
  { id: 'link', label: 'Links' },
];

// Debounce a rapidly-changing value (e.g. a search input) by `ms` milliseconds.
export const useDebounced = (value, ms = 300) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return debounced;
};
