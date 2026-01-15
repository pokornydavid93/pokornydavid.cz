import s from "./testimonials.module.css";
import Container from "@/app/ui/container/Container";
import {
  Wallet,
  ShieldCheck,
  Home,
  LineChart,
  PiggyBank,
  Shield,
  LucideIcon,
} from "lucide-react";
import RevealClient from "@/app/ui/animations/RevealClient";
import TestimonialsCTAButton from "./TestimonialsCTAButton.client";
import TestimonialsMarquee from "./TestimonialsMarquee.client";

export type Testimonial = {
  quote: string;
  name: string;
  link: string;
  rating: number;
  source: ReviewSource;
};

export type ReviewSource = "google";

const leftColumn: Testimonial[] = [
  {
    quote:
      "Jsem s tímto člověkem již přes 4 roky svého života a musím popravdě říct, že kdykoliv jsem potřeboval, tak byl ochotný a dokázal mi ve všem dobře poradit. Ať už se jednalo o nastavení pojistek nebo řešení pojistné události. Za mě super lidský přístup a tak to má hlavně vypadat! V dnešní době nikdo nechce, aby vám někdo mazal med kolem huby, a rozhodně ne u financí! Abych byl upřímný, tak to se vám u Davida nestane, protože vždy budete přesně vědět, že máte své finance, zdraví nebo případně životní události pod kontrolou. :) Pokračuj v tom, co děláš, protože to děláš perfektně! DB",
    name: "Daniel Baciak",
    link: "https://share.google/m6Nutj17CZUp7bRZP",
    rating: 5,
    source: "google",
  },
  {
    quote:
      "Pana Davida Pokorného můžu doporučit všemi deseti. Má lidský a otevřený přístup, vše vysvětluje srozumitelně, aby tomu každý rozuměl. Do ničeho zbytečně netlačí a nepřesvědčuje vás o věcech, které opravdu nechcete. Jedná férově, zajímá se o to, co klient opravdu potřebuje a chce, a hledá správné a vhodné řešení tak, aby splnilo očekávání a dávalo smysl. Je vidět, že ho práce baví a že ji dělá s láskou. Nejde mu o vlastní obohacení, ale o spokojenost vlastních klientů. Spolupráce s ním je suprová.",
    name: "Lukáš Kratochvíl",
    link: "https://share.google/UvbYaZWNtv7wtQW2y",
    rating: 5,
    source: "google",
  },
  {
    quote:
      "Davida můžu doporučit, když potřebuji aktualizovat např. POV nebo jiné produkty. David to řeší okamžitě s pro mě vyhovujícími podmínkami. Řešili jsme už mnoho smluv i výpovědí a vše zdárně a rychle. Ještě jednou můžu doporučit.",
    name: "David Jaroš",
    link: "https://share.google/TZbl9U0htF5zFlyr4",
    rating: 5,
    source: "google",
  },
  {
    quote: "Davida můžu jednoznačně doporučit. Má lidský a otevřený přístup, vše vysvětluje srozumitelně, aby tomu každý rozuměl. Jedná férově, zajímá se o reálné potřeby klienta a nehledá rychlý prodej, ale dlouhodobé řešení. Je znát, že mu nejde jen o čísla, ale hlavně o lidi. Spolupráce s ním je příjemná a dává smysl.",
    name: "Daniel Dvořák",
    link: "https://share.google/inOM80tZ7IHvChmif",
    rating: 5,
    source: "google",
  },
  {
    quote: "Spolupráce s finančním poradcem byla velmi přínosná. Vše vysvětlil srozumitelně, jednal férově a vždy vycházel z mých potřeb, ne z vlastního zájmu. Je ochotný hledat dlouhodobě nejlepší řešení. Díky němu mám ve svých financích a produktech jasno.",
    name: "Dominik Vykydal",
    link: "https://share.google/35DLzl3VlK1kH9LIB",
    rating: 5,
    source: "google",
  },
  {
    quote: "Spolupráce na pohodu. Vše mi bylo normálně a lidsky vysvětleno, bez složitých výrazů a zbytečného tlačení do něčeho, co bych nechtěla. Měla jsem pocit, že mu jde hlavně o to, aby mi to dávalo smysl a fungovalo dlouhodobě. Příjemná a rychlá komunikace, ochota pomoct, když něčemu nerozumím. Jsem ráda, že jsem našla finančního poradce, který se nestará jen o svou kapsu. Určitě doporučuji.",
    name: "Zuzana Smolíková",
    link: "https://share.google/bIpQxPDkvei2tPzhj",
    rating: 5,
    source: "google",
  },
  {
    quote: "Hledala jsem někoho, kdo mi vysvětlí a poradí, jakou pojistku si dát. Našla jsem pana Pokorného. Hned první volání bylo úžasné a schůzka ještě lepší. Pan Pokorný dokáže poradit a vysvětlit, proč by to tak mělo být, proč zase toto není dobré. Už jsem jeho klientka několik let a můžu ho jen doporučit.",
    name: "Nikola Malerova",
    link: "https://share.google/sWU1g4kfIK29D3gXN",
    rating: 5,
    source: "google",
  },
  {
    quote: "Výborný poradce, svou práci odvádí dokonale. Má lidský přístup, vše dokáže vysvětlit tak, aby to pochopil každý. Jsem jeho klientkou už nějakou dobu, pokaždé mi dobře poradil. Vím, že když se něco stane, tak že se na něj můžu obrátit a nemusím se bát. Můžu jen doporučit ❤️",
    name: "Lucie Martínková",
    link: "https://share.google/nfCXeS76QASdPCC9V",
    rating: 5,
    source: "google",
  },
  
];

