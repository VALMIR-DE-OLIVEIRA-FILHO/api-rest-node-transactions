import { FastifyInstance } from 'fastify'
import {check, z} from 'zod'
import { knex } from '../database'
import crypto, { randomUUID } from 'node:crypto'
import { checkSessionIdExists } from '../middleware/check-session-id-exists'


//cookies <-> formas da gente manter contexto entre requisições

// unitários: unidade da sua aplicação
// integração: comunicação entre duas ou mais unidade
// e2e - ponta a ponta: simulam umm usúario operando a nossa aplicação

// fornt-end: abre a página de login, digite o texto valmir@gmail.com.br no campo Id email, clique no botão
// back-end: chamadas HTTP, websockets

//piramide de testes: E2E(não depende de nenhuma tecnologia, não dependem de arquitetura)
// 2000 teste -> teste E2E => 16min
export async function transactionsRoutes(app: FastifyInstance){
    app.addHook('preHandler', async(request, response)=>{
        console.log(`[${request.method}] ${request.url}`)
    })

    app.get('/', 
        {preHandler : [checkSessionIdExists]},
        
        async (request)=>{

            const {sessionId} = request.cookies
            const transactions = await knex('transactions').where('session_id', sessionId)

            return {
                transactions,
            }
    })
    app.get('/:id',
        {preHandler : [checkSessionIdExists]},
         async(request)=>{
        const getTransactionParamsSchema = z.object({
            id: z.string().uuid()
        })

        const {id} = getTransactionParamsSchema.parse(request.params)
         const {sessionId} = request.cookies
        
        const transaction = await knex('transactions').
        where(
            {session_id: sessionId,
             id,
            } 
        )
        .first()

        return {
            transaction
        }

    })
    app.get( '/sumary',
        {preHandler : [checkSessionIdExists]},
         async (request)=>{

             const {sessionId} = request.cookies
        const sumary = await knex('transactions').sum('amount', {
            as : 'amount'
        }).where('session_id',sessionId).
        first()
        
        return {
            sumary
        }
    })
    app.post('/', async (request, response) => {

        const createTransactionBodySchema= z.object({
            title: z.string(),
            amount: z.number(),
            type: z.enum(['credit','debit'])
        })

        const {title, amount, type} = createTransactionBodySchema.parse(request.body)

        let  sessionId = request.cookies.sessionId

        if (!sessionId) {
            sessionId = randomUUID()
            
            response.setCookie('sessionId', sessionId, {
                path :'/',
                maxAge: 60 * 60 *24 * 7,// 7 days
            })
        }
        
        await knex('transactions').insert({
            id: crypto.randomUUID(),
            title,
            amount: type === 'credit'? amount : amount * -1,
            session_id: sessionId,
         
        })
      
        return response.status(201).send()
      
    })
}