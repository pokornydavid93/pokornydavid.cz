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
export function GoalsVelocityMarquee() {
  return (
    <div
      className="relative w-full overflow-hidden py-14"
      style={{
        background: "var(--surface-section-dark)",
        height: 200,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 222,
        boxShadow: "none",
      }}
    >
      <ScrollVelocityContainer
        className="
          text-[clamp(2.5rem,5vw,5rem)]
          font-semibold
          tracking-[-0.02em]
        "
        style={{
          color: "var(--text-emphasis)",
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

    </div>
  );
}
