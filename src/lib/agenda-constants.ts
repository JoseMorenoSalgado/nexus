export const AGENDA_TYPES=[
 {value:"visita",label:"Visita al inmueble"},
 {value:"llamada",label:"Llamada de seguimiento"},
 {value:"reunion",label:"Reunión comercial"}
] as const;
export const AGENDA_STATUSES=[
 {value:"pendiente",label:"Pendiente"},
 {value:"realizada",label:"Realizada"},
 {value:"cancelada",label:"Cancelada"}
] as const;
export const AGENDA_DURATIONS=[15,30,45,60,90,120,180] as const;
export type AgendaType=typeof AGENDA_TYPES[number]["value"];
export type AgendaStatus=typeof AGENDA_STATUSES[number]["value"];
