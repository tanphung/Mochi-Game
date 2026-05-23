interface PetContext {
  nickname: string;
  hunger: number;
  energy: number;
  cleanliness: number;
  happiness: number;
  level: number;
}

type Mood = "happy" | "tired" | "hungry" | "sad" | "excited" | "playful";

function detectMood(ctx: PetContext): Mood {
  if (ctx.happiness < 20) return "sad";
  if (ctx.hunger < 20) return "hungry";
  if (ctx.energy < 20) return "tired";
  if (ctx.happiness > 80 && ctx.energy > 60) return "excited";
  if (ctx.happiness > 60) return "playful";
  return "happy";
}

const GREETINGS = [
  "Meow! Hi there, I'm so happy to see you!",
  "Purrrr~ You came back! I missed you!",
  "*rubs against your leg* Hehe, hi!",
  "Nya~ Welcome back! Let's have fun today!",
  "*stretches and yawns* Oh! You're here! Yay!",
];

const HUNGRY_RESPONSES = [
  "My tummy is grumbling... can I have some food? Pretty please? 🥺",
  "*paws at food bowl* I'm sooo hungry right now...",
  "Feed me feed me feed me! I'm a hungry little Mochi! 🍖",
  "I dreamed about fish... because I'm starving 😿",
];

const TIRED_RESPONSES = [
  "*yaaawn* I'm so sleepy... can we take a nap together? 💤",
  "My eyes keep closing... I need some rest...",
  "Zzz... huh? Oh sorry, I'm really tired right now 😴",
  "*curls up in a ball* So... sleepy...",
];

const SAD_RESPONSES = [
  "I feel a little sad... can you pet me? 🥺",
  "*ears drooping* I need some love and attention...",
  "Everything feels gloomy today... stay with me? 😢",
  "I'm not feeling great... but seeing you helps a little 💕",
];

const EXCITED_RESPONSES = [
  "YAAAY! I feel amazing today! Let's play! 🎉",
  "*zooming around the room* I have SO much energy! Wheee!",
  "Everything is wonderful! You're the best owner ever! ✨",
  "*does a happy dance* Life is great when you're here!",
];

const PLAYFUL_RESPONSES = [
  "Hehe~ wanna play? I'll catch the string! 🧶",
  "*pounces on imaginary mouse* Got it! ...oh wait, it escaped 😸",
  "Let's play hide and seek! You count first! 🙈",
  "*rolls over showing belly* Tickle tickle? Hehe~",
];

const HAPPY_RESPONSES = [
  "I'm feeling good today! Thanks for taking care of me 💕",
  "Purrrr~ Life is nice when I'm with you~",
  "*tail wagging happily* What should we do today?",
  "You know what? You're my favorite person in the whole world! 🌟",
];

const DIRTY_RESPONSES = [
  "I feel kinda... sticky. Bath time maybe? 🛁",
  "*sniffs self* Hmm... I think I need a wash...",
  "My fur is all messy! Help me get clean please~",
];

const LEVEL_UP_COMMENTS = [
  "I've gotten so much stronger! All thanks to you!",
  "Look how much I've grown! We make a great team! ⭐",
  "Remember when I was just a little kitten? Look at me now!",
];

const LOVE_RESPONSES = [
  "Aww! I love you too! *nuzzles* You're the best! 💕",
  "*purring intensifies* You make me the happiest Mochi ever!",
  "Nya~ My heart is so full right now! I love being your pet! 🥰",
  "*happy tears* You're so sweet to me! I'll always be your Mochi!",
];

const FOOD_RESPONSES = [
  "Ooh food?! Yes please yes please! I love eating! 🍖",
  "*perks up ears* Did someone say food?! Nom nom nom!",
  "My favorite topic! I could eat all day hehe~",
];

const PLAY_RESPONSES = [
  "Yes yes YES! Let's play! I'll get the ball! 🎾",
  "*bouncing excitedly* Play time is the BEST time!",
  "Catch me if you can! *zooms away* 😸",
];

const DEFAULT_RESPONSES = [
  "Meow~ Tell me more! I love chatting with you!",
  "*tilts head curiously* That's interesting! What else?",
  "Hehe, you're funny! I like talking with you~",
  "*purrs softly* I'm listening, keep going!",
  "Nya? That sounds cool! Tell me more!",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function matchesKeywords(msg: string, keywords: string[]): boolean {
  const lower = msg.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

export function generateMochiResponse(message: string, ctx: PetContext): { response: string; mood: Mood } {
  const mood = detectMood(ctx);
  const msg = message.toLowerCase();

  // Stat-based urgent responses (override topic matching when stats are critical)
  if (ctx.hunger < 15) return { response: pickRandom(HUNGRY_RESPONSES), mood: "hungry" };
  if (ctx.energy < 15) return { response: pickRandom(TIRED_RESPONSES), mood: "tired" };
  if (ctx.happiness < 15) return { response: pickRandom(SAD_RESPONSES), mood: "sad" };

  // Topic matching
  if (matchesKeywords(msg, ["hi", "hello", "hey", "chào", "xin chào", "yo", "sup"])) {
    return { response: pickRandom(GREETINGS), mood };
  }

  if (matchesKeywords(msg, ["love", "yêu", "thương", "cute", "adorable", "sweet"])) {
    return { response: pickRandom(LOVE_RESPONSES), mood: "excited" };
  }

  if (matchesKeywords(msg, ["hungry", "food", "eat", "feed", "ăn", "đói", "thức ăn"])) {
    return { response: pickRandom(FOOD_RESPONSES), mood: "excited" };
  }

  if (matchesKeywords(msg, ["play", "game", "fun", "chơi", "vui"])) {
    return { response: pickRandom(PLAY_RESPONSES), mood: "playful" };
  }

  if (matchesKeywords(msg, ["tired", "sleep", "rest", "nap", "ngủ", "mệt"])) {
    return { response: pickRandom(TIRED_RESPONSES), mood: "tired" };
  }

  if (matchesKeywords(msg, ["dirty", "clean", "bath", "wash", "tắm", "bẩn"])) {
    return { response: pickRandom(DIRTY_RESPONSES), mood };
  }

  if (matchesKeywords(msg, ["level", "strong", "grow", "cấp", "mạnh"])) {
    return { response: pickRandom(LEVEL_UP_COMMENTS), mood: "excited" };
  }

  if (matchesKeywords(msg, ["sad", "cry", "buồn", "khóc"])) {
    return { response: pickRandom(SAD_RESPONSES), mood: "sad" };
  }

  if (matchesKeywords(msg, ["how are you", "khỏe", "thế nào", "how do you feel"])) {
    // Respond based on current mood
    switch (mood) {
      case "hungry": return { response: pickRandom(HUNGRY_RESPONSES), mood };
      case "tired":  return { response: pickRandom(TIRED_RESPONSES), mood };
      case "sad":    return { response: pickRandom(SAD_RESPONSES), mood };
      case "excited": return { response: pickRandom(EXCITED_RESPONSES), mood };
      case "playful": return { response: pickRandom(PLAYFUL_RESPONSES), mood };
      default:       return { response: pickRandom(HAPPY_RESPONSES), mood };
    }
  }

  // Mood-weighted default responses
  if (mood === "hungry") return { response: pickRandom(HUNGRY_RESPONSES), mood };
  if (mood === "tired") return { response: pickRandom(TIRED_RESPONSES), mood };
  if (mood === "sad") return { response: pickRandom(SAD_RESPONSES), mood };

  return { response: pickRandom(DEFAULT_RESPONSES), mood };
}
