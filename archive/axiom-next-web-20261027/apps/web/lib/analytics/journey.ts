/** Closed analytics vocabulary. Never pass text, inputs or DOM values into it. */
export const JOURNEY_STEPS = ["income", "budget", "reserve", "result", "contact", "page"] as const;
export const JOURNEY_SECTIONS = ["intro", "calculator", "result", "consultation", "testimonial", "method", "footer", "contact", "header", "main"] as const;
export const JOURNEY_PLACEMENTS = ["hero", "calculator", "result_top", "consultation", "result_email", "adjustments", "contact", "header", "testimonial", "footer", "main"] as const;
export const JOURNEY_CTAS = ["callback_open", "email_result_open", "step_next", "step_back", "result_show", "edit_all", "adjust_open", "adjust_apply", "contact_close", "contact_submit", "main_site", "review_source", "advisor_registry", "footer_articles", "footer_overview", "footer_contact", "home_primary", "home_situation", "direct_contact", "overview_open"] as const;
export type JourneyStep = typeof JOURNEY_STEPS[number];
export type JourneySection = typeof JOURNEY_SECTIONS[number];
export type JourneyPlacement = typeof JOURNEY_PLACEMENTS[number];
export type JourneyCta = typeof JOURNEY_CTAS[number];
export type JourneyReason = "start" | "interval" | "hidden" | "pagehide" | "step" | "section" | "idle" | "unmount" | "blur";
export const JOURNEY_IDLE_MS = 30_000;
export const JOURNEY_MAX_ACTIVE_MS = 7_200_000;
export const JOURNEY_FLUSH_MS = 15_000;

export class JourneyClock {
  activeMs = 0;
  readonly stepActiveMs: Partial<Record<JourneyStep, number>> = {};
  readonly sectionActiveMs: Partial<Record<JourneySection, number>> = {};
  readonly viewedSteps = new Set<JourneyStep>();
  readonly viewedSections = new Set<JourneySection>();
  scrollDepth = 0;
  step: JourneyStep;
  section: JourneySection;
  private cursor: number;
  private lastActivity: number;
  private visible: boolean;
  private focused: boolean;
  private sectionVisible = false;

  constructor(now: number, step: JourneyStep, visible: boolean, focused: boolean) {
    this.cursor = now;
    this.lastActivity = now;
    this.step = step;
    this.section = step === "page" ? "main" : step === "contact" ? "contact" : step === "result" ? "result" : "calculator";
    this.visible = visible;
    this.focused = focused;
    if (visible && focused) this.viewedSteps.add(step);
  }

  advance(now: number) {
    const end = Math.max(this.cursor, Math.min(now, this.lastActivity + JOURNEY_IDLE_MS));
    const elapsed = this.visible && this.focused ? Math.max(0, Math.min(end - this.cursor, JOURNEY_MAX_ACTIVE_MS - this.activeMs)) : 0;
    this.activeMs += elapsed;
    if (elapsed > 0) {
      this.stepActiveMs[this.step] = (this.stepActiveMs[this.step] ?? 0) + elapsed;
      if (this.sectionVisible) this.sectionActiveMs[this.section] = (this.sectionActiveMs[this.section] ?? 0) + elapsed;
    }
    this.cursor = Math.max(now, this.cursor);
  }

  activity(now: number) {
    this.advance(now);
    this.lastActivity = now;
  }

  attention(now: number, visible: boolean, focused: boolean) {
    this.advance(now);
    const resumed = visible && focused && !(this.visible && this.focused);
    this.visible = visible;
    this.focused = focused;
    if (resumed) this.lastActivity = now;
    if (visible && focused) this.viewedSteps.add(this.step);
  }

  changeStep(now: number, step: JourneyStep) {
    this.advance(now);
    this.step = step;
    if (this.visible && this.focused) this.viewedSteps.add(step);
  }

  sections(now: number, visible: JourneySection[], primary?: JourneySection) {
    this.advance(now);
    if (!this.visible || !this.focused) return;
    for (const section of visible) this.viewedSections.add(section);
    this.sectionVisible = Boolean(primary);
    if (primary) this.section = primary;
  }

  scroll(progress: number) {
    this.scrollDepth = Math.max(this.scrollDepth, Math.floor(Math.max(0, Math.min(1, progress)) * 4) * 25);
  }

  snapshot(now: number) {
    this.advance(now);
    return {
      active_ms: Math.floor(this.activeMs),
      step_active_ms: Object.fromEntries(Object.entries(this.stepActiveMs).map(([key, value]) => [key, Math.floor(value)])),
      section_active_ms: Object.fromEntries(Object.entries(this.sectionActiveMs).map(([key, value]) => [key, Math.floor(value)])),
      viewed_steps: [...this.viewedSteps],
      viewed_sections: [...this.viewedSections],
      scroll_depth: this.scrollDepth,
      last_step: this.step,
      last_section: this.section,
    };
  }
}
