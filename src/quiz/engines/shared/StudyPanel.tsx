import type {
  ReactNode
} from "react";

type Props = {
  children: ReactNode;
};

function StudyPanel({
  children
}: Props) {
  return (
    <div className="study-content">
      {children}
    </div>
  );
}

export default StudyPanel;
