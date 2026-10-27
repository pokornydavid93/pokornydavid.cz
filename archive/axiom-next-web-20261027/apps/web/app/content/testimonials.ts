import type { ServiceKey } from "./service-labels";

export type ReviewSource = "Google";

export type ReviewSourceTarget = "individual-review" | "profile";

export type ReviewCategoryId =
  | "hypoteky"
  | "pojisteni"
  | "investice"
  | "prijem"
  | "ostatni";

export const reviewCategoryConfig: ReadonlyArray<{
  id: ReviewCategoryId;
  label: string;
  filterLabel: string;
}> = [
  { id: "hypoteky", label: "Hypotéka", filterLabel: "Hypotéky" },
  { id: "pojisteni", label: "Pojištění", filterLabel: "Pojištění" },
  { id: "investice", label: "Investice", filterLabel: "Investice" },
  { id: "prijem", label: "Příjem", filterLabel: "Příjem" },
  { id: "ostatni", label: "Ostatní", filterLabel: "Ostatní" },
];

export const reviewCategoryLabels = Object.fromEntries(
  reviewCategoryConfig.map(({ id, label }) => [id, label]),
) as Record<ReviewCategoryId, string>;

export type Review = {
  id: string;
  clientId: string;
  author: string;
  category: ReviewCategoryId;
  fullText: string;
  excerpt?: string;
  quote: string;
  source: ReviewSource;
  sourceUrl: string;
  sourceTarget?: ReviewSourceTarget;
  rating?: number;
  verified: boolean;
  featured?: boolean;
  featuredPriority?: number;
};

export type Testimonial = Review;

export type HomepageReview = Review & {
  excerpt: string;
  sourceTarget: "individual-review";
};

export type ClientContext = {
  id: string;
  name: string;
  portrait?: {
    src: string;
    srcSet?: string;
    objectPosition?: string;
  };
  serviceKeys: readonly ServiceKey[];
};

export type ReferenceReview = Review & {
  client: ClientContext;
  areas: readonly string[];
};

export type FeaturedTestimonial = HomepageReview & {
  client: ClientContext;
  order: number;
  theme: string;
};

