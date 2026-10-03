import React, { useState } from "react";

export const STROOP_COLORS = [ { name: "red",    hsla: "hsla(0, 100%, 50%, 1)" },
                            { name: "orange", hsla: "hsla(30, 100%, 50%, 1)" },
                            { name: "yellow", hsla: "hsla(60, 100%, 50%, 1)" },
                            { name: "green",  hsla: "hsla(120, 100%, 40%, 1)" },
                            { name: "blue",   hsla: "hsla(240, 100%, 50%, 1)" },
                            { name: "purple", hsla: "hsla(280, 100%, 60%, 1)" },
                            { name: "pink",   hsla: "hsla(330, 100%, 70%, 1)" },
                            { name: "gray",   hsla: "hsla(0, 0%, 50%, 1)" },
                            { name: "white",  hsla: "rgb(255, 255, 255)" },
                            { name: "black",  hsla: "hsla(0, 0%, 0%, 1)" },
                            { name: "crimson",      hsla: "hsla(348, 83%, 47%, 1)" },
                            { name: "gold",         hsla: "hsla(50, 100%, 50%, 1)" },
                            { name: "lime",         hsla: "hsla(120, 100%, 50%, 1)" },
                            { name: "cyan",         hsla: "hsla(180, 100%, 50%, 1)" },]
export function createStroopStimulus(
    colors = STROOP_COLORS,
    random = Math.random
){
    if (colors.length === 0) return null;

    const inkIndex = Math.floor(random() * colors.length);
    let wordIndex = Math.floor(random() * colors.length);

    if (wordIndex === inkIndex && colors.length > 1) {
        wordIndex = (wordIndex + 1) % colors.length;
    }

    return { inkIndex, wordIndex };
}

/**
 * @param {{
 *   colors?: Array<{ name: string; hsla: string }>;
 *   initialLabel?: string;
 *   onAttempt?: () => void;
 *   stimulus?: { inkIndex: number; wordIndex: number } | null;
 *   onStimulusChange?: (
 *     stimulus: { inkIndex: number; wordIndex: number } | null
 *   ) => void;
 * }} props
 */
function BODY({
    colors = STROOP_COLORS,
    initialLabel = "press",
    onAttempt = () => {},
    stimulus,
    onStimulusChange
} = {}){
    const [localStimulus, setLocalStimulus] = useState(null);
    const activeStimulus = stimulus ?? localStimulus;
    const ink = activeStimulus
        ? colors[activeStimulus.inkIndex]
        : null;
    const word = activeStimulus
        ? colors[activeStimulus.wordIndex]
        : null;

    function nextStimulus() {
        const next = createStroopStimulus(colors);

        setLocalStimulus(next);
        onStimulusChange?.(next);
        onAttempt();
    }

    return(
        <button
            className="asset"
            id="PROMPT"
            style={ink ? { color: ink.hsla } : undefined}
            onClick={nextStimulus}
        >
            {word?.name ?? initialLabel}
        </button>
    );
}

export default BODY
