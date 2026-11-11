export interface ConfirmationCommand {tipo:'apoio'|'intencao';whatsapp:string|null;acompanhantes:number;mostrar_nome:boolean}
export interface OwnConfirmation {tipo:'apoio'|'intencao';acompanhantes:number;mostrar_nome:boolean}
export interface ConfirmationCounts {apoios:number;intencoes:number}
export interface PublicParticipationSummary extends ConfirmationCounts {nomes_publicos:string[];aberta:boolean}
export interface ParticipationState {authenticated:boolean;resumo:PublicParticipationSummary;minha_confirmacao:OwnConfirmation|null}
