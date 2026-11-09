export function ActivityArtwork({title,large=false}:{title:string;large?:boolean}){
 const tone=Array.from(title).reduce((sum,char)=>sum+char.codePointAt(0)!,0)%3;
 return <div className={'activity-art art-tone-'+tone+(large?' art-large':'')} aria-hidden="true">
  <div className="art-sun"/><div className="art-orbit"/><div className="art-hill art-hill-back"/><div className="art-hill art-hill-front"/>
  <svg className="art-sprig" viewBox="0 0 120 160" fill="none"><path d="M54 150C73 105 42 70 68 15" stroke="currentColor" strokeWidth="3"/><path d="M62 39C29 43 24 14 29 5C54 6 69 19 62 39ZM57 78C86 76 104 57 101 39C79 40 59 53 57 78ZM57 111C25 113 13 88 15 75C42 76 58 92 57 111Z" fill="currentColor"/></svg>
  <span className="art-monogram">{Array.from(title.trim())[0]?.toLocaleUpperCase('pt-BR')??'P'}</span>
  <span className="art-caption">Gente que faz acontecer</span>
 </div>;
}