export const CLIENT_CONTEXTS = [
  {
    id: "daniel-baciak",
    name: "Daniel Baciak",
    serviceKeys: ["propertyProtection", "incomeProtection"],
  },
  {
    id: "lukas-kratochvil",
    name: "Lukáš Kratochvíl",
    serviceKeys: [
      "comprehensivePlan",
      "mortgage",
      "investments",
      "incomeProtection",
      "propertyProtection",
    ],
  },
  {
    id: "david-jaros",
    name: "David Jaroš",
    serviceKeys: [
      "comprehensivePlan",
      "investments",
      "incomeProtection",
      "propertyProtection",
    ],
  },
  {
    id: "daniel-dvorak",
    name: "Daniel Dvořák",
    serviceKeys: [
      "comprehensivePlan",
      "investments",
      "incomeProtection",
      "propertyProtection",
    ],
  },
  {
    id: "dominik-vykydal",
    name: "Dominik Vykydal",
    serviceKeys: [
      "comprehensivePlan",
      "investments",
      "incomeProtection",
      "propertyProtection",
    ],
  },
  {
    id: "zuzana-smolikova",
    name: "Zuzana Smolíková",
    serviceKeys: [
      "comprehensivePlan",
      "investments",
      "incomeProtection",
      "propertyProtection",
    ],
  },
  {
    id: "nikola-malerova",
    name: "Nikola Maléřová",
    serviceKeys: [
      "comprehensivePlan",
      "incomeProtection",
      "propertyProtection",
      "investments",
    ],
  },
  {
    id: "lucie-martinkova",
    name: "Lucie Martínková",
    serviceKeys: [
      "comprehensivePlan",
      "mortgage",
      "investments",
      "incomeProtection",
      "propertyProtection",
    ],
  },
  {
    id: "nikola-kvapilova",
    name: "Nikola Kvapilova",
    serviceKeys: [
      "comprehensivePlan",
      "mortgage",
      "investments",
      "incomeProtection",
      "propertyProtection",
    ],
  },
  {
    id: "radek-mader",
    name: "Radek Mader",
    serviceKeys: [
      "comprehensivePlan",
      "investments",
      "incomeProtection",
      "propertyProtection",
    ],
  },
  {
    id: "daniel-prucek",
    name: "Daniel Prucek",
    serviceKeys: ["propertyProtection"],
  },
  {
    id: "eva-husta",
    name: "Eva Hustá",
    serviceKeys: [
      "comprehensivePlan",
      "mortgage",
      "investments",
      "incomeProtection",
      "propertyProtection",
    ],
  },
  {
    id: "martina-heinzova",
    name: "Martina Heinzová",
    serviceKeys: [
      "comprehensivePlan",
      "investments",
      "incomeProtection",
      "propertyProtection",
    ],
  },
  {
    id: "denisa-reznickova",
    name: "Denisa Řezníčková",
    portrait: {
      src: "/images/testimonials/denisa-reznickova-avatar.webp",
      srcSet: "/images/testimonials/denisa-reznickova-avatar-64.webp 64w, /images/testimonials/denisa-reznickova-avatar-96.webp 96w, /images/testimonials/denisa-reznickova-avatar-144.webp 144w, /images/testimonials/denisa-reznickova-avatar.webp 256w",
      objectPosition: "50% 42%",
    },
    serviceKeys: [
      "comprehensivePlan",
      "investments",
      "incomeProtection",
      "propertyProtection",
    ],
  },
  {
    id: "stanislav-dvorak",
    name: "Stanislav Dvořák",
    portrait: {
      src: "/images/testimonials/stanislav-dvorak-avatar.webp",
      srcSet: "/images/testimonials/stanislav-dvorak-avatar-64.webp 64w, /images/testimonials/stanislav-dvorak-avatar-96.webp 96w, /images/testimonials/stanislav-dvorak-avatar-144.webp 144w, /images/testimonials/stanislav-dvorak-avatar.webp 256w",
      objectPosition: "50% 27%",
    },
    serviceKeys: [
      "comprehensivePlan",
      "investments",
      "incomeProtection",
      "propertyProtection",
    ],
  },
  {
    id: "pavla-kucerova",
    name: "Pavla Kučerová",
    portrait: {
      src: "/images/testimonials/pavla-kucerova-avatar.webp",
      srcSet: "/images/testimonials/pavla-kucerova-avatar-64.webp 64w, /images/testimonials/pavla-kucerova-avatar-96.webp 96w, /images/testimonials/pavla-kucerova-avatar-144.webp 144w, /images/testimonials/pavla-kucerova-avatar.webp 256w",
      objectPosition: "50% 31%",
    },
    serviceKeys: [
      "comprehensivePlan",
      "investments",
      "incomeProtection",
      "propertyProtection",
    ],
  },
  {
    id: "sabina-palkovicova",
    name: "Sabina Palkovičová",
    serviceKeys: [
      "comprehensivePlan",
      "investments",
      "incomeProtection",
      "propertyProtection",
    ],
  },
] as const satisfies readonly ClientContext[];

export const FEATURED_TESTIMONIAL_IDS = [
  "denisa-reznickova",
  "stanislav-dvorak",
  "pavla-kucerova",
] as const;

const FEATURED_TESTIMONIAL_PRESENTATION: Record<
  (typeof FEATURED_TESTIMONIAL_IDS)[number],
  { order: number; theme: string }
> = {
  "denisa-reznickova": { order: 1, theme: "DLOUHODOBÝ POHLED" },
  "stanislav-dvorak": { order: 2, theme: "JASNÉ VYSVĚTLENÍ" },
  "pavla-kucerova": { order: 3, theme: "POMOC V PRAXI" },
};

export function normalizeTestimonialWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function assertHomepageReview(
  review: Review,
): asserts review is HomepageReview {
  if (!review.excerpt) {
    throw new Error(`Missing homepage excerpt for review: ${review.id}`);
  }

  if (review.sourceTarget !== "individual-review") {
    throw new Error(`Homepage review must link to an individual review: ${review.id}`);
  }

  const fullText = normalizeTestimonialWhitespace(review.fullText);
  const excerpt = normalizeTestimonialWhitespace(review.excerpt);

  if (!fullText.includes(excerpt)) {
    throw new Error(
      `Homepage excerpt is not a contiguous part of the canonical review: ${review.id}`,
    );
  }
}

