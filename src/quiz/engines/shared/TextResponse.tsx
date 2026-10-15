import WritingJudgeControl from
  "./WritingJudgeControl";

import type {
  WritingJudgeTask
} from "./WritingJudgeControl";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  judge?: WritingJudgeTask;
};

function TextResponse({
  value,
  onChange,
  placeholder,
  judge
}: Props) {
  return (
    <>
      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
      />
      {judge && (
        <WritingJudgeControl
          task={judge}
          userWriting={value}
        />
      )}
    </>
  );
}

export default TextResponse;
