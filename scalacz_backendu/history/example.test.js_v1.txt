// __tests__/example.test.js

// describe() grupuje powiązane ze sobą testy
describe('Podstawowy test sprawdzający konfigurację Jesta', () => {
  // test() lub it() definiuje pojedynczy test
  test('Powinien poprawnie dodawać dwie liczby', () => {
    // arrange (przygotuj) - tutaj to jest proste
    const a = 2;
    const b = 2;
    // act (działaj) - wywołaj testowaną funkcję
    const result = a + b;
    // assert (potwierdź) - sprawdź, czy wynik jest oczekiwany
    expect(result).toBe(4);
  });
});