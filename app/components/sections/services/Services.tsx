"use client";

import React from "react";
import {
  Compass,
  ShieldCheck,
  LineChart,
  Landmark,
  Home,
  Car,
  ShieldAlert,
  Building2,
  Zap,
} from "lucide-react";
import Container from "@/app/ui/container/Container";
import Button from "@/app/ui/cta/Button";
import s from "./services.module.css";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";
import { Reveal } from "@/app/ui/animations/Reveal";

type Service = {
  label: string;
  title: string;
  description: string;
  image: string;
  icon: React.ReactNode;
};

const services: Service[] = [
  {
    label: "Plán",
    title: "Finanční plán",
    description:
      "Víte, čeho chcete dosáhnout, ale nevíte, jak na to? Vytvoříme plán, díky kterému už nebudete tápající pasažér, ale sebevědomý kapitán svých financí.",
    image: "/plan.png",
    icon: <Compass size={28} />,
  },
  {
    label: "Příjem",
    title: "Zajištění příjmu",
    description:
      "Co kdyby se zítra všechno změnilo? Když chráníte svůj příjem, dáváte sobě i svým blízkým jistotu, že v tom nikdy nezůstanete sami.",
    image: "/prijem.png",
    icon: <ShieldCheck size={28} />,
  },
  {
    label: "Investice",
    title: "Investice a spoření",
    description:
      "Pomohu vám zorientovat se v investování a spoření tak, aby dávaly smysl v rámci vašeho plánu.",
    image: "/investice.png",
    icon: <LineChart size={28} />,
  },
  {
    label: "Úvěry",
    title: "Spotřebitelské a podnikatelské úvěry",
    description:
      "Dům, auto nebo třeba vlastní podnikání? Když přichází příležitosti, chytrý úvěr otevírá cestu dál.",
    image: "/uvery.png",
    icon: <Landmark size={28} />,
  },
  {
    label: "Majetek",
    title: "Ochrana majetku",
    description:
      "Váš domov je víc než jen nemovitost. Postarejte se o to, aby nic z toho neohrozilo neštěstí ani nehoda.",
    image: "/majetek.png",
    icon: <Home size={28} />,
  },
  {
    label: "Vozidlo",
    title: "Pojištění vozidla",
    description:
      "Nečekané situace na cestách? Díky správně nastavenému pojištění zůstáváte v klidu – za volantem i mimo něj.",
    image: "/nehoda.png",
    icon: <Car size={28} />,
  },
  {
    label: "Odpovědnost",
    title: "Pojištění odpovědnosti",
    description:
      "Jste profík, ale co když jednou něco nevyjde? Pojištění odpovědnosti vám kryje záda tam, kde může jediná chyba ohrozit vaši pověst i peněženku.",
    image: "/pojistna.png",
    icon: <ShieldAlert size={28} />,
  },

  // --- doplněné služby ---
  {
    label: "Reality",
    title: "Reality (prodej nemovitosti)",
    description:
      "Když plánujete prodej nemovitosti, propojíme vás se zkušeným makléřem a pohlídáme, aby celý krok dával smysl v rámci vašeho finančního plánu.",
    image: "/reality.png",
    icon: <Building2 size={28} />,
  },
  {
    label: "Energie",
    title: "Energie a úspory",
    description:
      "Energie jsou dnes výrazná položka rodinného rozpočtu. Projdeme nastavení a se specialistou najdeme prostor pro úspory – vždy s ohledem na váš celkový plán.",
    image: "/energie.png",
    icon: <Zap size={28} />,
  },
];

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const Services = () => {
  const { openLeadForm } = useLeadFormModal();

  return (
    <section className={s.servicesCont} id="services">
      <Container fullHeight>
        <div className={`${s.header}`}>
          <Reveal as="p" from="bottom" className={s.eyebrow}>
            Praktické služby
          </Reveal>
          <Reveal as="h2" from="bottom">
            Když chcete mít ve financích jasno
          </Reveal>
          <Reveal as="p" from="bottom" className={s.sub}>
            Vyberte si téma, které právě řešíte. Společně pak projdeme
            možnosti a navrhneme další postup.
          </Reveal>
        </div>

        <div className={s.grid}>
          {services.map((service, i) => (
            <Reveal
              key={service.title}
              as="article"
              from="bottom"
              className={`${s.card} ${s.cardReveal}`}
              index={i}
              id={`service-${slugify(service.title)}`}
              duration={0.3}
            >
              <div
                className={s.figure}
                aria-hidden
                style={{
                  backgroundImage: `linear-gradient(
          140deg,
          rgba(0, 0, 0, 0.32),
          rgba(8, 24, 19, 0.24)
        ), url(${service.image})`,
                  backgroundPosition: "center center",
                }}
              ></div>

              <div className={s.text}>
                <div className={s.flexLabelCont}>
                  <span className={s.label}>{service.label}</span>
                  <span className={s.iconLabel}>{service.icon}</span>
                </div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </div>

              <Button
                variant="cta"
                className={s.ctaBtn}
                onClick={() => openLeadForm(service.title)}
              >
                Probrat vaši situaci
              </Button>
            </Reveal>
          ))}
        </div>
        <Reveal as="p" from="bottom" className={s.disclaimer}>
          Informace na webu slouží k obecnému přehledu a nepředstavují
          investiční doporučení. Konkrétní řešení vždy vychází z individuální
          konzultace.
        </Reveal>
      </Container>
    </section>
  );
};

export default Services;
