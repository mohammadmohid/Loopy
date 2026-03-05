"use client";

const EMOJI_LIST = [
    "👍", "❤️", "😂", "🎉", "🤔", "👀", "🔥", "✅",
    "⭐", "🙌", "💯", "😍", "🚀", "👏", "😊", "😢",
    "😮", "💪", "🤝", "🙏", "👎", "😎", "🤣", "💡",
];

interface ReactionPickerProps {
    onSelect: (emoji: string) => void;
    onClose: () => void;
}

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
    return (
        <div className="bg-white border border-neutral-200 rounded-xl shadow-lg p-2 w-[220px]">
            <div className="grid grid-cols-8 gap-0.5">
                {EMOJI_LIST.map((emoji) => (
                    <button
                        key={emoji}
                        onClick={() => onSelect(emoji)}
                        className="w-6 h-6 flex items-center justify-center text-base hover:bg-neutral-100 rounded transition-colors"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
}
