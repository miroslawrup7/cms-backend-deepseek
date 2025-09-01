const {
  sanitizeTitle,
  sanitizeBody,
  sanitizeComment,
  sanitizeStrict,
} = require('../../utils/sanitize');

describe('Utils: Sanityzacja danych', () => {
  describe('sanitizeTitle', () => {
    it('Powinien usuwać wszystkie tagi HTML', () => {
      const input = '<script>alert("xss")</script>Tytuł <b>pogrubiony</b>';
      expect(sanitizeTitle(input)).toBe('Tytuł pogrubiony');
    });

    it('Powinien trimować białe znaki', () => {
      const input = '   Tytuł z spacjami   ';
      expect(sanitizeTitle(input)).toBe('Tytuł z spacjami');
    });
  });

  describe('sanitizeStrict', () => {
    it('Powinien usuwać wszystkie tagi HTML', () => {
      const input = '<script>alert("xss")</script>Tekst <b>pogrubiony</b>';
      expect(sanitizeStrict(input)).toBe('Tekst pogrubiony');
    });

    it('Powinien ograniczać długość do 500 znaków', () => {
      const longInput = 'A'.repeat(600);
      expect(sanitizeStrict(longInput).length).toBe(500);
    });

    it('Powinien radzić sobie z null/undefined', () => {
      expect(sanitizeStrict(null)).toBe('');
      expect(sanitizeStrict(undefined)).toBe('');
    });
  });

  describe('sanitizeBody', () => {
    it('Powinien pozwalać na podstawowe tagi formatujące', () => {
      const input =
        '<p>Paragraf</p><b>pogrubienie</b><a href="https://example.com">link</a>';
      const result = sanitizeBody(input);

      expect(result).toContain('<p>');
      expect(result).toContain('<b>');
      expect(result).toContain('<a href="https://example.com"');
      expect(result).not.toContain('<script>');
    });

    it('Powinien dodawać atrybuty bezpieczeństwa do linków', () => {
      const input = '<a href="https://example.com">link</a>';
      const result = sanitizeBody(input);

      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer nofollow ugc"');
    });
  });

  describe('sanitizeComment', () => {
    it('Powinien pozwalać na podstawowe formatowanie w komentarzach', () => {
      const input =
        '<b>pogrubienie</b> <i>kursywa</i> <a href="https://example.com">link</a>';
      const result = sanitizeComment(input);

      expect(result).toContain('<b>pogrubienie</b>');
      expect(result).toContain('<i>kursywa</i>');
      expect(result).toContain('<a href="https://example.com"');
      expect(result).not.toContain('<script>');
    });

    it('Powinien usuwać niebezpieczne tagi z komentarzy', () => {
      const input =
        'Safe <b>bold</b> but <img src="x" onerror="alert(1)"> dangerous <script>alert(2)</script>';
      const result = sanitizeComment(input);

      expect(result).toContain('<b>bold</b>'); // Bezpieczne tagi pozostają
      expect(result).not.toContain('<img'); // Niebezpieczne tagi są usuwane
      expect(result).not.toContain('<script>'); // Niebezpieczne tagi są usuwane
      expect(result).not.toContain('onerror'); // Niebezpieczne atrybuty są usuwane
      expect(result).toBe('Safe <b>bold</b> but  dangerous'); // Tekst pozostaje
    });

    it('Powinien zabezpieczać linki w komentarzach', () => {
      const input = '<a href="https://example.com">link</a>';
      const result = sanitizeComment(input);

      expect(result).toContain('target="_blank"');
      expect(result).toContain('rel="noopener noreferrer nofollow ugc"');
      expect(result).toContain('href="https://example.com"');
    });

    it('Powinien blokować javascript: w linkach', () => {
      const input = '<a href="javascript:alert(1)">malicious link</a>';
      const result = sanitizeComment(input);

      // Link z javascript: powinien być CAŁKOWICIE usunięty
      expect(result).not.toContain('href="javascript:');
      expect(result).not.toContain('malicious link');
      expect(result).toBe(''); // Powinno być puste
    });

    it('Powinien usuwać niebezpieczne atrybuty zdarzeń', () => {
      const input =
        '<span onclick="alert(1)" onmouseover="alert(2)">text</span>';
      const result = sanitizeComment(input);

      // Niebezpieczne atrybuty powinny być usunięte
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onmouseover');
      expect(result).toBe('text'); // Tekst powinien pozostać
    });
  });
});
