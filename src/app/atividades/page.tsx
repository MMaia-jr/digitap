import {publicPublisher} from '../../lib/activities/publication';
import Link from 'next/link';
import {publicActivities} from '../../lib/queries/public.server';
export const dynamic='force-dynamic';
export default async function PublicActivities(){
 let activities;try{activities=await publicActivities.list();}catch{return <section className="card"><h1>Atividades publicadas</h1><p>Consulta indisponível. Tente novamente mais tarde.</p></section>;}
 return <section className="card"><h1>Atividades publicadas</h1>{activities.length?<ul>{activities.map(a=><li key={a.id}><Link href={'/atividade/'+a.id}>{a.titulo}</Link><p>{publicPublisher(a).nome_publico}</p><p>Programação: {a.estado_programacao}</p></li>)}</ul>:<p>Nenhuma atividade publicada disponível.</p>}</section>;
}