const rightColumn: Testimonial[] = [
  {
    quote: "Jestli hledáte lidský a přátelský přístup, tak je pro vás David super volba. Nikdy jsem se nebála zeptat se na cokoli a v rychlosti mi bylo vše krásně a hlavně srozumitelně vysvětleno. Byl vždy k dispozici, když byla potřeba, dotáhne s vámi vše od začátku až do konce. Můžu jen doporučit. 🙏🏼",
    name: "Nikola Kvapilova",
    link: "https://share.google/BKLOQO8KWtFp101nK",
    rating: 5,
    source: "google",
  },
  {
    quote:
      "Velký profesionál. Dost mile mě překvapil, kolik toho o financích ví a zná. Zatím nebylo nic, co by nedokázal vyřešit. Moc doporučuji.",
    name: "Radek Mader",
    link: "https://share.google/O0QbaE4dskUXj3IVv",
    rating: 5,
    source: "google",
  },
  {
    quote:
      "Dejv mi spravuje pojistky na auta a já nemusím vůbec nic řešit. O všechno se stará on, hlídá výročí, upozorňuje na změny, posílá výpovědi atd. Prostě paráda.",
    name: "Daniel Prucek",
    link: "https://share.google/1ckJaWmrmSJyGdfQw",
    rating: 5,
    source: "google",
  },
    {
    quote: "Dobrý kamarád, který poradí v nouzi. Bez něj jsem nevěděla, jak dobře investovat 💰. Poradí s vyhledáváním lepšího pojištění na cokoliv. 🚗🏡",
    name: "Eva Hustá",
    link: "https://share.google/mBOCHNrSKJZhbP5PY",
    rating: 5,
    source: "google",
  },
    {
    quote: "Jsem velmi spokojená. David je výborný poradce, který své práci rozumí perfektně. Vždy se na něj mohu spolehnout a s důvěrou se na něj obrátit, vždy mi pomůže a dobře poradí. Nebojím se ho doporučit rodině a přátelům, vím, že i oni budou moc spokojení. Po dlouhých letech mám konečně finančního poradce, který myslí především na klienty a ne jen na sebe. Moc mu děkuji.",
    name: "Martina Heinzová",
    link: "https://share.google/JXP1KVVtrcNZJoQ7a",
    rating: 5,
    source: "google",
  },
    {
    quote: "Se spoluprací s finančním poradcem jsem velmi spokojená. Od prvního setkání byl přístup profesionální, ale zároveň lidský a přátelský. Vše mi bylo vysvětleno srozumitelně a v klidu, takže jsem přesně věděla, co a proč řešíme. Oceňuji individuální přístup, dlouhodobé myšlení a skutečný zájem o mou finanční situaci. Díky této spolupráci mám větší jistotu a přehled ve svých financích. Doporučuji každému, kdo chce mít finance pod kontrolou.",
    name: "Denisa Řezníčková",
    link: "https://share.google/w0usRR2Gu4l37n3to",
    rating: 5,
    source: "google",
  },
    {
    quote: "Skvělý finanční poradce a parťák, který mi srozumitelně vysvětlil věci, ve kterých jsem měl zmatek, a navrhl reálné řešení bez zbytečného kecání. Založil mi životní pojištění, pojištění auta a různé investiční plány a dále se o ně stará, abych já nemusel. Má profesionální a lidský přístup, který můžu jen doporučit.",
    name: "Stanislav Dvořák",
    link: "https://share.google/C1vyXNU8y4oSRQJrW",
    rating: 5,
    source: "google",
  },
    {
    quote: "Davida můžu stoprocentně doporučit. Umí srozumitelným způsobem vše vysvětlit a s přehledem reagovat na potřeby klienta a jeho konkrétní situaci. Ocenila jsem, že při plánování předloží více možností jak požadavek řešit, a vy máte sami volbu vybrat si,co je pro vás nejlepší. S jeho pomocí i přístupem k řešení jsem opravdu spokojená.",
    name: "Pavla Kucerova",
    link: "https://share.google/lRTfcLgEGJbjB2Gzo",
    rating: 5,
    source: "google",
  },
    {
    quote: "Davida můžu jednoznačně doporučit. Má lidský a otevřený přístup, vše vysvětluje srozumitelně a bez nátlaku. Jedná férově, zajímá se o reálné potřeby klienta a nehledá rychlý prodej, ale dlouhodobé řešení. Je znát, že mu nejde jen o čísla, ale hlavně o lidi. Spolupráce s ním je příjemná a dává smysl.",
    name: "Sabina Palkovičová",
    link: "https://share.google/ndVk9fUR9Wp0TBfOt",
    rating: 5,
    source: "google",
  },
];

