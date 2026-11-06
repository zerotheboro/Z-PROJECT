import type { EconomicsDiagramData } from "./types";

/** Original schematic diagrams. Numeric tasks state their own data explicitly. */
export default function EconomicsDiagram({ diagram }: { diagram: EconomicsDiagramData }) {
  const ppc = diagram.kind === "ppc", surplus = diagram.kind === "surplus";
  return <figure className="economics-diagram">
    <svg viewBox="0 0 400 290" role="img" aria-label={diagram.label} style={{ width: "100%", maxWidth: "30rem", height: "auto" }}>
      <title>{diagram.label}</title>
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M55 20V240H365" />
        {ppc ? <path d={diagram.variant === "bowed" ? "M55 45 Q285 45 335 240" : "M55 45 L335 240"} stroke="#203E5F" strokeWidth="3" /> : <>
          <path d="M55 42L335 225" stroke="#203E5F" strokeWidth="3" />
          <path d="M55 238L335 55" stroke="#167d77" strokeWidth="3" />
          {diagram.variant === "demand-shift" && <path d="M125 45L365 200" stroke="#203E5F" strokeDasharray="6 4" strokeWidth="3" />}
          {diagram.variant === "supply-shift" && <path d="M125 225L365 70" stroke="#167d77" strokeDasharray="6 4" strokeWidth="3" />}
          {surplus && <>
            <path d="M55 42L205 140H55Z" fill="#20b2aa" fillOpacity=".22" stroke="none" />
            <path d="M55 238L205 140H55Z" fill="#FFA955" fillOpacity=".3" stroke="none" />
            <path d="M55 140H205V240" strokeDasharray="4 3" />
          </>}
        </>}
      </g>
      <g fill="currentColor" fontSize="13" fontFamily="sans-serif">
        <text x="8" y="18">{ppc ? "Food" : "Price"}</text><text x="275" y="275">{ppc ? "Machines" : "Quantity"}</text><text x="37" y="255">0</text>
        {ppc ? <>
          <circle cx="135" cy="192" r="4" /><text x="143" y="192">A</text>
          <circle cx={diagram.variant === "bowed" ? 240 : 195} cy={diagram.variant === "bowed" ? 93.75 : 142.5} r="4" /><text x={diagram.variant === "bowed" ? 230 : 185} y={diagram.variant === "bowed" ? 82 : 130}>B</text>
          <circle cx="300" cy="95" r="4" /><text x="307" y="95">C</text><text x="320" y="235">PPC</text>
        </> : <>
          <text x="337" y="231">{diagram.variant === "demand-shift" ? "D0" : "D"}</text>
          <text x="337" y="52">{diagram.variant === "supply-shift" ? "S0" : "S"}</text>
          {diagram.variant === "demand-shift" && <text x="365" y="195">D1</text>}
          {diagram.variant === "supply-shift" && <text x="365" y="65">S1</text>}
          {surplus && <><text x="25" y="144">P*</text><text x="195" y="257">Q*</text></>}
        </>}
      </g>
    </svg>
    <figcaption>{diagram.label}. Schematic, not to scale.</figcaption>
  </figure>;
}
