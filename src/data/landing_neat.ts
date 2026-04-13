export interface Message {
  text: string;
  sender: string;
  type: "user" | "ai";
}

export interface Step {
  id: string;
  number: string;
  title: string;
  tagline: string;
  messages: Message[];
}

export const STEPS: Step[] = [
  {
    id: "step1",
    number: "01",
    title: "The Vision",
    tagline: "Where geometry becomes feeling and form becomes a promise.",
    messages: [
      { text: "Architect: You see a space before the world sees a wall. A line, a whisper of a future.", sender: "Architect", type: "user" },
      { text: "Vision: You hold the intent like fire in your hands. Pure. Sharp. Alive.", sender: "Vision", type: "ai" },
      { text: "Architect: A vision waiting to breathe, now translated into grids and dimensions.", sender: "Architect", type: "user" },
    ],
  },
  {
    id: "step2",
    number: "02",
    title: "The Gap",
    tagline: "Between screen and site, the intent often falls.",
    messages: [
      { text: "Architect: A journey begins — and the meaning falls. Contractors guess, reality bends.", sender: "Architect", type: "user" },
      { text: "Reality: Intent cracks. Clarity leaks. The drawing was precise, the understanding was not.", sender: "Reality", type: "ai" },
      { text: "Architect: You thought your job was designing. Turns out it's explaining. Over and over.", sender: "Architect", type: "user" },
    ],
  },
  {
    id: "step3",
    number: "03",
    title: "The Bridge",
    tagline: "Architecture wasn't meant to be defended. It was meant to be delivered.",
    messages: [
      { text: "Architect: The shift. Not another drafting app, but a digital twin of intent.", sender: "Architect", type: "user" },
      { text: "Solution: Drawings that explain. Models that teach. Details that speak. 3D that guides hands.", sender: "Solution", type: "ai" },
      { text: "Architect: You do not chase understanding. You command it. The vision survives.", sender: "Architect", type: "user" },
    ],
  },
];
