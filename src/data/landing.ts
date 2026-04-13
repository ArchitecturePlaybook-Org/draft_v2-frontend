export interface Message {
  text: string;
  sender: "Architect" | "Vision" | "Process" | "Reality" | "Site Team" | "Solution" | "Outcome";
  type: "user" | "ai";
}

export interface Chapter {
  id: string;
  number: string;
  title: string;
  messages: Message[];
}

export const CHAPTERS: Chapter[] = [
  {
    id: "chapter1",
    number: "Chapter ONE",
    title: "The Birth of Vision",
    messages: [
      { text: "You see a space before the world sees a wall.", sender: "Architect", type: "user" },
      { text: "A line. A whisper of a future.", sender: "Vision", type: "ai" },
      { text: "Geometry becomes feeling. Feeling becomes form. Form becomes a promise.", sender: "Architect", type: "user" },
      { text: "You hold the intent like fire in your hands. Pure. Sharp. Alive.", sender: "Vision", type: "ai" },
      { text: "A vision waiting to breathe.", sender: "Architect", type: "user" },
    ],
  },
  {
    id: "chapter2",
    number: "Chapter TWO",
    title: "The Translation",
    messages: [
      { text: "CAD grids. Layers. Symbols. Dimensions.", sender: "Architect", type: "user" },
      { text: "You turn soul into drawings, emotions into elevations, logic into sections.", sender: "Process", type: "ai" },
      { text: "Your heart becomes hatches. Your clarity becomes notation. Your dream becomes documentation.", sender: "Architect", type: "user" },
      { text: "Because that's how the industry listens. You hope it hears.", sender: "Process", type: "ai" },
    ],
  },
  {
    id: "chapter3",
    number: "Chapter THREE",
    title: "The Drop",
    messages: [
      { text: "A journey begins — and the meaning falls.", sender: "Architect", type: "user" },
      { text: "Contractors squint. Workers guess. Engineers assume. Clients imagine their own worlds.", sender: "Reality", type: "ai" },
      { text: "\"What did you mean?\" \"Is this centered?\" \"Where does this beam go?\"", sender: "Site Team", type: "user" },
      { text: "Intent cracks. Clarity leaks. Reality bends.", sender: "Reality", type: "ai" },
      { text: "On site, your lines become questions. Misunderstandings. Phone calls. Red pens. Dust-covered doubts.", sender: "Architect", type: "user" },
      { text: "The drawing was precise. The understanding was not.", sender: "Reality", type: "ai" },
      { text: "Between your screen and concrete something slipped. The intent fell.", sender: "Architect", type: "user" },
    ],
  },
  {
    id: "chapter4",
    number: "Chapter FOUR",
    title: "The Burden",
    messages: [
      { text: "You return to fix what should never break.", sender: "Architect", type: "user" },
      { text: "Another site visit. Another layer of markup. Another late night redrawing what you already solved.", sender: "Process", type: "ai" },
      { text: "You thought your job was designing. Turns out it's explaining.", sender: "Architect", type: "user" },
      { text: "Over. And over. And over.", sender: "Process", type: "ai" },
      { text: "You don't lack detail. They lack translation.", sender: "Architect", type: "user" },
      { text: "Your vision deserves to survive transit. Your ideas deserve to arrive intact.", sender: "Process", type: "ai" },
      { text: "You wonder — is this the price of architecture? Or the flaw of its tools?", sender: "Architect", type: "user" },
    ],
  },
  {
    id: "chapter5",
    number: "Chapter FIVE",
    title: "The Bridge",
    messages: [
      { text: "The shift. The Architecture Playbook.", sender: "Architect", type: "user" },
      { text: "Not another drafting app. Not another viewer. A DIGITAL TWIN OF INTENT.", sender: "Solution", type: "ai" },
      { text: "Drawings that explain. Models that teach. Details that speak. 3D that guides hands, not just minds.", sender: "Architect", type: "user" },
      { text: "Sequences that say \"build it like this.\" No guessing. No calling. No losing meaning in dust.", sender: "Solution", type: "ai" },
      { text: "You design once. The world understands every time. Your intent stays alive.", sender: "Architect", type: "user" },
    ],
  },
  {
    id: "chapter6",
    number: "Chapter SIX",
    title: "The Architect Returned",
    messages: [
      { text: "Clarity rises. Control returns.", sender: "Architect", type: "user" },
      { text: "Now you lead. Now they understand. Now the design marches into reality without dying on the journey.", sender: "Outcome", type: "ai" },
      { text: "No more explaining. No more hoping they \"get it.\"", sender: "Architect", type: "user" },
      { text: "Architecture wasn't meant to be defended. It was meant to be delivered.", sender: "Outcome", type: "ai" },
      { text: "Your vision now survives construction. Your role becomes creation again. Your time returns. Your value increases.", sender: "Architect", type: "user" },
      { text: "Your voice carries to the site, to the hands, to the wall that stands just as you imagined.", sender: "Outcome", type: "ai" },
      { text: "You do not chase understanding. You command it!", sender: "Architect", type: "user" },
    ],
  },
];
