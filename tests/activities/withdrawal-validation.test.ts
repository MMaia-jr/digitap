import {it,expect} from 'vitest';
import {validateWithdrawal} from '../../src/lib/activities/domain';
const command={versao_esperada:1,pedido_id:'40000000-0000-4000-8000-000000000001',motivo:'Motivo fictício da retirada.'};
it('B09: normaliza motivo, aceita somente versão/pedido/motivo',()=>{expect(validateWithdrawal({...command,motivo:'  '+command.motivo+'  '})).toEqual(command);});
it.each(['papel','estado_editorial','organizacao_id','versao_publicada'])('B09: campo privilegiado %s é rejeitado',key=>{expect(()=>validateWithdrawal({...command,[key]:'forjado'})).toThrow(expect.objectContaining({status:400}));});
it.each(['','curto','<script>alert(1)</script>','a'.repeat(1501)])('B09: motivo ausente/HTML/fora dos limites é rejeitado',motivo=>{expect(()=>validateWithdrawal({...command,motivo})).toThrow(expect.objectContaining({status:422}));});
it.each([{...command,pedido_id:'inválido'},{...command,versao_esperada:0},null])('B09: comando inválido não passa na validação',input=>expect(()=>validateWithdrawal(input)).toThrow());
