import type {
  CompositionContract,
  CompositionExample,
  CompositionFixtureProfile,
  CompositionSlot,
  SurfaceRoleId,
} from "./registry";
import s from "../designLanguageApp.module.css";

export type CompositionVisualContext = {
  id: "forest" | "card" | "paper" | "action";
  label: string;
  surfaceRole: SurfaceRoleId;
  tone: "dark" | "light" | "action";
  description: string;
};

export const compositionVisualContexts = [
  {
    id: "forest",
    label: "Dark forest",
    surfaceRole: "surface.section.dark" as SurfaceRoleId,
    tone: "dark",
    description: "Section canvas with inherited dark text roles.",
  },
  {
    id: "card",
    label: "Dark card",
    surfaceRole: "surface.card.dark" as SurfaceRoleId,
    tone: "dark",
    description: "Elevated region inside a dark page.",
  },
  {
    id: "paper",
    label: "Paper island",
    surfaceRole: "surface.paper" as SurfaceRoleId,
    tone: "light",
    description: "Editorial light surface with inverse text aliases.",
  },
  {
    id: "action",
    label: "Action surface",
    surfaceRole: "surface.action" as SurfaceRoleId,
    tone: "action",
    description: "Accent surface for conversion moments.",
  },
] as const satisfies readonly CompositionVisualContext[];

export function getDefaultVisualContextId(example?: CompositionExample) {
  if (example?.surfaceRole === "surface.action") return "action";
  if (example?.surfaceRole === "surface.paper") return "paper";
  if (example?.surfaceRole === "surface.card.dark") return "card";
  return "forest";
}

export function getAllowedVisualContexts(composition: CompositionContract) {
  const allowedRoles = new Set(composition.surfaces.allowed);
  const contexts = compositionVisualContexts.filter((context) =>
    allowedRoles.has(context.surfaceRole)
  );

  return contexts.length > 0 ? contexts : [compositionVisualContexts[0]];
}

function formatSlotLabel(slotId: string) {
  return slotId
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("-", " ")
    .toLowerCase();
}

function getSlotFallback(
  fixture: CompositionFixtureProfile,
  slot: CompositionSlot
) {
  const roleIds = slot.acceptsCapabilityRoles.map(String);
  const slotId = String(slot.id).toLowerCase();

  if (slotId.includes("heading") || roleIds.includes("role.text.heading")) {
    return fixture.headline;
  }

  if (
    slotId.includes("lead") ||
    roleIds.includes("role.text.lead") ||
    roleIds.includes("role.text.body")
  ) {
    return fixture.lead;
  }

  return null;
}

function getSlotItems(
  fixture: CompositionFixtureProfile,
  slot: CompositionSlot
) {
  const value = fixture.slots[String(slot.id)] ?? getSlotFallback(fixture, slot);

  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value.map(String) : [String(value)];
}

function getSlotRenderKind(slot: CompositionSlot) {
  const slotId = String(slot.id).toLowerCase();
  const roleIds = slot.acceptsCapabilityRoles.map(String);

  if (slotId.includes("action") || roleIds.some((role) => role.includes(".action."))) {
    return "action";
  }

  if (
    slotId.includes("field") ||
    slotId.includes("consent") ||
    roleIds.some((role) => role.includes(".form."))
  ) {
    return "form";
  }

  if (
    slotId.includes("items") ||
    slotId.includes("steps") ||
    slotId.includes("evidence") ||
    roleIds.some((role) => role.includes(".collection.") || role.includes(".proof."))
  ) {
    return "collection";
  }

  if (slotId.includes("media") || roleIds.some((role) => role.includes(".media."))) {
    return "media";
  }

  return "copy";
}

function SpecimenSlotContent({
  items,
  kind,
}: {
  items: string[];
  kind: ReturnType<typeof getSlotRenderKind>;
}) {
  if (items.length === 0) {
    return <p className={s.specimenMissingSlot}>Optional slot collapsed</p>;
  }

  if (kind === "action") {
    return (
      <div className={s.specimenActionRow}>
        {items.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className={
              index === 0 ? s.specimenPrimaryAction : s.specimenSecondaryAction
            }
          >
            {item}
          </span>
        ))}
      </div>
    );
  }

  if (kind === "form") {
    return (
      <div className={s.specimenFieldStack}>
        {items.map((item, index) => (
          <label key={`${item}-${index}`}>
            <span>{item}</span>
            <input value="" readOnly aria-label={item} />
          </label>
        ))}
      </div>
    );
  }

  if (kind === "media") {
    return (
      <div className={s.specimenMediaFrame}>
        <span>{items[0]}</span>
      </div>
    );
  }

  if (kind === "collection") {
    return (
      <div className={s.specimenCollectionGrid}>
        {items.map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
      </div>
    );
  }

  return (
    <div className={s.specimenCopyStack}>
      {items.map((item, index) => (
        <p key={`${item}-${index}`}>{item}</p>
      ))}
    </div>
  );
}

export default function CompositionSpecimenPreview({
  composition,
  example,
  fixture,
  context,
}: {
  composition: CompositionContract;
  example: CompositionExample;
  fixture: CompositionFixtureProfile | undefined;
  context: CompositionVisualContext;
}) {
  if (!fixture) {
    return (
      <div className={s.specimenEmptyState}>
        Fixture profile is missing for <code>{example.fixtureId}</code>.
      </div>
    );
  }
  const activeState = example.stateId
    ? composition.states.find((state) => state.id === example.stateId)
    : undefined;

  return (
    <article
      className={s.specimenFrame}
      data-testid="composition-specimen-frame"
      data-composition-family={composition.meta.family}
      data-specimen-mode={example.layoutMode}
      data-specimen-profile={example.contentProfile}
      data-surface-tone={context.tone}
    >
      <header className={s.specimenFrameHeader}>
        <p>{composition.meta.name}</p>
        <h3>{fixture.headline}</h3>
        <span>{fixture.lead}</span>
      </header>

      <div className={s.specimenMetaBar}>
        <span>{example.specimenKind}</span>
        <span>{example.layoutMode}</span>
        <span>{context.label}</span>
        <span>{example.motionPreference} motion</span>
      </div>

      {example.motionPreference === "reduced" ? (
        <p className={s.specimenStaticNotice}>
          Static fallback: content is available in source order before any motion.
        </p>
      ) : null}

      {activeState ? (
        <p className={s.specimenStaticNotice} aria-live="polite">
          {activeState.statusAnnouncement ??
            `State preview: ${activeState.kind}`}
        </p>
      ) : null}

      <div className={s.specimenSlotGrid}>
        {composition.anatomy.sourceOrder.map((slotId) => {
          const slot = composition.anatomy.slots.find(
            (item) => item.id === slotId
          );
          if (!slot) return null;

          const items = getSlotItems(fixture, slot);
          const kind = getSlotRenderKind(slot);

          return (
            <section
              key={slot.id}
              className={s.specimenSlot}
              data-testid="composition-specimen-slot"
              data-slot-kind={kind}
              data-slot-required={slot.baseCardinality.min > 0}
            >
              <div>
                <strong>{formatSlotLabel(String(slot.id))}</strong>
                <small>
                  {slot.baseCardinality.min > 0 ? "required" : "optional"}
                </small>
              </div>
              <SpecimenSlotContent items={items} kind={kind} />
            </section>
          );
        })}
      </div>

      <footer className={s.specimenAssertionRail}>
        {fixture.stressors.slice(0, 2).map((stress) => (
          <span key={stress}>{stress}</span>
        ))}
      </footer>
    </article>
  );
}
