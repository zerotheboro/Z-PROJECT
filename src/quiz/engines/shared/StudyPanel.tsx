import type {
  ReactNode
} from "react";
import { useEconomicsStudyPanel } from "../../economics9708/EconomicsStudyLayout";

type Props = {
  children: ReactNode;
};

function StudyPanel({
  children
}: Props) {
  return (
    <div className="study-content">
      {useEconomicsStudyPanel(children)}
    </div>
  );
}

export default StudyPanel;
