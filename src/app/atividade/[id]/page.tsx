import {notFound} from 'next/navigation';
import Link from 'next/link';
import {publicActivities} from '../../../lib/queries/public.server';
import {ActivityError} from '../../../lib/activities/domain';
export const dynamic='force-dynamic';
export default async function PublicActivity({params}:{params:Promise<{id:string}>}){
 let activity;try{activity=await publicActivities.get((await params).id);}catch(error){if(error instanceof ActivityError&&error.status===404)notFound();return <section className="card"><h1>Atividade indisponível</h1><p>Não foi possível consultar a atividade agora.</p></section>;}
 return <article className="card"><Link href="/atividades">Atividades publicadas</Link><h1>{activity.titulo}</h1><p>Por {activity.organizacao.nome_publico}</p><p>{activity.descricao}</p><dl><dt>Data e horário (America/Sao_Paulo)</dt><dd>{new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(activity.inicio_previsto))}</dd><dt>Programação</dt><dd>{activity.estado_programacao}</dd><dt>Orientação de acesso</dt><dd>{activity.orientacao_acesso}</dd></dl>{activity.referencia_oficial&&<a href={activity.referencia_oficial} rel="noreferrer noopener">Link oficial</a>}</article>;
}
