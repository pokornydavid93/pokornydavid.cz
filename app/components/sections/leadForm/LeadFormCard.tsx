import LeadFormCardClient from "./LeadFormCardClient.client";
import { leadFormTopics } from "./leadFormTopics";

type LeadFormCardProps = {
  prefillTopic?: string;
  variant?: "section" | "modal";
  onRequestClose?: () => void;
};

const LeadFormCard = (props: LeadFormCardProps) => {
  return <LeadFormCardClient {...props} />;
};

export { leadFormTopics };
export default LeadFormCard;