export const testimonialLeftColumn: Review[] = [
  {
    id: "daniel-baciak",
    clientId: "daniel-baciak",
    category: "hypoteky",
    fullText:
      "Jsem s tímto člověkem již přes 4 roky svého života a musím popravdě říct, že kdykoliv jsem potřeboval, tak byl ochotný a dokázal mi ve všem dobře poradit. Ať už se jednalo o nastavení pojistek nebo řešení pojistné události. Za mě super lidský přístup a tak to má hlavně vypadat! V dnešní době nikdo nechce, aby vám někdo mazal med kolem huby, a rozhodně ne u financí! Abych byl upřímný, tak to se vám u Davida nestane, protože vždy budete přesně vědět, že máte své finance, zdraví nebo případně životní události pod kontrolou. :) Pokračuj v tom, co děláš, protože to děláš perfektně! DB",
    excerpt:
      "Ať už se jednalo o nastavení pojistek nebo řešení pojistné události. Za mě super lidský přístup a tak to má hlavně vypadat!",
    author: "Daniel Baciak",
    sourceUrl: "https://share.google/m6Nutj17CZUp7bRZP",
    sourceTarget: "individual-review",
    rating: 5,
    source: "Google",
    quote:
      "Vše proběhlo rychle a srozumitelně. Oceňuji lidský přístup a pomoc s celým procesem.",
    verified: true,
  },
  {
    id: "lukas-kratochvil",
    clientId: "lukas-kratochvil",
    category: "investice",
    fullText:
      "Pana Davida Pokorného můžu doporučit všemi deseti. Má lidský a otevřený přístup, vše vysvětluje srozumitelně, aby tomu každý rozuměl. Do ničeho zbytečně netlačí a nepřesvědčuje vás o věcech, které opravdu nechcete. Jedná férově, zajímá se o to, co klient opravdu potřebuje a chce, a hledá správné a vhodné řešení tak, aby splnilo očekávání a dávalo smysl. Je vidět, že ho práce baví a že ji dělá s láskou. Nejde mu o vlastní obohacení, ale o spokojenost vlastních klientů. Spolupráce s ním je suprová.",
    excerpt:
      "Do ničeho zbytečně netlačí a nepřesvědčuje vás o věcech, které opravdu nechcete.",
    author: "Lukáš Kratochvíl",
    sourceUrl: "https://share.google/UvbYaZWNtv7wtQW2y",
    rating: 5,
    source: "Google",
    quote:
      "Skvělé vysvětlení možností a dlouhodobý plán, který dává smysl.",
    verified: true,
  },
  {
    id: "david-jaros",
    clientId: "david-jaros",
    category: "pojisteni",
    fullText:
      "Davida můžu doporučit, když potřebuji aktualizovat např. POV nebo jiné produkty. David to řeší okamžitě s pro mě vyhovujícími podmínkami. Řešili jsme už mnoho smluv i výpovědí a vše zdárně a rychle. Ještě jednou můžu doporučit.",
    excerpt:
      "Řešili jsme už mnoho smluv i výpovědí a vše zdárně a rychle.",
    author: "David Jaroš",
    sourceUrl: "https://share.google/TZbl9U0htF5zFlyr4",
    rating: 5,
    source: "Google",
    quote:
      "David vždy vše trpělivě vysvětlí a doporučí řešení, které opravdu potřebuji.",
    verified: true,
  },
  {
    id: "daniel-dvorak",
    clientId: "daniel-dvorak",
    category: "prijem",
    fullText:
      "Davida můžu jednoznačně doporučit. Má lidský a otevřený přístup, vše vysvětluje srozumitelně, aby tomu každý rozuměl. Jedná férově, zajímá se o reálné potřeby klienta a nehledá rychlý prodej, ale dlouhodobé řešení. Je znát, že mu nejde jen o čísla, ale hlavně o lidi. Spolupráce s ním je příjemná a dává smysl.",
    excerpt:
      "Jedná férově, zajímá se o reálné potřeby klienta a nehledá rychlý prodej, ale dlouhodobé řešení.",
    author: "Daniel Dvořák",
    sourceUrl: "https://share.google/inOM80tZ7IHvChmif",
    rating: 5,
    source: "Google",
    quote:
      "Pomohl mi nastavit ochranu příjmu a konečně mám klid, že jsem připravený.",
    verified: true,
  },
  {
    id: "dominik-vykydal",
    clientId: "dominik-vykydal",
    category: "ostatni",
    fullText:
      "Spolupráce s finančním poradcem byla velmi přínosná. Vše vysvětlil srozumitelně, jednal férově a vždy vycházel z mých potřeb, ne z vlastního zájmu. Je ochotný hledat dlouhodobě nejlepší řešení. Díky němu mám ve svých financích a produktech jasno.",
    excerpt:
      "Vše vysvětlil srozumitelně, jednal férově a vždy vycházel z mých potřeb, ne z vlastního zájmu.",
    author: "Dominik Vykydal",
    sourceUrl: "https://share.google/35DLzl3VlK1kH9LIB",
    sourceTarget: "individual-review",
    rating: 5,
    source: "Google",
    quote:
      "Vše bylo férové, jasné a postavené na tom, co opravdu potřebuji.",
    verified: true,
  },
  {
    id: "zuzana-smolikova",
    clientId: "zuzana-smolikova",
    category: "investice",
    fullText:
      "Spolupráce na pohodu. Vše mi bylo normálně a lidsky vysvětleno, bez složitých výrazů a zbytečného tlačení do něčeho, co bych nechtěla. Měla jsem pocit, že mu jde hlavně o to, aby mi to dávalo smysl a fungovalo dlouhodobě. Příjemná a rychlá komunikace, ochota pomoct, když něčemu nerozumím. Jsem ráda, že jsem našla finančního poradce, který se nestará jen o svou kapsu. Určitě doporučuji.",
    excerpt:
      "Vše mi bylo normálně a lidsky vysvětleno, bez složitých výrazů a zbytečného tlačení do něčeho, co bych nechtěla.",
    author: "Zuzana Smolíková",
    sourceUrl: "https://share.google/bIpQxPDkvei2tPzhj",
    sourceTarget: "individual-review",
    rating: 5,
    source: "Google",
    quote:
      "Spolupráce na pohodu. Vše mi bylo vysvětleno lidsky a s citem pro moje jistější rozhodnutí.",
    verified: true,
  },
  {
    id: "nikola-malerova",
    clientId: "nikola-malerova",
    category: "hypoteky",
    fullText:
      "Hledala jsem někoho, kdo mi vysvětlí a poradí, jakou pojistku si dát. Našla jsem pana Pokorného. Hned první volání bylo úžasné a schůzka ještě lepší. Pan Pokorný dokáže poradit a vysvětlit, proč by to tak mělo být, proč zase toto není dobré. Už jsem jeho klientka několik let a můžu ho jen doporučit.",
    excerpt:
      "Pan Pokorný dokáže poradit a vysvětlit, proč by to tak mělo být, proč zase toto není dobré.",
    author: "Nikola Maléřová",
    sourceUrl: "https://share.google/sWU1g4kfIK29D3gXN",
    rating: 5,
    source: "Google",
    quote: "Výborná komunikace a skvělý výsledek. Doporučuji každému.",
    verified: true,
  },
  {
    id: "lucie-martinkova",
    clientId: "lucie-martinkova",
    category: "pojisteni",
    fullText:
      "Výborný poradce, svou práci odvádí dokonale. Má lidský přístup, vše dokáže vysvětlit tak, aby to pochopil každý. Jsem jeho klientkou už nějakou dobu, pokaždé mi dobře poradil. Vím, že když se něco stane, tak že se na něj můžu obrátit a nemusím se bát. Můžu jen doporučit ❤️",
    excerpt:
      "Má lidský přístup, vše dokáže vysvětlit tak, aby to pochopil každý.",
    author: "Lucie Martínková",
    sourceUrl: "https://share.google/nfCXeS76QASdPCC9V",
    rating: 5,
    source: "Google",
    quote:
      "Vždy dobře poradí a dokáže vysvětlit věci tak, aby dávaly smysl.",
    verified: true,
  },
];

