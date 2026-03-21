interface Props {
  onSelect: (text: string) => void;
  dark: boolean;
}

const PROMPTS = [
  { emoji: "🗼", label: "Tokyo 7 Days", text: "Plan a 7-day trip to Tokyo, Japan for 2 people with a $3000 budget. We love food, culture, and history." },
  { emoji: "🏛️", label: "Rome & Amalfi", text: "Plan a 10-day Italy trip covering Rome and the Amalfi Coast for a couple with $5000 budget. We love history, food, and scenic views." },
  { emoji: "🏜️", label: "Morocco Adventure", text: "Plan a 8-day Morocco trip through Marrakech, the Sahara desert, and Fes for 2 travelers with $2500. We love adventure and photography." },
  { emoji: "🌺", label: "Bali Retreat", text: "Plan a 10-day Bali trip for a solo traveler with $2000 budget. Interested in wellness, spirituality, and local culture." },
  { emoji: "🗽", label: "New York City", text: "Plan a 5-day New York City trip for a family of 4 with $4000. Kids are 8 and 12 years old. We love art, food, and entertainment." },
  { emoji: "🦁", label: "Kenya Safari", text: "Plan a 9-day Kenya safari trip for 2 people with $6000. We want Maasai Mara, Amboseli, and authentic cultural experiences." },
  { emoji: "⛩️", label: "Kyoto Culture", text: "Plan a 5-day cultural trip to Kyoto, Japan for solo traveler with $1500. Deep interest in temples, tea ceremony, and traditional arts." },
  { emoji: "🏔️", label: "Peru & Machu Picchu", text: "Plan a 10-day Peru adventure for 2 people with $3500 including Machu Picchu, Lima, and the Sacred Valley." },
];

export default function SuggestedPrompts({ onSelect, dark }: Props) {
  return (
    <div className="mt-4">
      <p className={`text-xs font-medium mb-3 text-center ${dark ? "text-gray-500" : "text-gray-400"}`}>
        ✨ Quick start — pick a destination or type your own
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {PROMPTS.map(p => (
          <button
            key={p.label}
            onClick={() => onSelect(p.text)}
            className={`flex flex-col items-center gap-1 px-3 py-3 rounded-xl border text-center transition-all hover:scale-105 ${
              dark
                ? "bg-gray-800 border-gray-700 hover:border-emerald-500 hover:bg-gray-750 text-gray-300"
                : "bg-white border-gray-200 hover:border-emerald-400 hover:shadow-md text-gray-700"
            }`}
          >
            <span className="text-xl">{p.emoji}</span>
            <span className="text-xs font-medium leading-tight">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
