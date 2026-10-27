// These are compiler inputs, not executable application code. Negative cases
// intentionally contain errors; no ignore directives or assertions hide them.
export const positiveCases = `
const header: TipHeader = { eng: "A study method", src: "icon.svg" };
const paragraph: TipParagraph = { eng: "English text" };
const defaults = new DetailOfTips();
const defaultHeader: string = defaults.header;
const defaultParagraph: string = defaults.paragraph;
const inferred: StudyTip = new DetailOfTips(header, paragraph);
const inferredTitle: string = inferred.header.eng;
const explicit: StudyTip = new DetailOfTips<TipHeader, TipParagraph>(header, paragraph);
const headerOnly = new DetailOfTips(header);
const headerOnlyText: string = headerOnly.header.eng;
const headerOnlyParagraph: string = headerOnly.paragraph;
const paragraphOnly = new DetailOfTips(undefined, paragraph);
const paragraphOnlyHeader: string | TipHeader = paragraphOnly.header;
const paragraphOnlyText: ReactNode = paragraphOnly.paragraph.eng;
const undefinedDefaults = new DetailOfTips(undefined, undefined);
const undefinedHeader: string | TipHeader = undefinedDefaults.header;
const literalDefaults = new DetailOfTips<"header", "p">();
const literalHeader: "header" = literalDefaults.header;
const literalParagraph: "p" = literalDefaults.paragraph;
const literalValues = new DetailOfTips<"custom", "body">("custom", "body");
const literalValue: "custom" = literalValues.header;
new DetailOfTips<TipHeader, string>(header);
new DetailOfTips<string, TipParagraph>(undefined, paragraph);
new DetailOfTips<"header", TipParagraph>(undefined, paragraph);
new DetailOfTips<TipHeader | "header", TipParagraph | "p">();
new DetailOfTips<TipHeader | "header", TipParagraph>(undefined, paragraph);
new DetailOfTips<TipHeader, TipParagraph | "p">(header);
new DetailOfTips(header, paragraph, { src: "asset.svg", format: "image" }, "left", "More information", false, "historically ignored");
new DetailOfTips(undefined, undefined, { src: "asset.svg", format: "image" });
`;

export const negativeCases = [
  ["original explicit object defaults", "const original: StudyTip = new DetailOfTips<TipHeader, TipParagraph>();"],
  ["contextual object defaults", "const contextual: StudyTip = new DetailOfTips();"],
  ["missing object paragraph", 'new DetailOfTips<TipHeader, TipParagraph>({ eng: "Title" });'],
  ["undefined object header", 'new DetailOfTips<TipHeader, TipParagraph>(undefined, { eng: "Text" });'],
  ["undefined object paragraph", 'new DetailOfTips<TipHeader, TipParagraph>({ eng: "Title" }, undefined);'],
  ["omitted object header only", "new DetailOfTips<TipHeader, string>();"],
  ["omitted object paragraph only", "new DetailOfTips<string, TipParagraph>();"],
  ["incompatible header literal", 'new DetailOfTips<"custom", string>();'],
  ["incompatible paragraph literal", 'new DetailOfTips<string, "body">();'],
  ["undefined incompatible header literal", 'new DetailOfTips<"custom", string>(undefined, "Text");'],
  ["undefined incompatible paragraph literal", 'new DetailOfTips<string, "body">("Title", undefined);'],
  ["missing object in mixed generic types", 'new DetailOfTips<TipHeader | "header", TipParagraph>();'],
  ["union missing the header default", 'new DetailOfTips<TipHeader | "custom", string>();'],
  ["union missing the paragraph default", 'new DetailOfTips<string, TipParagraph | "body">();']
];