export const testimonialRightColumn: Review[] = [
  {
    id: "nikola-kvapilova",
    clientId: "nikola-kvapilova",
    category: "prijem",
    fullText:
      "Jestli hledáte lidský a přátelský přístup, tak je pro vás David super volba. Nikdy jsem se nebála zeptat se na cokoli a v rychlosti mi bylo vše krásně a hlavně srozumitelně vysvětleno. Byl vždy k dispozici, když byla potřeba, dotáhne s vámi vše od začátku až do konce. Můžu jen doporučit. 🙏🏼",
    excerpt:
      "Byl vždy k dispozici, když byla potřeba, dotáhne s vámi vše od začátku až do konce.",
    author: "Nikola Kvapilova",
    sourceUrl: "https://share.google/BKLOQO8KWtFp101nK",
    sourceTarget: "individual-review",
    rating: 5,
    source: "Google",
    quote:
      "Nebála jsem se zeptat na cokoliv. Vše bylo rychle a srozumitelně vysvětleno.",
    verified: true,
  },
  {
    id: "radek-mader",
    clientId: "radek-mader",
    category: "ostatni",
    fullText:
      "Velký profesionál. Dost mile mě překvapil, kolik toho o financích ví a zná. Zatím nebylo nic, co by nedokázal vyřešit. Moc doporučuji.",
    excerpt:
      "Dost mile mě překvapil, kolik toho o financích ví a zná.",
    author: "Radek Mader",
    sourceUrl: "https://share.google/O0QbaE4dskUXj3IVv",
    rating: 5,
    source: "Google",
    quote: "Velký profesionál, který se ve financích opravdu vyzná.",
    verified: true,
  },
  {
    id: "daniel-prucek",
    clientId: "daniel-prucek",
    category: "pojisteni",
    fullText:
      "Dejv mi spravuje pojistky na auta a já nemusím vůbec nic řešit. O všechno se stará on, hlídá výročí, upozorňuje na změny, posílá výpovědi atd. Prostě paráda.",
    excerpt:
      "O všechno se stará on, hlídá výročí, upozorňuje na změny, posílá výpovědi atd. Prostě paráda.",
    author: "Daniel Prucek",
    sourceUrl: "https://share.google/1ckJaWmrmSJyGdfQw",
    sourceTarget: "individual-review",
    rating: 5,
    source: "Google",
    quote:
      "O pojistky se stará průběžně a já nemusím hlídat výročí ani změny.",
    verified: true,
  },
  {
    id: "eva-husta",
    clientId: "eva-husta",
    category: "investice",
    fullText:
      "Dobrý kamarád, který poradí v nouzi. Bez něj jsem nevěděla, jak dobře investovat 💰. Poradí s vyhledáváním lepšího pojištění na cokoliv. 🚗🏡",
    excerpt:
      "Poradí s vyhledáváním lepšího pojištění na cokoliv.",
    author: "Eva Hustá",
    sourceUrl: "https://share.google/mBOCHNrSKJZhbP5PY",
    rating: 5,
    source: "Google",
    quote:
      "Pomohl mi s pojištěním i investicemi, když jsem nevěděla, kde začít.",
    verified: true,
  },
  {
    id: "martina-heinzova",
    clientId: "martina-heinzova",
    category: "ostatni",
    fullText:
      "Jsem velmi spokojená. David je výborný poradce, který své práci rozumí perfektně. Vždy se na něj mohu spolehnout a s důvěrou se na něj obrátit, vždy mi pomůže a dobře poradí. Nebojím se ho doporučit rodině a přátelům, vím, že i oni budou moc spokojení. Po dlouhých letech mám konečně finančního poradce, který myslí především na klienty a ne jen na sebe. Moc mu děkuji.",
    excerpt:
      "Vždy se na něj mohu spolehnout a s důvěrou se na něj obrátit, vždy mi pomůže a dobře poradí.",
    author: "Martina Heinzová",
    sourceUrl: "https://share.google/JXP1KVVtrcNZJoQ7a",
    rating: 5,
    source: "Google",
    quote:
      "Mohu se na něj spolehnout a s důvěrou se ozvat, kdykoliv potřebuji poradit.",
    verified: true,
  },
  {
    id: "denisa-reznickova",
    clientId: "denisa-reznickova",
    category: "investice",
    fullText:
      "Se spoluprací s finančním poradcem jsem velmi spokojená. Od prvního setkání byl přístup profesionální, ale zároveň lidský a přátelský. Vše mi bylo vysvětleno srozumitelně a v klidu, takže jsem přesně věděla, co a proč řešíme. Oceňuji individuální přístup, dlouhodobé myšlení a skutečný zájem o mou finanční situaci. Díky této spolupráci mám větší jistotu a přehled ve svých financích. Doporučuji každému, kdo chce mít finance pod kontrolou.",
    excerpt:
      "Oceňuji individuální přístup, dlouhodobé myšlení a skutečný zájem o mou finanční situaci.",
    author: "Denisa Řezníčková",
    sourceUrl: "https://share.google/w0usRR2Gu4l37n3to",
    sourceTarget: "individual-review",
    rating: 5,
    source: "Google",
    quote:
      "Vše mi bylo vysvětleno srozumitelně a v klidu. Přesně jsem věděla, co a proč řešíme.",
    verified: true,
  },
  {
    id: "stanislav-dvorak",
    clientId: "stanislav-dvorak",
    category: "pojisteni",
    fullText:
      "Skvělý finanční poradce a parťák, který mi srozumitelně vysvětlil věci, ve kterých jsem měl zmatek, a navrhl reálné řešení bez zbytečného kecání. Založil mi životní pojištění, pojištění auta a různé investiční plány a dále se o ně stará, abych já nemusel. Má profesionální a lidský přístup, který můžu jen doporučit.",
    excerpt:
      "Skvělý finanční poradce a parťák, který mi srozumitelně vysvětlil věci, ve kterých jsem měl zmatek, a navrhl reálné řešení bez zbytečného kecání.",
    author: "Stanislav Dvořák",
    sourceUrl: "https://share.google/C1vyXNU8y4oSRQJrW",
    sourceTarget: "individual-review",
    rating: 5,
    source: "Google",
    quote:
      "Srozumitelně vysvětlil věci, ve kterých jsem měl zmatek, a navrhl reálné řešení.",
    verified: true,
  },
  {
    id: "pavla-kucerova",
    clientId: "pavla-kucerova",
    category: "hypoteky",
    fullText:
      "Davida můžu stoprocentně doporučit. Umí srozumitelným způsobem vše vysvětlit a s přehledem reagovat na potřeby klienta a jeho konkrétní situaci. Ocenila jsem, že při plánování předloží více možností jak požadavek řešit, a vy máte sami volbu vybrat si,co je pro vás nejlepší. S jeho pomocí i přístupem k řešení jsem opravdu spokojená.",
    excerpt:
      "Umí srozumitelným způsobem vše vysvětlit a s přehledem reagovat na potřeby klienta a jeho konkrétní situaci.",
    author: "Pavla Kučerová",
    sourceUrl: "https://share.google/lRTfcLgEGJbjB2Gzo",
    sourceTarget: "individual-review",
    rating: 5,
    source: "Google",
    quote:
      "Předložil více možností řešení a nechal mi prostor vybrat si tu nejlepší.",
    verified: true,
    featured: true,
    featuredPriority: 1,
  },
  {
    id: "sabina-palkovicova",
    clientId: "sabina-palkovicova",
    category: "prijem",
    fullText:
      "Davida můžu jednoznačně doporučit. Má lidský a otevřený přístup, vše vysvětluje srozumitelně a bez nátlaku. Jedná férově, zajímá se o reálné potřeby klienta a nehledá rychlý prodej, ale dlouhodobé řešení. Je znát, že mu nejde jen o čísla, ale hlavně o lidi. Spolupráce s ním je příjemná a dává smysl.",
    excerpt:
      "Má lidský a otevřený přístup, vše vysvětluje srozumitelně a bez nátlaku.",
    author: "Sabina Palkovičová",
    sourceUrl: "https://share.google/ndVk9fUR9Wp0TBfOt",
    rating: 5,
    source: "Google",
    quote:
      "Lidský přístup bez nátlaku a dlouhodobé řešení místo rychlého prodeje.",
    verified: true,
  },
];