const allTestimonials = [...leftColumn, ...rightColumn];

type StatItem = {
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
};

const stats: StatItem[] = [
  { value: 5, suffix: "+", label: "Let zkušeností" },
  { value: 200, suffix: "+", label: "Spokojených klientů" },
  { value: 5, decimals: 1, label: "Průměrné hodnocení" },
  { value: 96, suffix: "%", label: "pokračuje ve spolupráci" },
];

const trustTags = [
  { label: "Lidský přístup", count: 48 },
  { label: "Jasné kroky", count: 36 },
  { label: "Bez nátlaku", count: 29 },
  { label: "Rychlá reakce", count: 21 },
  { label: "Srozumitelné rady", count: 33 },
  { label: "Dlouhodobá podpora", count: 18 },
];

type Topic = { label: string; icon?: LucideIcon };

const topics: Topic[] = [
  { label: "Finanční plán", icon: Wallet },
  { label: "Pojištění", icon: ShieldCheck },
  { label: "Hypotéka", icon: Home },
  { label: "Investice", icon: LineChart },
  { label: "Rezervy", icon: PiggyBank },
  { label: "Penzijní plán", icon: Shield },
];

const Tag = ({ label, count, showCount = true, icon: Icon }: TagProps) => (
  <div className={s.tag}>
    {Icon ? (
      <Icon size={16} className={s.tagIcon} aria-hidden />
    ) : (
      <span className={s.tagDot} aria-hidden />
    )}
    <span>{label}</span>
    {showCount && typeof count === "number" ? (
      <span className={s.tagCount}>{count}×</span>
    ) : null}
  </div>
);

type TagProps = {
  label: string;
  count?: number;
  showCount?: boolean;
  icon?: LucideIcon;
};

const Testimonials = () => {
  const formatStatValue = (value: number, item: StatItem) => {
    const formatted = item.decimals ? value.toFixed(item.decimals) : `${value}`;
    return `${formatted}${item.suffix ?? ""}`;
  };

  return (
    <section className={s.section}>
      <Container className={s.inner}>
        <div className={s.headingWrapper}>
          <RevealClient as="p" from="bottom" className={s.eyebrow}>
            Skutečné příběhy
          </RevealClient>
          <RevealClient as="h2" from="bottom" className={s.gradientSoft}>
            Jak spolupráci vnímají klienti
          </RevealClient>
          <RevealClient as="p" from="bottom" className={s.sectionDescription}>
            Reálné zkušenosti lidí, kteří řešili stejné otázky jako vy. Co
            fungovalo, co ne – a jaký měli pocit ze spolupráce.
          </RevealClient>
        </div>

        <div className={s.flex}>
          {/* LEFT CONTENT */}
          <RevealClient as="div" from="bottom" className={s.card}>
            <RevealClient as="h3" from="bottom" className={s.cardHeading}>
              Důvěřuje mi více než 200 klientů
            </RevealClient>

            <RevealClient as="p" from="bottom" className={s.cardBody}>
              Klienti oceňují přehled, klidný přístup a řešení, která dávají
              smysl v běžném životě.
            </RevealClient>

            <RevealClient as="div" from="bottom" className={s.buttonWrapper}>
              <TestimonialsCTAButton className={s.ctaBtn}>
                Probrat vaši situaci
              </TestimonialsCTAButton>
            </RevealClient>
          </RevealClient>

          <TestimonialsMarquee
            leftColumn={leftColumn}
            rightColumn={rightColumn}
            allTestimonials={allTestimonials}
          />
        </div>

        {/* STATS */}
        <div className={s.statsBar}>
          {stats.map((item, index) => (
            <RevealClient
              key={item.label}
              as="div"
              from="bottom"
              className={s.stat}
              stagger={0.08}
              index={index}
            >
              <div className={s.statValue}>
                {formatStatValue(item.value, item)}
              </div>
              <div className={s.statLabel}>{item.label}</div>
            </RevealClient>
          ))}
        </div>

        <div className={s.topicContainer}>
          <RevealClient as="p" from="left" className={s.topicLabel}>
            Co nejčastěji řešíme:
          </RevealClient>

          {/* TOPIC PILLS (now using Tag) */}
          <div className={s.topicChips}>
            {topics.map((t, i) => (
              <RevealClient
                key={t.label}
                as="div"
                from="bottom"
                className={s.topicChip}
                stagger={0.08}
                index={i}
              >
                <Tag label={t.label} showCount={false} icon={t.icon} />
              </RevealClient>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Testimonials;
