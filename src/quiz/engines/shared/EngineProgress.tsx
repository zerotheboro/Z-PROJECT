import type {
  ReactNode
} from "react";

type Props = {
  className: string;
  label: ReactNode;
  status: ReactNode;
};

function EngineProgress({
  className,
  label,
  status
}: Props) {
  return (
    <div className={className}>
      <span>{label}</span>
      <span>{status}</span>
    </div>
  );
}

export default EngineProgress;