export const testimonialReviews: Review[] = [
  ...testimonialLeftColumn,
  ...testimonialRightColumn,
];

const testimonialsById = new Map(
  testimonialReviews.map((testimonial) => [testimonial.id, testimonial]),
);
const clientContextsById = new Map<string, ClientContext>(
  CLIENT_CONTEXTS.map((client) => [client.id, client]),
);

const clientAreaLabels: Record<ServiceKey, string> = {
  comprehensivePlan: "Komplexní finanční plán",
  mortgage: "Hypotéka",
  investments: "Investice",
  incomeProtection: "Zajištění příjmů",
  propertyProtection: "Ochrana majetku",
};

const incomeProtectionLabelOverrides = new Set([
  "daniel-baciak",
  "nikola-malerova",
]);

function getClientAreaLabels(client: ClientContext): readonly string[] {
  return client.serviceKeys.map((serviceKey) =>
    serviceKey === "incomeProtection" &&
    incomeProtectionLabelOverrides.has(client.id)
      ? "Ochrana příjmu"
      : clientAreaLabels[serviceKey],
  );
}

function attachClientContext(review: Review): ReferenceReview {
  const client = clientContextsById.get(review.clientId);

  if (!client) {
    throw new Error(`Missing client context for testimonial: ${review.id}`);
  }

  return {
    ...review,
    client,
    areas: getClientAreaLabels(client),
  };
}

