import LeadFormCard from "./LeadFormCard";
import s from "./leadform.module.css";

const LeadForm = () => {
  return (
    <section className={s.leadFormCont} id="lead-form">
      <div className={s.bgImage} aria-hidden />
      <div className={s.scrim} aria-hidden />

      <div className={s.inner}>
        <LeadFormCard />
      </div>
    </section>
  );
};

export default LeadForm;
