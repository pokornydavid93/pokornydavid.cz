import { useState } from "react";
import s from "./leadform.module.css";
import Container from "@/app/ui/container/Container";
import Button from "@/app/ui/cta/Button";
import { PhoneCall, Video, Mail, Phone } from "lucide-react";

const topics = [
  "Finanční plán",
  "Investice a spoření",
  "Zajištění příjmu",
  "Pojištění vozidla",
  "Ochrana majetku",
  "Pojištění odpovědnosti",
  "Spotřebitelské a podnikatelské úvěry",
];

const LeadForm = () => {
  const [callType, setCallType] = useState<"video" | "phone">("video");

  return (
    <section className={s.leadFormCont} id="lead-form">
      <div className={s.bgImage} aria-hidden />
      <div className={s.scrim} aria-hidden />

      <Container className={s.inner} maxWidth={1200}>
        <div className={s.formCard}>
          <div className={s.cardHeader}>
            <div className={s.eyebrow}>
              <span className={s.dot} />
              Pojďme si promluvit
              <span className={s.dot} />
            </div>
            <h2>Probereme vaši situaci?</h2>
            <p>
              Zavolejte <a href="tel:+420731830897">+420 731 830 897</a>, nebo mi
              napište{" "}
              <a href="mailto:info@pokornydavid.cz">info@pokornydavid.cz</a>.
              Případně jednoduše vyplňte formulář.
            </p>
          </div>

          <form className={s.formGrid}>
            <div className={s.inputGroup}>
              <label htmlFor="firstName">Jméno*</label>
              <input id="firstName" name="firstName" required placeholder="Jméno" />
            </div>

            <div className={s.inputGroup}>
              <label htmlFor="lastName">Příjmení*</label>
              <input id="lastName" name="lastName" required placeholder="Příjmení" />
            </div>

            <div className={s.inputGroup}>
              <label htmlFor="email">E-mail*</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="vas@email.cz"
              />
            </div>

            <div className={s.inputGroup}>
              <label htmlFor="phone">Telefon*</label>
              <input id="phone" name="phone" required placeholder="+420 ..." />
            </div>

            <div className={`${s.inputGroup} ${s.fullWidth}`}>
              <label>Forma hovoru*</label>
              <div className={s.toggleWrap}>
                <button
                  type="button"
                  className={`${s.toggleBtn} ${callType === "video" ? s.active : ""}`}
                  onClick={() => setCallType("video")}
                >
                  <Video size={18} /> Online videohovor
                </button>
                <button
                  type="button"
                  className={`${s.toggleBtn} ${callType === "phone" ? s.active : ""}`}
                  onClick={() => setCallType("phone")}
                >
                  <PhoneCall size={18} /> Telefonický kontakt
                </button>
              </div>
              <input
                type="hidden"
                name="callType"
                value={callType === "video" ? "Online videohovor" : "Telefonický kontakt"}
              />
            </div>

            <div className={`${s.inputGroup} ${s.fullWidth}`}>
              <label htmlFor="topic">Téma hovoru*</label>
              <select id="topic" name="topic" required defaultValue="">
                <option value="" disabled>
                  Vyberte téma
                </option>
                {topics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${s.inputGroup} ${s.fullWidth}`}>
              <label htmlFor="message">Poznámka (volitelné)</label>
              <textarea
                id="message"
                name="message"
                rows={3}
                placeholder="Shrňte, co chcete probrat."
              />
            </div>

            <label className={`${s.consent} ${s.fullWidth}`}>
              <input type="checkbox" required name="gdpr" />
              <span>Souhlasím se zpracováním osobních údajů*</span>
            </label>

            <div className={`${s.actions} ${s.fullWidth}`}>
              <Button variant="cta" className={s.submitBtn} type="submit">
                Odeslat
              </Button>
              <div className={s.contactInline}>
                <Phone size={16} /> <a href="tel:+420731830897">+420 731 830 897</a>
                <Mail size={16} />{" "}
                <a href="mailto:info@pokornydavid.cz">info@pokornydavid.cz</a>
              </div>
            </div>
          </form>
        </div>
      </Container>
    </section>
  );
};

export default LeadForm;