export const featuredTestimonials: readonly FeaturedTestimonial[] =
  FEATURED_TESTIMONIAL_IDS.map((testimonialId) => {
    const testimonial = testimonialsById.get(testimonialId);
    const presentation = FEATURED_TESTIMONIAL_PRESENTATION[testimonialId];

    if (!testimonial) {
      throw new Error(`Unknown featured testimonial: ${testimonialId}`);
    }

    assertHomepageReview(testimonial);

    const client = clientContextsById.get(testimonial.clientId);

    if (!client) {
      throw new Error(
        `Missing client context for testimonial: ${testimonial.id}`,
      );
    }

    return {
      ...testimonial,
      client,
      ...presentation,
    };
  }).sort((left, right) => left.order - right.order);

export const testimonialReferenceReviews: readonly ReferenceReview[] =
  testimonialReviews.map(attachClientContext);

const verifiedReviews = testimonialReferenceReviews.filter(
  (review) => review.verified,
);
const ratedReviews = verifiedReviews.filter(
  (review): review is ReferenceReview & { rating: number } =>
    review.rating !== undefined,
);
const averageRating =
  ratedReviews.reduce((total, review) => total + review.rating, 0) /
  Math.max(ratedReviews.length, 1);
const representedServiceKeys = new Set(
  verifiedReviews.flatMap((review) => review.client.serviceKeys),
);

