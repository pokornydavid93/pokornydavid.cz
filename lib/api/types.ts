export type LeadTopic =
  | "Hypotéka & bydlení"
  | "Finanční plán"
  | "Investice a spoření"
  | "Zajištění příjmu"
  | "Pojištění vozidla"
  | "Reality (prodej nemovitosti)"
  | "Energie a úspory"
  | "Ochrana majetku"
  | "Pojištění odpovědnosti"
  | "Spotřebitelské a podnikatelské úvěry"
  | "Jiná situace"

export type LeadFormPayload = {
  name: string
  email: string
  phone?: string
  topic?: LeadTopic
  message?: string
}
