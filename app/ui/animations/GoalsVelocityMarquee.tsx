import {
  ScrollVelocityContainer,
  ScrollVelocityRow,
} from "@/magic/ui/scroll-based-velocity";
import LogoMark from "@/app/svgr/LogoMark";

const TOP_ITEMS = [
  "Vlastní bydlení",
  "Studium dětí",
  "Zajištění příjmu",
  "Ochrana majetku",
  "Rezervy a jistota",
  "Důchod a budoucnost",
  "Rodina a zodpovědnost",
];



const BOTTOM_ITEMS = [];

export function GoalsVelocityMarquee() {
  return (
    <div
      className="relative w-full overflow-hidden py-14"
      style={{
        background:
          "radial-gradient(264% 101% at 50% 50%, rgba(24, 88, 70, 0.95) 0%, rgb(12, 40, 32) 60%)",
        height: 200,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ScrollVelocityContainer
        className="
          text-[clamp(2.5rem,5vw,5rem)]
          font-semibold
          tracking-[-0.02em]
        "
        style={{
          color: "rgba(var(--brand-tertiary-rgb), 0.95)",
          fontSize: "100px",
        }}
      >
        <ScrollVelocityRow
          baseVelocity={1}
          direction={1}
          separator={<LogoMark />}
          itemGapPx={64}
          scrollLinked={false}
        >
          {TOP_ITEMS.map((item) => (
            <span key={item} className="whitespace-nowrap">
              {item}
            </span>
          ))}
        </ScrollVelocityRow>
      </ScrollVelocityContainer>

      {/* gradient masky na okrajích */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[#0c2820] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-[#0c2820] to-transparent" />
    </div>
  );
}