export const testimonialGoogleProfile = Object.freeze({
  reviewCount: 20,
  verifiedAt: "2026-09-17",
});

export const testimonialTrustMetrics = [
  {
    value: String(testimonialGoogleProfile.reviewCount),
    label: "ověřených Google recenzí",
  },
  {
    value: averageRating.toLocaleString("cs-CZ", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
    label: "průměrné hodnocení",
  },
  {
    value: String(representedServiceKeys.size),
    label: "zastoupených oblastí",
  },
];

export function getReviewById(id: string): Review {
  const review = testimonialReviews.find((item) => item.id === id);
  if (!review) throw new Error(`Unknown review: ${id}`);
  return review;
}

export function getHomepageReviewById(id: string): HomepageReview {
  const review = getReviewById(id);
  assertHomepageReview(review);
  return review;
}

export const testimonialFeaturedReview = getReviewById("denisa-reznickova");

export const testimonialReferenceFeaturedReview =
  testimonialReferenceReviews
    .filter((review) => review.featured)
    .sort(
      (left, right) =>
        (left.featuredPriority ?? Number.MAX_SAFE_INTEGER) -
        (right.featuredPriority ?? Number.MAX_SAFE_INTEGER),
    )[0] ?? attachClientContext(getReviewById("pavla-kucerova"));
