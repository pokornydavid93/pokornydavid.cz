import LeadFormCard from "./LeadFormCard";
import s from "./leadform.module.css";

const LeadForm = () => {
  return (
    <section
      className={s.leadFormCont}
      id="lead-form"
      data-surface-tone="dark"
    >
      <div className={s.inner}>
        <LeadFormCard />
      </div>
    </section>
  );
};

export default LeadForm;
