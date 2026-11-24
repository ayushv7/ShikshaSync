export type Lang = "en" | "kn" | "hi";

export type Subject = "math" | "reading";

export type Student = {
  id: string;
  name: string;
  grade: number;
  initialMastery: Record<Subject, number>;
};

export type Question = {
  id: string;
  subject: Subject;
  grade: number;
  level: 1 | 2 | 3;
  prompt: Record<Lang, string>;
  options: Record<Lang, string[]>;
  answerIdx: number;
  hint: Record<Lang, string>;
};

export const langs: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "kn", label: "Kannada" },
  { code: "hi", label: "Hindi" },
];

export const students: Student[] = [
  { id: "aarav", name: "Aarav", grade: 3, initialMastery: { math: 0.4, reading: 0.35 } },
  { id: "kavya", name: "Kavya", grade: 4, initialMastery: { math: 0.55, reading: 0.45 } },
  { id: "rohan", name: "Rohan", grade: 5, initialMastery: { math: 0.65, reading: 0.7 } },
  { id: "meera", name: "Meera", grade: 3, initialMastery: { math: 0.3, reading: 0.5 } },
];

export const questions: Question[] = [
  {
    id: "m1",
    subject: "math",
    grade: 3,
    level: 1,
    prompt: {
      en: "What is 14 + 9?",
      kn: "14 + 9 ಎಷ್ಟು?",
      hi: "14 + 9 कितना होता है?",
    },
    options: {
      en: ["21", "23", "24", "25"],
      kn: ["21", "23", "24", "25"],
      hi: ["21", "23", "24", "25"],
    },
    answerIdx: 1,
    hint: {
      en: "Add 14 and 6 to make 20, then add 3 more.",
      kn: "14 ಕ್ಕೆ 6 ಸೇರಿಸಿದರೆ 20 ಆಗುತ್ತದೆ, ನಂತರ ಇನ್ನೂ 3 ಸೇರಿಸಿ.",
      hi: "14 में 6 जोड़कर 20 बनाएं, फिर 3 और जोड़ें।",
    },
  },
  {
    id: "m2",
    subject: "math",
    grade: 3,
    level: 2,
    prompt: {
      en: "A basket has 4 rows of 6 mangoes. How many mangoes in total?",
      kn: "ಒಂದು ಬುಟ್ಟಿಯಲ್ಲಿ 4 ಸಾಲುಗಳಲ್ಲಿ ತಲಾ 6 ಮಾವಿನ ಹಣ್ಣುಗಳಿವೆ. ಒಟ್ಟು ಎಷ್ಟು ಹಣ್ಣುಗಳಿವೆ?",
      hi: "एक टोकरी में 6 आमों की 4 कतारें हैं। कुल कितने आम हैं?",
    },
    options: {
      en: ["18", "20", "24", "28"],
      kn: ["18", "20", "24", "28"],
      hi: ["18", "20", "24", "28"],
    },
    answerIdx: 2,
    hint: {
      en: "Multiply 4 by 6, or add 6 four times.",
      kn: "4 ಅನ್ನು 6 ರಿಂದ ಗುಣಿಸಿ, ಅಥವಾ 6 ಅನ್ನು ನಾಲ್ಕು ಬಾರಿ ಕೂಡಿ.",
      hi: "4 को 6 से गुणा करें, या 6 को चार बार जोड़ें।",
    },
  },
  {
    id: "m3",
    subject: "math",
    grade: 4,
    level: 2,
    prompt: {
      en: "Which fraction is equal to one half?",
      kn: "ಈ ಕೆಳಗಿನವುಗಳಲ್ಲಿ ಅರ್ಧಕ್ಕೆ ಸಮಾನವಾದ ಭಿನ್ನರಾಶಿ ಯಾವುದು?",
      hi: "इनमें से कौन सा भिन्न आधे के बराबर है?",
    },
    options: {
      en: ["1/3", "2/4", "3/4", "2/5"],
      kn: ["1/3", "2/4", "3/4", "2/5"],
      hi: ["1/3", "2/4", "3/4", "2/5"],
    },
    answerIdx: 1,
    hint: {
      en: "Look for the fraction where the top number is half of the bottom number.",
      kn: "ಮೇಲಿನ ಸಂಖ್ಯೆಯು ಕೆಳಗಿನ ಸಂಖ್ಯೆಯ ಅರ್ಧದಷ್ಟಿರುವ ಭಿನ್ನರಾಶಿಯನ್ನು ಹುಡುಕಿ.",
      hi: "वह भिन्न चुनें जिसमें ऊपर की संख्या नीचे की संख्या की आधी हो।",
    },
  },
  {
    id: "m4",
    subject: "math",
    grade: 5,
    level: 3,
    prompt: {
      en: "A bus travels 45 km in 1 hour. How far does it go in 3 hours?",
      kn: "ಒಂದು ಬಸ್ 1 ಗಂಟೆಯಲ್ಲಿ 45 ಕಿ.ಮೀ. ಚಲಿಸುತ್ತದೆ. 3 ಗಂಟೆಗಳಲ್ಲಿ ಎಷ್ಟು ದೂರ ಚಲಿಸುತ್ತದೆ?",
      hi: "एक बस 1 घंटे में 45 किमी चलती है। 3 घंटे में वह कितनी दूर जाएगी?",
    },
    options: {
      en: ["120 km", "135 km", "145 km", "150 km"],
      kn: ["120 ಕಿ.ಮೀ.", "135 ಕಿ.ಮೀ.", "145 ಕಿ.ಮೀ.", "150 ಕಿ.ಮೀ."],
      hi: ["120 किमी", "135 किमी", "145 किमी", "150 किमी"],
    },
    answerIdx: 1,
    hint: {
      en: "Multiply 45 by 3: 40 times 3 is 120, plus 5 times 3.",
      kn: "45 ಅನ್ನು 3 ರಿಂದ ಗುಣಿಸಿ: 40 ಗುಣಿಸು 3 ಎಂದರೆ 120, ಜೊತೆಗೆ 5 ಗುಣಿಸು 3.",
      hi: "45 को 3 से गुणा करें: 40 गुणा 3 बराबर 120, और 5 गुणा 3 जोड़ें।",
    },
  },
  {
    id: "r1",
    subject: "reading",
    grade: 3,
    level: 1,
    prompt: {
      en: "Rani watered the neem sapling every morning. Why did she water it?",
      kn: "ರಾಣಿ ಪ್ರತಿದಿನ ಬೆಳಿಗ್ಗೆ ಬೇವಿನ ಸಸಿಗೆ ನೀರು ಹಾಕುತ್ತಿದ್ದಳು. ಅವಳು ಏಕೆ ನೀರು ಹಾಕುತ್ತಿದ್ದಳು?",
      hi: "रानी हर सुबह नीम के पौधे को पानी देती थी। वह पानी क्यों देती थी?",
    },
    options: {
      en: ["To help it grow", "To wash the road", "To fill a bucket", "To hide stones"],
      kn: ["ಅದು ಬೆಳೆಯಲು ಸಹಾಯ ಮಾಡಲು", "ರಸ್ತೆಯನ್ನು ತೊಳೆಯಲು", "ಬಕೆಟ್ ತುಂಬಲು", "ಕಲ್ಲುಗಳನ್ನು ಮುಚ್ಚಲು"],
      hi: ["पौधे को बढ़ने में मदद करने के लिए", "सड़क धोने के लिए", "बाल्टी भरने के लिए", "पत्थर छिपाने के लिए"],
    },
    answerIdx: 0,
    hint: {
      en: "Think about what young plants need each day to grow strong.",
      kn: "ಸಣ್ಣ ಸಸಿಗಳು ಬಲವಾಗಿ ಬೆಳೆಯಲು ಪ್ರತಿದಿನ ಏನು ಬೇಕು ಎಂದು ಯೋಚಿಸಿ.",
      hi: "सोचें कि छोटे पौधे को रोज मजबूत बढ़ने के लिए क्या चाहिए।",
    },
  },
  {
    id: "r2",
    subject: "reading",
    grade: 4,
    level: 2,
    prompt: {
      en: "Choose the word that means the opposite of 'bright'.",
      kn: "'ಬೆಳಕು' ಪದದ ವಿರುದ್ಧಾರ್ಥಕ ಪದವನ್ನು ಆರಿಸಿ.",
      hi: "'उजाला' शब्द का विलोम शब्द चुनें।",
    },
    options: {
      en: ["shiny", "dark", "loud", "warm"],
      kn: ["ಪ್ರಕಾಶ", "ಕತ್ತಲು", "ಶಬ್ದ", "ಬಿಸಿ"],
      hi: ["चमक", "अंधेरा", "शोर", "गर्म"],
    },
    answerIdx: 1,
    hint: {
      en: "Think of the sky at midnight without stars or moon.",
      kn: "ನಕ್ಷತ್ರ ಮತ್ತು ಚಂದ್ರನಿಲ್ಲದ ಮಧ್ಯರಾತ್ರಿಯ ಆಕಾಶವನ್ನು ನೆನಪಿಸಿಕೊಳ್ಳಿ.",
      hi: "बिना चांद और तारों वाली आधी रात के आसमान के बारे में सोचें।",
    },
  },
  {
    id: "r3",
    subject: "reading",
    grade: 4,
    level: 2,
    prompt: {
      en: "The farmers waited for monsoon clouds before sowing seeds. What does 'sowing' mean?",
      kn: "ರೈತರು ಬೀಜ ಬಿತ್ತುವ ಮೊದಲು ಮುಂಗಾರು ಮೋಡಗಳಿಗಾಗಿ ಕಾದರು. 'ಬಿತ್ತುವುದು' ಎಂದರೇನು?",
      hi: "किसानों ने बीज बोने से पहले मानसून के बादलों का इंतजार किया। 'बोने' का क्या अर्थ है?",
    },
    options: {
      en: ["Harvesting crops", "Planting seeds", "Selling grain", "Storing water"],
      kn: ["ಬೆಳೆ ಕಟಾವು ಮಾಡುವುದು", "ಬೀಜಗಳನ್ನು ನೆಡುವುದು", "ಧಾನ್ಯ ಮಾರುವುದು", "ನೀರು ಸಂಗ್ರಹಿಸುವುದು"],
      hi: ["फसल काटना", "बीज लगाना", "अनाज बेचना", "पानी जमा करना"],
    },
    answerIdx: 1,
    hint: {
      en: "Farmers do this in wet soil at the start of the rainy season.",
      kn: "ಮಳೆಗಾಲದ ಆರಂಭದಲ್ಲಿ ರೈತರು ಒದ್ದೆ ಮಣ್ಣಿನಲ್ಲಿ ಇದನ್ನು ಮಾಡುತ್ತಾರೆ.",
      hi: "बरसात की शुरुआत में किसान गीली मिट्टी में यही काम करते हैं।",
    },
  },
  {
    id: "r4",
    subject: "reading",
    grade: 5,
    level: 3,
    prompt: {
      en: "Solar lamps let children study after sunset without smoke. What is the main benefit?",
      kn: "ಸೌರ ದೀಪಗಳು ಸೂರ್ಯಾಸ್ತದ ನಂತರ ಹೊಗೆಯಿಲ್ಲದೆ ಮಕ್ಕಳಿಗೆ ಓದಲು ನೆರವಾಗುತ್ತವೆ. ಇದರ ಮುಖ್ಯ ಪ್ರಯೋಜನವೇನು?",
      hi: "सोलर लैंप बच्चों को सूरज ढलने के बाद बिना धुएं के पढ़ने देते हैं। इसका मुख्य लाभ क्या है?",
    },
    options: {
      en: ["Clean light at night", "Louder bells", "Heavier books", "Faster buses"],
      kn: ["ರಾತ್ರಿ ಸ್ವಚ್ಛ ಬೆಳಕು", "ಜೋರಾದ ಗಂಟೆಗಳು", "ಭಾರವಾದ ಪುಸ್ತಕಗಳು", "ವೇಗದ ಬಸ್ಸುಗಳು"],
      hi: ["रात में साफ रोशनी", "तेज घंटियां", "भारी किताबें", "तेज बसें"],
    },
    answerIdx: 0,
    hint: {
      en: "Look at what the sentence highlights: studying after sunset and no smoke.",
      kn: "ವಾಕ್ಯದಲ್ಲಿರುವ ಎರಡು ಅಂಶಗಳನ್ನು ನೋಡಿ: ಸೂರ್ಯಾಸ್ತದ ನಂತರ ಓದುವುದು ಮತ್ತು ಹೊಗೆಯಿಲ್ಲದಿರುವುದು.",
      hi: "वाक्य की दो मुख्य बातों पर ध्यान दें: सूरज ढलने के बाद पढ़ाई और बिना धुएं के।",
    },
  },
];
