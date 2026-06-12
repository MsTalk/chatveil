(function (root, factory) {
  const api = factory();

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.WhatsAppBlurMorseCode = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const MORSE_TABLE = Object.freeze({
    A: ".-",
    B: "-...",
    C: "-.-.",
    D: "-..",
    E: ".",
    F: "..-.",
    G: "--.",
    H: "....",
    I: "..",
    J: ".---",
    K: "-.-",
    L: ".-..",
    M: "--",
    N: "-.",
    O: "---",
    P: ".--.",
    Q: "--.-",
    R: ".-.",
    S: "...",
    T: "-",
    U: "..-",
    V: "...-",
    W: ".--",
    X: "-..-",
    Y: "-.--",
    Z: "--..",
    "0": "-----",
    "1": ".----",
    "2": "..---",
    "3": "...--",
    "4": "....-",
    "5": ".....",
    "6": "-....",
    "7": "--...",
    "8": "---..",
    "9": "----."
  });

  function textToMorse(text) {
    if (!text || typeof text !== "string") {
      return "";
    }

    return Array.from(text.normalize("NFKD").toUpperCase())
      .reduce(function (characters, character) {
        if (MORSE_TABLE[character]) {
          characters.push(character);
          return characters;
        }

        if (/[\s\p{M}\p{P}\p{S}]/u.test(character)) {
          return characters;
        }

        return characters.concat(
          character.codePointAt(0).toString(16).toUpperCase().split("")
        );
      }, [])
      .map(function (character) {
        return MORSE_TABLE[character] || "";
      })
      .filter(function (code) {
        return code.length > 0;
      })
      .join(" ");
  }

  return {
    MORSE_TABLE,
    textToMorse
  };
});
