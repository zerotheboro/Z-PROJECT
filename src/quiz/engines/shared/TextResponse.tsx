type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

function TextResponse({
  value,
  onChange,
  placeholder
}: Props) {
  return (
    <textarea
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      placeholder={placeholder}
    />
  );
}

export default TextResponse;
