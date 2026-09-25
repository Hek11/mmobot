const { Client, GatewayIntentBits } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

// Configuración de Supabase con soporte para Node 20
const SUPABASE_URL = 'https://qzmyxhkdljntorpwkrel.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iymmoU6ygywUbpouzV_OLw_W7EZexGc';
const dbClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket }
});

// Configuración de Discord (Reemplaza con tus datos reales)
const TOKEN_DISCORD = process.env.DISCORD_TOKEN;
const CANAL_AION_2 = '1552858734156587018';
const CANAL_THRONE = '1552858766213513216';

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.once('ready', () => {
    console.log(`🤖 Bot encendido y listo como ${client.user.tag}`);
    
    // Revisar eventos cada 60 segundos
    setInterval(verificarEventos, 60000);
});

async function verificarEventos() {
    try {
        const ahora = new Date();
        
        // Buscamos eventos que aún NO hayan sido notificados
        const { data: eventos, error } = await dbClient
            .from('Eventos')
            .select('*')
            .eq('notificado', false);

        if (error) {
            console.error('Error al consultar eventos en Supabase:', error);
            return;
        }

        if (!eventos || eventos.length === 0) return;

        for (const evento of eventos) {
            const fechaEvento = new Date(evento.fecha_hora);
            const diferenciaMinutos = (fechaEvento - ahora) / (1000 * 60);

            // Si faltan entre 28 y 30 minutos para el evento...
            if (diferenciaMinutos <= 30 && diferenciaMinutos > 0) {
                
                let canalId = null;
                let nombreJuegoTexto = '';

                if (evento.Juego === 'aion_2') {
                    canalId = CANAL_AION_2;
                    nombreJuegoTexto = '⚡ **[AION 2]**';
                } else if (evento.Juego === 'throne_and_liberty') {
                    canalId = CANAL_THRONE;
                    nombreJuegoTexto = '⚔️ **[THRONE AND LIBERTY]**';
                }

              if (canalId) {
                    const canal = await client.channels.fetch(canalId).catch(() => null);
                    if (canal) {
                        const horaStr = fechaEvento.toLocaleTimeString('es-CL', {
                            timeZone: 'America/Santiago',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                        });

                        // Mensaje fijo indicando que faltan 30 minutos exactos
                        await canal.send(
                            `@everyone ${nombreJuegoTexto} ¡Atención! El evento **${evento.Nombre}** comienza a las **${horaStr} hrs** (En aproximadamente 30 minutos). ¡A alistarse! 🔥`
                        );

                        // Marcamos el evento como notificado en Supabase para que no se repita
                        await dbClient
                            .from('Eventos')
                            .update({ notificado: true })
                            .eq('id', evento.id);

                        console.log(`📢 Alerta enviada para: ${evento.Nombre} (${evento.Juego})`);
                    }
                }
            }
        }
    } catch (err) {
        console.error('Error en el ciclo de verificación de eventos:', err);
    }
}

console.log("Token largo:", process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.length : "NO EXISTE");