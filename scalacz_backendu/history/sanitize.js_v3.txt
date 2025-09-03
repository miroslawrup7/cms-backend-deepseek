const sanitizeHtml = require('sanitize-html');

// Tytuły: bez HTML - CAŁKOWICIE BEZ TAGÓW
function sanitizeTitle(text) {
  const s = String(text ?? '');
  return sanitizeHtml(s, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'discard',
  }).trim();
}

// Treść artykułu: bogate formatowanie
const BODY_CFG = {
  allowedTags: [
    'b',
    'i',
    'em',
    'strong',
    'a',
    'p',
    'br',
    'ul',
    'ol',
    'li',
    'blockquote',
    'code',
    'pre',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
  ],
  allowedAttributes: {
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    code: ['class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'data'],
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (tagName, attribs) => ({
      tagName: 'a',
      attribs: {
        ...attribs,
        target: '_blank',
        rel: 'noopener noreferrer nofollow ugc',
      },
    }),
  },
};

function sanitizeBody(html) {
  const s = String(html ?? '');
  return sanitizeHtml(s, BODY_CFG).trim();
}

// Komentarze: MINIMALNE formatowanie + FILTROWANIE NIEBEZPIECZNYCH TAGÓW
function sanitizeComment(str = '') {
  const result = sanitizeHtml(String(str), {
    // DOZWOLONE podstawowe tagi formatujące
    allowedTags: ['b', 'i', 'em', 'strong', 'u', 'br', 'a', 'code', 'pre', 'p'],

    // DOZWOLONE atrybuty (tylko bezpieczne)
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
    },

    // SCHEMATY tylko http/https/mailto
    allowedSchemes: ['http', 'https', 'mailto'],

    // BLOKUJ niebezpieczne tagi
    disallowedTagsMode: 'discard',

    // ZABEZPIECZ linki - BLOKUJ javascript:
    transformTags: {
      a: (tagName, attribs) => {
        // BLOKUJ linki z javascript: i inne niebezpieczne
        if (
          attribs.href &&
          attribs.href.toLowerCase().startsWith('javascript:')
        ) {
          return { tagName: false, text: '' }; // USUŃ CAŁY TAG
        }

        // Bezpieczne linki - dodaj atrybuty zabezpieczające
        return {
          tagName: 'a',
          attribs: {
            ...attribs,
            target: '_blank',
            rel: 'noopener noreferrer nofollow ugc',
          },
        };
      },
    },

    // DODATKOWO: Ręcznie blokuj niebezpieczne atrybuty
    exclusiveFilter: (frame) => {
      if (frame.attribs) {
        // Blokuj atrybuty zdarzeń (onclick, onerror, etc.)
        const dangerousAttrs = Object.keys(frame.attribs).filter(
          (attr) => attr.startsWith('on') && attr.length > 2, // wszystkie on*
        );

        // Blokuj niebezpieczne schematy URL
        const hasDangerousHref =
          frame.attribs.href &&
          frame.attribs.href.toLowerCase().startsWith('javascript:');

        return dangerousAttrs.length > 0 || hasDangerousHref;
      }
      return false;
    },
  }).trim();

  return result;
}

// BARDZO RESTRYKCYJNA SANITYZACJA - dla parametrów, query string, etc.
const STRICT_SANITIZE_CONFIG = {
  allowedTags: [],
  allowedAttributes: {},
  disallowedTagsMode: 'discard',
};

function sanitizeStrict(text) {
  return sanitizeHtml(String(text || ''), STRICT_SANITIZE_CONFIG)
    .trim()
    .substring(0, 500);
}

module.exports = {
  sanitizeTitle,
  sanitizeBody,
  sanitizeComment,
  sanitizeStrict,
};
