const { Client, GatewayIntentBits } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const dbClient = createClient(supabaseUrl, supabaseKey);

// Configuración de Discord
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Listas de canales de Discord por cada juego
const CANALES_AION_2 = [
    '123456789012345678', // Reemplaza o asegúrate de tener tus IDs reales aquí
    '876543210987654321'  // Segundo canal de Aion 2
];

const CANALES_THRONE = [
    '123456789012345678', // Reemplaza o asegúrate de tener tus IDs reales aquí
    '9876543210987654321'  // Segundo canal de Throne and Liberty
];

client.once('ready', () => {
    console.log(`🤖 Bot encendido y listo como ${client.user.tag}`);

    // Intervalo de revisión cada 60 segundos
    setInterval(verificarEventos, 60000);
});

async function verificarEventos() {
    try {
        const ahora = new Date();
        
        const { data: eventos, error } = await dbClient
            .from('Eventos')
            .select('*')
            .eq('notificado', false);

        if (error) {
            console.error('Error al consultar eventos en Supabase:', error);
            return;
        }

        if (!eventos || eventos.length === 0) {
            console.log('🔍 No hay eventos pendientes con notificado = false.');
            return;
        }

        console.log(`📋 Eventos pendientes encontrados en Supabase: ${eventos.length}`);

        for (const evento of eventos) {
            const fechaEvento = new Date(evento.fecha_hora);
            const diferenciaMinutos = (fechaEvento - ahora) / (1000 * 60);

            console.log(`⏱️ Evento: "${evento.Nombre}" (${evento.Juego}) | Diferencia: ${diferenciaMinutos.toFixed(2)} mins`);

            if (diferenciaMinutos <= 35 && diferenciaMinutos > 0) {
                let listaCanales = [];
                let nombreJuegoTexto = '';

                if (evento.Juego === 'aion_2') {
                    listaCanales = CANALES_AION_2;
                    nombreJuegoTexto = '⚡ **[AION 2]**';
                } else if (evento.Juego === 'throne_and_liberty') {
                    listaCanales = CANALES_THRONE;
                    nombreJuegoTexto = '⚔️ **[THRONE AND LIBERTY]**';
                }

                if (listaCanales.length > 0) {
                    const horaStr = fechaEvento.toLocaleTimeString('es-CL', {
                        timeZone: 'America/Santiago',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    });

                    const mensaje = `@everyone ${nombreJuegoTexto} ¡Atención! El evento **${evento.Nombre}** comienza a las **${horaStr} hrs** (En aproximadamente 30 minutos). ¡A alistarse! 🔥`;

                    // Envío en paralelo a todos los canales configurados
                    const promesasEnvio = listaCanales.map(async (canalId) => {
                        const canal = await client.channels.fetch(canalId).catch(() => null);
                        if (canal) {
                            return canal.send(mensaje);
                        }
                    });

                    await Promise.all(promesasEnvio);

                    // Marcamos el evento como notificado en Supabase
                    await dbClient
                        .from('Eventos')
                        .update({ notificado: true })
                        .eq('id', evento.id);

                    console.log(`📢 Alertas enviadas con éxito para: ${evento.Nombre} (${evento.Juego})`);
                } else {
                    console.log(`⚠️ El juego "${evento.Juego}" no tiene canales configurados.`);
                }
            }
        }
    } catch (err) {
        console.error('Error en el ciclo de verificación de eventos:', err);
    }
}

client.login(process.env.DISCORD_TOKEN);