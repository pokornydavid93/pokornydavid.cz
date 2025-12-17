'use client';

import React from "react";
import {
  Compass,
  LineChart,
  ShieldCheck,
  Car,
  Home,
  ShieldAlert,
  Landmark,
} from "lucide-react";
import Container from "@/app/ui/container/Container";
import Button from "@/app/ui/cta/Button";
import s from "./services.module.css";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";

type Service = {
  label: string;
  title: string;
  description: string;
  image: string;
  icon: React.ReactNode;
};

const services: Service[] = [
  {
    label: "Úvěry",
    title: "Spotřebitelské a podnikatelské úvěry",
    description:
      "Dům, auto nebo třeba vlastní podnikání? Když přichází příležitosti, chytrý úvěr otevírá cestu dál.",
    image:
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1400&q=80&sat=-35&exp=-6",
    icon: <Landmark size={28} />,
  },
  {
    label: "Odpovědnost",
    title: "Pojištění odpovědnosti",
    description:
      "Jste profík, ale co když jednou něco nevyjde? Pojištění odpovědnosti vám kryje záda tam, kde může jediná chyba ohrozit vaši pověst i peněženku.",
    image:
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1400&q=80&sat=-30&exp=-6",
    icon: <ShieldAlert size={28} />,
  },
  {
    label: "Vozidlo",
    title: "Pojištění vozidla",
    description:
      "Nečekané situace na cestách? Díky správně nastavenému pojištění zůstáváte v klidu – za volantem i mimo něj.",
    image:
      "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1400&q=80&sat=-25&exp=-6",
    icon: <Car size={28} />,
  },
  {
    label: "Majetek",
    title: "Ochrana majetku",
    description:
      "Váš domov je víc než jen nemovitost. Postarejte se o to, aby nic z toho neohrozilo neštěstí ani nehoda.",
    image:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1400&q=80&sat=-25&exp=-6",
    icon: <Home size={28} />,
  },
  {
    label: "Plán",
    title: "Finanční plán",
    description:
      "Víte, čeho chcete dosáhnout, ale nevíte, jak na to? Vytvoříme plán, díky kterému už nebudete tápající pasažér, ale sebevědomý kapitán svých financí.",
    image:
      "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1400&q=80&sat=-25&exp=-6",
    icon: <Compass size={28} />,
  },
  {
    label: "Investice",
    title: "Investice a spoření",
    description:
      "Každý velký cíl začíná chytrým rozhodnutím. Pomohu vám investovat tak, aby se z přání stala realita – a z úspor rostoucí jistota.",
    image:
      "https://images.unsplash.com/photo-1454165205744-3b78555e5572?auto=format&fit=crop&w=1400&q=80&sat=-20&exp=-6",
    icon: <LineChart size={28} />,
  },
  {
    label: "Příjem",
    title: "Zajištění příjmu",
    description:
      "Co kdyby se zítra všechno změnilo? Když chráníte svůj příjem, dáváte sobě i svým blízkým jistotu, že v tom nikdy nezůstanete sami.",
    image:
      "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1400&q=80&sat=-25&exp=-6",
    icon: <ShieldCheck size={28} />,
  },
];

const Services = () => {
  const { openLeadForm } = useLeadFormModal();

  return (
    <section className={s.servicesCont} id="services">
      <Container fullHeight>
      <div className={s.spotlight} aria-hidden />
      <div className={s.header}>
        <p className={s.eyebrow}>Praktické služby</p>
        <h2>Férové poradenství pro vaše jistoty</h2>
        <p className={s.sub}>
          Vyberte si, co právě řešíte. Karty ukazují konkrétní postup — jasně,
          lidsky a bez složitých výrazů.
        </p>
      </div>

      <div className={s.grid}>
        {services.map((service) => (
          <article key={service.title} className={s.card}>
            <div
              className={s.figure}
              aria-hidden
              style={{
                backgroundImage: `linear-gradient(140deg, rgba(0, 0, 0, 0.32), rgba(8, 24, 19, 0.24)), url(${service.image})`,
              }}
            >
              <span className={s.figureBadge}>{service.icon}</span>
            </div>
            <div className={s.text}>
              <span className={s.label}>{service.label}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
            </div>
            <Button
              variant="cta"
              className={s.ctaBtn}
              onClick={() => openLeadForm(service.title)}
            >
              Sjednat konzultaci
            </Button>
          </article>
        ))}
      </div>
         </Container>
    </section>
  );
};

export default Services;
